-- Add a stable profile registry without rewriting any existing student,
-- activation-code, license, or audit rows.
-- account_id references the existing central student account identity.
-- Multiple profiles may belong to one account, but only one active profile
-- may be marked primary. This leaves room for future shared-device workflows
-- without conflating profile_id and account_id.
CREATE TABLE IF NOT EXISTS student_profiles (
  profile_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES student_accounts(student_id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  is_primary INTEGER NOT NULL DEFAULT 1
    CHECK (is_primary IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1
    CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  CHECK (
    (status = 'active' AND archived_at IS NULL) OR
    (status = 'archived' AND archived_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_account_status
ON student_profiles(account_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_one_active_primary
ON student_profiles(account_id)
WHERE status = 'active' AND is_primary = 1;

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
