import { signEntitlementClaims } from "./entitlement-crypto.js";

const PRODUCT_ID = "tahouri-edu";
const DAY_MS = 86400000;

function fail(status, message) {
  return Object.assign(new Error(message), { status });
}
function identifier(value, field) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(text)) {
    throw fail(400, field + " معتبر نیست.");
  }
  return text;
}
function iranianParts(date) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran", year: "numeric", month: "numeric", day: "numeric"
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
}
function currentAcademicYear(now = new Date()) {
  const p = iranianParts(now);
  return p.month >= 7 ? p.year : p.year - 1;
}
function persianDateUtc(year, month, day) {
  const start = Date.UTC(year + 621, 2, 1);
  const end = Date.UTC(year + 621, 8, 30);
  const target = year * 10000 + month * 100 + day;
  for (let t = start; t <= end; t += DAY_MS) {
    const p = iranianParts(new Date(t));
    if (p.year * 10000 + p.month * 100 + p.day === target) return new Date(t);
  }
  throw fail(500, "تبدیل تاریخ تحصیلی انجام نشد.");
}
function academicPeriod(year) {
  const start = new Date(persianDateUtc(year, 7, 1).getTime() - 12600000);
  const next = new Date(persianDateUtc(year + 1, 7, 1).getTime() - 12600000);
  return { academicYear: String(year), validFrom: start.toISOString(),
    validUntil: new Date(next.getTime() - 1).toISOString() };
}
function gradeLevel(value) {
  const m = String(value || "").match(/^(?:grade)?(\d+)$/i);
  return m ? Number(m[1]) : null;
}
function randomId() { return "lic_" + crypto.randomUUID(); }

export async function activateStudentBoundCode(env, body) {
  const code = String(body.code || "").trim().toUpperCase();
  if (!code || code.length > 256) throw fail(400, "کد فعال‌سازی معتبر نیست.");
  const gradeId = identifier(body.gradeId, "gradeId");
  const studentId = identifier(body.studentId, "studentId");
  const installationId = identifier(body.installationId, "installationId");
  const renewalMode = String(body.renewalMode || "promotion").trim().toLowerCase();
  if (!["promotion", "repeat"].includes(renewalMode)) throw fail(400, "نوع تمدید معتبر نیست.");

  const codeHash = await (async value => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
  })(code);
  const record = await env.DB.prepare(`SELECT student_id AS studentId, grade_id AS gradeId,
    academic_year AS academicYear, renewal_mode AS renewalMode, status, used_at AS usedAt,
    product_id AS productId FROM activation_codes WHERE code_hash = ?`).bind(codeHash).first();

  if (!record || record.productId !== PRODUCT_ID || !record.studentId ||
      record.studentId !== studentId) throw fail(400, "کد فعال‌سازی برای این پروفایل معتبر نیست.");
  if (record.gradeId !== gradeId) throw fail(400, "این کد مربوط به پایه انتخاب‌شده نیست.");
  if (record.status !== "active" || record.usedAt) throw fail(409, "این کد قبلاً استفاده شده یا غیرفعال است.");

  const targetYear = Number(record.academicYear);
  const currentYear = currentAcademicYear();
  if (!Number.isInteger(targetYear) || targetYear < currentYear || targetYear > currentYear + 1)
    throw fail(400, "سال تحصیلی کد مجاز نیست.");
  const future = targetYear > currentYear;
  if (future && record.renewalMode !== renewalMode)
    throw fail(409, "نوع رزرو با نوع کد مطابقت ندارد.");

  if (future) {
    const now = new Date().toISOString();
    const current = await env.DB.prepare(`SELECT grade_id AS gradeId FROM licenses
      WHERE product_id = ? AND student_id = ? AND status = 'active'
      AND valid_from <= ? AND valid_until > ? ORDER BY valid_until DESC LIMIT 1`)
      .bind(PRODUCT_ID, studentId, now, now).first();
    if (!current) throw fail(409, "رزرو سال بعد به مجوز فعال فعلی نیاز دارد.");
    const from = gradeLevel(current.gradeId), to = gradeLevel(gradeId);
    if (from === null || to === null ||
        (renewalMode === "promotion" && to !== from + 1) ||
        (renewalMode === "repeat" && to !== from))
      throw fail(409, "پایه مقصد با نوع رزرو سازگار نیست.");
    const existing = await env.DB.prepare(`SELECT license_id FROM licenses
      WHERE product_id = ? AND student_id = ? AND grade_id = ?
      AND academic_year = ? AND status = 'future' LIMIT 1`)
      .bind(PRODUCT_ID, studentId, gradeId, String(targetYear)).first();
    if (existing) throw fail(409, "برای این پروفایل و سال تحصیلی قبلاً رزرو ثبت شده است.");
  }

  if (!env.LICENSE_SIGNING_PRIVATE_KEY_PEM)
    throw fail(503, "کلید امضای مجوز در Worker تنظیم نشده است.");

  const period = academicPeriod(targetYear);
  const licenseId = randomId();
  const claims = {
    licenseId, productId: PRODUCT_ID, academicYear: period.academicYear,
    gradeScope: gradeId, studentId, validFrom: period.validFrom,
    validUntil: period.validUntil, installationBinding: installationId,
    entitlementVersion: 1
  };
  const signature = await signEntitlementClaims(env.LICENSE_SIGNING_PRIVATE_KEY_PEM, claims);
  const entitlement = { claims, signature, algorithm: "RSASSA-PKCS1-v1_5-SHA256" };
  const now = new Date().toISOString();
  const status = future ? "future" : "active";

  // D1 batch is transactional. Each later write is conditional on the exact
  // student-bound code having been atomically claimed by the first statement.
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE activation_codes SET status = 'used', used_at = ?, license_id = ?
      WHERE code_hash = ? AND student_id = ? AND product_id = ?
      AND status = 'active' AND used_at IS NULL AND license_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM licenses WHERE product_id = ? AND student_id = ?
          AND grade_id = ? AND academic_year = ? AND status IN ('active', 'future')
      )`)
      .bind(now, licenseId, codeHash, studentId, PRODUCT_ID,
        PRODUCT_ID, studentId, gradeId, period.academicYear),
    env.DB.prepare(`INSERT INTO licenses
      (license_id, code_hash, product_id, student_id, grade_id, academic_year,
       valid_from, valid_until, installation_binding, status, entitlement_json, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM activation_codes WHERE code_hash = ?
        AND student_id = ? AND status = 'used' AND license_id = ?)`)
      .bind(licenseId, codeHash, PRODUCT_ID, studentId, gradeId, period.academicYear,
        period.validFrom, period.validUntil, installationId, status,
        JSON.stringify(entitlement), now, codeHash, studentId, licenseId),
    env.DB.prepare(`INSERT INTO audit_log
      (event_type, actor, license_id, code_hash, created_at, metadata_json)
      SELECT ?, 'client', ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM licenses WHERE license_id = ? AND student_id = ?)`)
      .bind(future ? "license.renewal_reserved" : "license.activated",
        licenseId, codeHash, now, JSON.stringify({ gradeId, studentId,
          academicYear: period.academicYear, validFrom: period.validFrom }),
        licenseId, studentId)
  ]);
  if (!results?.[0]?.meta?.changes || !results?.[1]?.meta?.changes || !results?.[2]?.meta?.changes)
    throw fail(409, "کد قبلاً مصرف شده یا امکان ثبت مجوز وجود ندارد.");

  return { valid: true, renewalStored: future, entitlement };
}
