import { activateStudentBoundCode } from "./activation-service.js";
import { ensurePrimaryStudentProfile } from "./student-profile-service.js";
/**
 * Tahouri License API — Cloudflare Workers + D1.
 *
 * Implemented: health, admin session/login/logout and lockout, student-bound
 * code management, activation with signed entitlements, student/installation-
 * bound license status, public-key delivery, license revocation, and audit views.
 *
 * Not yet production-ready: isolated-D1 end-to-end concurrency/failure tests,
 * payment gateway verification, durable metrics/alerts, and entitlement renewal.
 * Keep Production activation disabled until the remaining validation is complete.
 */
const SERVICE_VERSION = "0.3.0-worker-student-bound-activation";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const COOKIE_NAME = "tahouri_admin_session";
const PRODUCT_ID = "tahouri-edu";
const MAX_BODY_BYTES = 64 * 1024;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      ...extraHeaders,
    },
  });
}
function error(message, status = 400, headers = {}) { return json({ ok: false, message }, status, headers); }
function nowIso() { return new Date().toISOString(); }
function cookieHeader(value, maxAge) {
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${maxAge}`;
}
function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  const requestOrigin = new URL(request.url).origin;
  const allowed = [requestOrigin, env.ADMIN_ORIGIN, env.APP_ORIGIN].filter(Boolean);
  return origin && allowed.includes(origin) ? origin : null;
}
function corsHeaders(request, env) {
  const origin = allowedOrigin(request, env);
  return origin ? { "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true", "vary": "Origin" } : {};
}
function parseCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
}
async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i % (x.length || 1)] || 0) ^ (y[i % (y.length || 1)] || 0);
  return diff === 0;
}
function randomHex(bytes = 16) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return [...data].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function bodyJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw Object.assign(new Error("حجم درخواست بیش از حد مجاز است."), { status: 413 });
  try { return text ? JSON.parse(text) : {}; }
  catch { throw Object.assign(new Error("JSON درخواست معتبر نیست."), { status: 400 }); }
}
function bounded(value, max, field) {
  const text = String(value ?? "").trim();
  if (!text || text.length > max) throw Object.assign(new Error(field + " معتبر نیست."), { status: 400 });
  return text;
}
function validIdentifier(value, field) {
  const text = bounded(value, 128, field);
  if (!/^[A-Za-z0-9._:-]+$/.test(text)) throw Object.assign(new Error(field + " دارای نویسه نامعتبر است."), { status: 400 });
  return text;
}
function iranianYear(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran", year: "numeric", month: "numeric"
  }).formatToParts(date);
  const p = Object.fromEntries(parts.filter(x => x.type !== "literal").map(x => [x.type, Number(x.value)]));
  return p.month >= 7 ? p.year : p.year - 1;
}
function preview(code) { return code.slice(0, 7) + "…" + code.slice(-6); }
function makeCode(grade, year) {
  return "THR-" + grade.replace(/[^a-z0-9]/gi, "").toUpperCase() + "-" + year + "-" + randomHex(12).toUpperCase();
}
async function audit(env, eventType, actor, values = {}) {
  await env.DB.prepare(`INSERT INTO audit_log
    (event_type, actor, license_id, code_hash, created_at, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(eventType, actor, values.licenseId || null, values.codeHash || null,
      nowIso(), JSON.stringify(values.metadata || {})).run();
}
async function requireAdmin(request, env) {
  const id = parseCookie(request, COOKIE_NAME);
  if (!id) return false;
  const hash = await sha256(id);
  const row = await env.DB.prepare(
    "SELECT expires_at FROM admin_sessions WHERE session_hash = ?"
  ).bind(hash).first();
  if (!row || Number(row.expires_at) <= Date.now()) {
    if (row) await env.DB.prepare("DELETE FROM admin_sessions WHERE session_hash = ?").bind(hash).run();
    return false;
  }
  return true;
}
async function login(request, env, headers) {
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16) {
    return json({ ok: false, message: "رمز مدیریت در تنظیمات امن Worker تعریف نشده است." }, 503, headers);
  }
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigin(request, env)) return json({ ok: false, message: "مبدأ درخواست مجاز نیست." }, 403, headers);
  const ipHash = await sha256(request.headers.get("CF-Connecting-IP") || "unknown");
  const prior = await env.DB.prepare("SELECT attempts, window_started_at, locked_until FROM admin_login_attempts WHERE ip_hash = ?").bind(ipHash).first();
  if (Number(prior?.locked_until || 0) > Date.now()) {
    return json({ ok: false, message: "ورود موقتاً قفل شده است. بعداً دوباره تلاش کنید." }, 429, headers);
  }
  const body = await bodyJson(request);
  const suppliedHash = await sha256(String(body.password || ""));
  const expectedHash = await sha256(env.ADMIN_PASSWORD);
  if (!constantTimeEqual(suppliedHash, expectedHash)) {
    await env.DB.prepare(`INSERT INTO admin_login_attempts (ip_hash, attempts, window_started_at, locked_until)
      VALUES (?, 1, ?, 0)
      ON CONFLICT(ip_hash) DO UPDATE SET
        attempts = CASE WHEN excluded.window_started_at - admin_login_attempts.window_started_at >= 60000
          THEN 1 ELSE admin_login_attempts.attempts + 1 END,
        window_started_at = CASE WHEN excluded.window_started_at - admin_login_attempts.window_started_at >= 60000
          THEN excluded.window_started_at ELSE admin_login_attempts.window_started_at END,
        locked_until = CASE WHEN admin_login_attempts.attempts + 1 >= 5
          AND excluded.window_started_at - admin_login_attempts.window_started_at < 60000
          THEN excluded.window_started_at + 900000 ELSE admin_login_attempts.locked_until END`)
      .bind(ipHash, Date.now()).run();
    const state = await env.DB.prepare("SELECT attempts, locked_until FROM admin_login_attempts WHERE ip_hash = ?").bind(ipHash).first();
    await audit(env, "admin.login.failed", "security", { metadata: { ipHash: ipHash.slice(0, 16), attempts: state?.attempts || 1 } });
    return json({ ok: false, message: Number(state?.locked_until || 0) > Date.now()
      ? "ورود موقتاً قفل شده است. بعداً دوباره تلاش کنید." : "رمز مدیریت نادرست است." },
      Number(state?.locked_until || 0) > Date.now() ? 429 : 401, headers);
  }
  const id = randomHex(32);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await env.DB.prepare("INSERT INTO admin_sessions (session_hash, expires_at, created_at) VALUES (?, ?, ?)")
    .bind(await sha256(id), expiresAt, nowIso()).run();
  const successIpHash = await sha256(request.headers.get("CF-Connecting-IP") || "unknown");
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE ip_hash = ?").bind(successIpHash).run();
  await audit(env, "admin.login.success", "admin");
  return json({ ok: true }, 200, { ...headers, "set-cookie": cookieHeader(id, SESSION_TTL_MS / 1000) });
}
async function listRows(env, sql, ...values) {
  const result = await env.DB.prepare(sql).bind(...values).all();
  return result.results || [];
}
async function adminRoute(request, env, url, headers) {
  const path = url.pathname;
  if (path === "/api/admin/login" && request.method === "POST") return login(request, env, headers);
  if (path === "/api/admin/logout" && request.method === "POST") {
    const id = parseCookie(request, COOKIE_NAME);
    if (id) await env.DB.prepare("DELETE FROM admin_sessions WHERE session_hash = ?").bind(await sha256(id)).run();
    return json({ ok: true }, 200, { ...headers, "set-cookie": cookieHeader("", 0) });
  }
  if (path === "/api/admin/session" && request.method === "GET") {
    return await requireAdmin(request, env) ? json({ ok: true }, 200, headers) : json({ ok: false }, 401, headers);
  }
  if (!await requireAdmin(request, env)) return json({ ok: false, message: "نشست مدیر معتبر نیست." }, 401, headers);

  if (path === "/api/metrics" && request.method === "GET") {
    return json({ ok: true, metrics: { requests: 0, activations: 0, activationFailures: 0,
      licenseRevocations: 0, responses5xx: 0, note: "آمار لحظه‌ای درخواست‌ها در این نسخه نگهداری نمی‌شود." } }, 200, headers);
  }
  if (path === "/api/metrics/alerts" && request.method === "GET") return json({ ok: true, alerts: [] }, 200, headers);
  if (path === "/api/admin/students" && request.method === "GET") {
    const students = await listRows(env, `SELECT student_id AS studentId, full_name AS fullName,
      grade_id AS gradeId, status, created_at AS createdAt, updated_at AS updatedAt
      FROM student_accounts ORDER BY created_at DESC LIMIT 1000`);
    return json({ ok: true, students }, 200, headers);
  }
  if (path === "/api/admin/students" && request.method === "POST") {
    const body = await bodyJson(request);
    const fullName = bounded(body.fullName, 160, "نام دانش‌آموز");
    const gradeId = validIdentifier(body.gradeId, "gradeId");
    if (!/^grade[1-6]$/.test(gradeId)) return error("پایهٔ دانش‌آموز معتبر نیست.", 400, headers);
    const studentId = "stu_" + randomHex(16);
    const createdAt = nowIso();
    const results = await env.DB.batch([
      env.DB.prepare(`INSERT INTO student_accounts
        (student_id, full_name, grade_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?)`)
        .bind(studentId, fullName, gradeId, createdAt, createdAt),
      env.DB.prepare(`INSERT INTO audit_log
        (event_type, actor, license_id, code_hash, created_at, metadata_json)
        VALUES ('student.created', 'admin', NULL, NULL, ?, ?)`)
        .bind(createdAt, JSON.stringify({ studentId, gradeId }))
    ]);
    if (!results?.[0]?.meta?.changes || !results?.[1]?.meta?.changes)
      return error("ثبت حساب دانش‌آموز انجام نشد.", 500, headers);
    return json({ ok: true, student: { studentId, fullName, gradeId, status: "active", createdAt } }, 201, headers);
  }
  if (path === "/api/admin/students/profile" && request.method === "POST") {
    const body = await bodyJson(request);
    let profile;
    try {
      profile = await ensurePrimaryStudentProfile(env, body.studentId);
    } catch (cause) {
      return error(cause.message || "ساخت پروفایل انجام نشد.", cause.status || 500, headers);
    }
    return json({ ok: true, profile }, profile.created ? 201 : 200, headers);
  }
  if (path === "/api/admin/students/archive" && request.method === "POST") {
    const body = await bodyJson(request);
    const studentId = validIdentifier(body.studentId, "studentId");
    const updatedAt = nowIso();
    const results = await env.DB.batch([
      env.DB.prepare(`INSERT INTO audit_log
        (event_type, actor, license_id, code_hash, created_at, metadata_json)
        SELECT 'student.archived', 'admin', NULL, NULL, ?, ?
        WHERE EXISTS (SELECT 1 FROM student_accounts WHERE student_id = ? AND status = 'active')`)
        .bind(updatedAt, JSON.stringify({ studentId }), studentId),
      env.DB.prepare("UPDATE student_accounts SET status = 'archived', updated_at = ? WHERE student_id = ? AND status = 'active'")
        .bind(updatedAt, studentId),
      env.DB.prepare("UPDATE activation_codes SET status = 'revoked' WHERE student_id = ? AND status = 'active' AND used_at IS NULL")
        .bind(studentId)
    ]);
    if (!results?.[0]?.meta?.changes || !results?.[1]?.meta?.changes)
      return error("حساب فعال دانش‌آموز پیدا نشد.", 404, headers);
    return json({ ok: true }, 200, headers);
  }
  if (path === "/api/admin/codes" && request.method === "GET") {
    const codes = await listRows(env, `SELECT code_preview AS codePreview, product_id AS productId, student_id AS studentId,
      grade_id AS gradeId, academic_year AS academicYear, renewal_mode AS renewalMode, status,
      created_at AS createdAt, used_at AS usedAt, license_id AS licenseId
      FROM activation_codes ORDER BY created_at DESC LIMIT 500`);
    return json({ ok: true, codes }, 200, headers);
  }
  if (path === "/api/admin/codes" && request.method === "POST") {
    const body = await bodyJson(request);
    const gradeId = validIdentifier(body.gradeId, "gradeId");
    const studentId = validIdentifier(body.studentId, "studentId");
    const academicYear = String(body.academicYear || iranianYear()).trim();
    const renewalMode = String(body.renewalMode || "promotion").toLowerCase();
    const currentYear = iranianYear();
    if (!/^[0-9]{4}$/.test(academicYear) || Number(academicYear) < currentYear || Number(academicYear) > currentYear + 1)
      return error("سال تحصیلی باید سال جاری یا سال تحصیلی بعد باشد.", 400, headers);
    if (!["promotion", "repeat"].includes(renewalMode)) return error("نوع رزرو معتبر نیست.", 400, headers);
    if (Number(academicYear) === currentYear && renewalMode === "repeat")
      return error("کد تکرار پایه فقط برای سال تحصیلی بعد قابل ساخت است.", 400, headers);
    const student = await env.DB.prepare("SELECT student_id FROM student_accounts WHERE student_id = ? AND grade_id = ? AND status = 'active'")
      .bind(studentId, gradeId).first();
    if (!student) return error("ابتدا حساب فعال دانش‌آموز را ثبت کنید و پایهٔ آن را مطابق انتخاب کنید.", 409, headers);
    const code = makeCode(gradeId, academicYear);
    const codeHash = await sha256(code.toUpperCase());
    const createdAt = nowIso();
    const results = await env.DB.batch([
      env.DB.prepare(`INSERT INTO activation_codes
        (code_hash, code_preview, product_id, student_id, grade_id, academic_year, renewal_mode, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`)
        .bind(codeHash, preview(code), PRODUCT_ID, studentId, gradeId, academicYear, renewalMode, createdAt),
      env.DB.prepare(`INSERT INTO audit_log
        (event_type, actor, license_id, code_hash, created_at, metadata_json)
        VALUES ('codes.created', 'admin', NULL, ?, ?, ?)`)
        .bind(codeHash, createdAt, JSON.stringify({ gradeId, studentId, academicYear, renewalMode }))
    ]);
    if (!results?.[0]?.meta?.changes || !results?.[1]?.meta?.changes)
      return error("ثبت کد و گزارش عملیات کامل نشد.", 500, headers);
    return json({ ok: true, codes: [code], studentId }, 201, headers);
  }
  if (path === "/api/admin/codes/revoke" && request.method === "POST") {
    const body = await bodyJson(request);
    const code = bounded(body.code, 256, "code").toUpperCase();
    const codeHash = await sha256(code);
    const revokedAt = nowIso();
    const results = await env.DB.batch([
      env.DB.prepare(`INSERT INTO audit_log
        (event_type, actor, license_id, code_hash, created_at, metadata_json)
        SELECT 'code.revoked', 'admin', NULL, ?, ?, '{}'
        WHERE EXISTS (SELECT 1 FROM activation_codes
          WHERE code_hash = ? AND status = 'active' AND used_at IS NULL)`)
        .bind(codeHash, revokedAt, codeHash),
      env.DB.prepare(`UPDATE activation_codes SET status = 'revoked'
        WHERE code_hash = ? AND status = 'active' AND used_at IS NULL`).bind(codeHash)
    ]);
    if (!results?.[0]?.meta?.changes || !results?.[1]?.meta?.changes)
      return error("کد فعال و قابل لغو پیدا نشد.", 404, headers);
    return json({ ok: true }, 200, headers);
  }
  if (path === "/api/admin/licenses" && request.method === "GET") {
    const licenses = await listRows(env, `SELECT license_id AS licenseId, product_id AS productId,
      student_id AS studentId, grade_id AS gradeId, academic_year AS academicYear,
      valid_from AS validFrom, valid_until AS validUntil, installation_binding AS installationBinding,
      status, created_at AS createdAt, revoked_at AS revokedAt FROM licenses
      ORDER BY created_at DESC LIMIT 500`);
    const now = Date.now();
    for (const item of licenses) {
      if (item.status === "revoked") continue;
      const from = Date.parse(item.validFrom), until = Date.parse(item.validUntil);
      item.status = Number.isFinite(from) && from > now ? "future" :
        Number.isFinite(until) && until <= now ? "expired" : item.status;
    }
    return json({ ok: true, licenses }, 200, headers);
  }
  if (path === "/api/admin/licenses/revoke" && request.method === "POST") {
    const body = await bodyJson(request);
    const licenseId = validIdentifier(body.licenseId, "licenseId");
    const revokedAt = nowIso();
    const results = await env.DB.batch([
      env.DB.prepare(`INSERT INTO audit_log
        (event_type, actor, license_id, code_hash, created_at, metadata_json)
        SELECT 'license.revoked', 'admin', ?, NULL, ?, '{}'
        WHERE EXISTS (SELECT 1 FROM licenses
          WHERE license_id = ? AND status IN ('active', 'future'))`)
        .bind(licenseId, revokedAt, licenseId),
      env.DB.prepare(`UPDATE licenses SET status = 'revoked', revoked_at = ?
        WHERE license_id = ? AND status IN ('active', 'future')`).bind(revokedAt, licenseId)
    ]);
    if (!results?.[0]?.meta?.changes || !results?.[1]?.meta?.changes)
      return error("مجوز فعال یا رزروشده پیدا نشد.", 404, headers);
    return json({ ok: true }, 200, headers);
  }
  if (path === "/api/admin/licenses/extend" && request.method === "POST") {
    return error("تمدید تا زمان انتقال و آزمون امضای امن مجوز غیرفعال است.", 501, headers);
  }
  if (path === "/api/admin/payments" && request.method === "GET") {
    const payments = await listRows(env, `SELECT payment_id AS paymentId, provider, authority, status,
      amount, currency, product_id AS productId, grade_id AS gradeId, academic_year AS academicYear,
      license_id AS licenseId, created_at AS createdAt, verified_at AS verifiedAt
      FROM payments ORDER BY created_at DESC LIMIT 500`);
    return json({ ok: true, payments }, 200, headers);
  }
  if (path === "/api/admin/audit" && request.method === "GET") {
    const rows = await listRows(env, `SELECT id, event_type AS eventType, actor,
      license_id AS licenseId, created_at AS createdAt, metadata_json AS metadata
      FROM audit_log ORDER BY id DESC LIMIT 500`);
    return json({ ok: true, audit: rows.map(row => ({ ...row, metadata: parseMetadata(row.metadata) })) }, 200, headers);
  }
  if (path === "/api/admin/search" && request.method === "GET") {
    const q = (url.searchParams.get("q") || "").trim();
    if (!q) return error("عبارت جستجو الزامی است.", 400, headers);
    const like = "%" + q.replace(/[%_]/g, "") + "%";
    const licenses = await listRows(env, `SELECT license_id AS licenseId, student_id AS studentId,
      grade_id AS gradeId, academic_year AS academicYear, valid_from AS validFrom,
      valid_until AS validUntil, status, created_at AS createdAt FROM licenses
      WHERE license_id = ? OR student_id = ? OR grade_id = ? OR LOWER(license_id) LIKE LOWER(?)
      OR LOWER(student_id) LIKE LOWER(?) OR LOWER(grade_id) LIKE LOWER(?) ORDER BY created_at DESC LIMIT 100`,
      q, q, q, like, like, like);
    const codes = await listRows(env, `SELECT code_preview AS codePreview, student_id AS studentId, grade_id AS gradeId,
      academic_year AS academicYear, status, created_at AS createdAt, used_at AS usedAt,
      license_id AS licenseId FROM activation_codes
      WHERE code_preview LIKE ? OR grade_id LIKE ? OR student_id LIKE ?
      ORDER BY created_at DESC LIMIT 100`, like, like, like);
    return json({ ok: true, licenses, codes }, 200, headers);
  }
  if (path === "/api/health" && request.method === "GET") {
    return health(env, headers, requestId);
  }
  return json({ ok: false, error: "not_implemented", message: "این مسیر هنوز پیاده‌سازی نشده است." }, 501, headers);
}
function parseMetadata(value) {
  try { return JSON.parse(value || "{}"); } catch { return {}; }
}
async function health(env, headers, requestId) {
  let database = "unavailable", schemaVersion = null;
  try {
    const result = await env.DB.prepare("SELECT MAX(version) AS version FROM schema_migrations").first();
    schemaVersion = result?.version ?? null;
    database = schemaVersion === null ? "connected_schema_missing" : "connected";
  } catch { database = "unavailable_or_unmigrated"; }
  const ready = database === "connected";
  return json({ ok: ready, status: ready ? "healthy" : "not_ready",
    service: "tahouri-license-api", version: SERVICE_VERSION, runtime: "cloudflare-workers",
    database, schemaVersion, capabilities: { adminApi: true, codeManagement: true,
      licenseActivation: Number(schemaVersion) >= 3 && Boolean(env.LICENSE_SIGNING_PRIVATE_KEY_PEM), licenseVerification: false, paymentVerification: false,
      studentBoundCodeIssuance: Number(schemaVersion) >= 3,
      signedEntitlementExtension: false }, requestId }, ready ? 200 : 503,
    { ...headers, "x-request-id": requestId });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const headers = corsHeaders(request, env);

    try {
      if (url.pathname.startsWith("/api/") && request.method === "OPTIONS") {
        if (!allowedOrigin(request, env)) return new Response(null, { status: 403 });
        return new Response(null, { status: 204, headers: { ...headers,
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "Content-Type",
          "access-control-max-age": "600" } });
      }
      if (url.pathname === "/api/health" && request.method === "GET")
        return await health(env, headers, requestId);
      if (url.pathname === "/api/licenses/status" && request.method === "GET") {
        const licenseId = validIdentifier(url.searchParams.get("licenseId"), "licenseId");
        const studentId = validIdentifier(url.searchParams.get("studentId"), "studentId");
        const installationId = validIdentifier(url.searchParams.get("installationId"), "installationId");
        const license = await env.DB.prepare(`SELECT status, student_id AS studentId,
          installation_binding AS installationBinding, valid_from AS validFrom,
          valid_until AS validUntil FROM licenses
          WHERE license_id = ? AND product_id = ? LIMIT 1`)
          .bind(licenseId, PRODUCT_ID).first();
        if (!license || license.studentId !== studentId ||
            license.installationBinding !== installationId) {
          return json({ valid: false, reason: "not_found" }, 200, headers);
        }
        if (license.status === "revoked") return json({ valid: false, status: "revoked", reason: "revoked" }, 200, headers);
        const from = Date.parse(license.validFrom), until = Date.parse(license.validUntil);
        if (!Number.isFinite(from) || !Number.isFinite(until))
          return json({ valid: false, reason: "invalid_period" }, 200, headers);
        if (Date.now() < from || license.status === "future")
          return json({ valid: false, status: "future", reason: "not_yet_valid" }, 200, headers);
        if (Date.now() >= until || license.status === "expired")
          return json({ valid: false, status: "expired", reason: "expired" }, 200, headers);
        if (license.status !== "active")
          return json({ valid: false, status: license.status, reason: "inactive" }, 200, headers);
        return json({ valid: true, status: "active", validUntil: license.validUntil }, 200, headers);
      }
      if (url.pathname === "/api/public-key" && request.method === "GET") {
        if (!env.LICENSE_SIGNING_PUBLIC_KEY_PEM)
          return json({ ok: false, message: "کلید عمومی اعتبارسنجی در Worker تنظیم نشده است." }, 503, headers);
        return json({ ok: true, publicKeyPem: env.LICENSE_SIGNING_PUBLIC_KEY_PEM }, 200, headers);
      }
      if (url.pathname === "/api/activate" && request.method === "POST") {
        if (!env.LICENSE_SIGNING_PRIVATE_KEY_PEM)
          return json({ ok: false, message: "کلید امضای مجوز در Worker تنظیم نشده است." }, 503, headers);
        const schema = await env.DB.prepare("SELECT MAX(version) AS version FROM schema_migrations").first();
        if (Number(schema?.version || 0) < 3)
          return json({ ok: false, message: "ساختار پایگاه داده برای فعال‌سازی آماده نیست." }, 503, headers);
        const body = await bodyJson(request);
        const result = await activateStudentBoundCode(env, body);
        return json(result, 200, headers);
      }
      if (url.pathname.startsWith("/api/admin/") || url.pathname === "/api/metrics" || url.pathname === "/api/metrics/alerts")
        return await adminRoute(request, env, url, headers);
      if (url.pathname.startsWith("/api/"))
        return json({ ok: false, error: "not_implemented",
          message: "این مسیر هنوز برای محیط Cloudflare پیاده‌سازی نشده است.", requestId }, 501, headers);
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response("Tahouri License API Worker", { status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" } });
    } catch (e) {
      const status = Number(e?.status) || 500;
      return json({ ok: false, message: status >= 500 ? "خطای داخلی سرویس." : e.message,
        requestId }, status, { ...headers, "x-request-id": requestId });
    }
  }
};
