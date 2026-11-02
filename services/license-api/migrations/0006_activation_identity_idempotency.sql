-- Migration 0006: explicit profile ownership and activation idempotency.
-- Existing licenses remain valid; profile_id is nullable for legacy records.
-- New activation code must populate profile_id and write an idempotency record
-- in the same D1 batch as code consumption, license creation, and audit logging.

ALTER TABLE licenses ADD COLUMN profile_id TEXT
  REFERENCES student_profiles(profile_id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_license_profile_grade_year
  ON licenses(profile_id, grade_id, academic_year, status);

CREATE TABLE IF NOT EXISTS activation_requests (
  idempotency_key TEXT PRIMARY KEY,
  request_fingerprint TEXT NOT NULL,
  account_id TEXT NOT NULL
    REFERENCES student_accounts(student_id) ON DELETE RESTRICT,
  profile_id TEXT NOT NULL
    REFERENCES student_profiles(profile_id) ON DELETE RESTRICT,
  installation_id TEXT NOT NULL,
  license_id TEXT NOT NULL UNIQUE
    REFERENCES licenses(license_id) ON DELETE RESTRICT,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activation_requests_account_created
  ON activation_requests(account_id, created_at);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (6, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
