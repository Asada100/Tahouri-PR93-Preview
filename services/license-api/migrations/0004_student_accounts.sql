-- Registry of student accounts managed by the admin panel.
-- student_id is generated once and becomes the stable profile/license identity.
CREATE TABLE IF NOT EXISTS student_accounts (
  student_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  grade_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_student_accounts_grade_status
ON student_accounts(grade_id, status);
INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (4, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
