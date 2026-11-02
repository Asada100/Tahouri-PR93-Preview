function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

function validStudentId(value) {
  const studentId = String(value ?? "").trim();
  if (!studentId || studentId.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(studentId)) {
    throw fail(400, "شناسهٔ حساب دانش‌آموز معتبر نیست.");
  }
  return studentId;
}

export async function ensurePrimaryStudentProfile(env, value) {
  const studentId = validStudentId(value);
  const account = await env.DB.prepare(
    "SELECT student_id AS studentId FROM student_accounts WHERE student_id = ? AND status = 'active'"
  ).bind(studentId).first();
  if (!account) throw fail(409, "حساب فعال دانش‌آموز پیدا نشد.");

  const existing = await env.DB.prepare(
    "SELECT profile_id AS profileId FROM student_profiles WHERE account_id = ? AND status = 'active' AND is_primary = 1"
  ).bind(studentId).first();
  if (existing?.profileId) {
    return { profileId: existing.profileId, accountId: studentId, created: false };
  }

  const profileId = "prof_" + crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const results = await env.DB.batch([
    env.DB.prepare(`INSERT INTO student_profiles
      (profile_id, account_id, status, is_primary, revision, created_at, updated_at, archived_at)
      SELECT ?, student_id, 'active', 1, 1, ?, ?, NULL
      FROM student_accounts
      WHERE student_id = ? AND status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM student_profiles
          WHERE account_id = ? AND status = 'active' AND is_primary = 1
        )`)
      .bind(profileId, createdAt, createdAt, studentId, studentId),
    env.DB.prepare(`INSERT INTO audit_log
      (event_type, actor, license_id, code_hash, created_at, metadata_json)
      SELECT 'student.profile.created', 'admin', NULL, NULL, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM student_profiles
        WHERE profile_id = ? AND account_id = ? AND status = 'active' AND is_primary = 1
      )`)
      .bind(createdAt, JSON.stringify({ studentId, profileId }), profileId, studentId)
  ]);

  if (results?.[0]?.meta?.changes && results?.[1]?.meta?.changes) {
    return { profileId, accountId: studentId, created: true };
  }

  const raced = await env.DB.prepare(
    "SELECT profile_id AS profileId FROM student_profiles WHERE account_id = ? AND status = 'active' AND is_primary = 1"
  ).bind(studentId).first();
  if (raced?.profileId) {
    return { profileId: raced.profileId, accountId: studentId, created: false };
  }
  throw fail(409, "ساخت پروفایل اصلی انجام نشد؛ وضعیت حساب را دوباره بررسی کنید.");
}
