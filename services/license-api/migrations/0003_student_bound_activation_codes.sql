-- Bind newly issued activation codes to one existing student profile.
-- Existing rows remain NULL for backward-compatible administration only.
-- The future activation endpoint MUST reject NULL student_id codes.
ALTER TABLE activation_codes ADD COLUMN student_id TEXT;

CREATE INDEX IF NOT EXISTS idx_code_student_status
ON activation_codes(student_id, status);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
