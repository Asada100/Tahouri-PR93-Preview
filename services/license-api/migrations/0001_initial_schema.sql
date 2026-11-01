-- Tahouri License API: Cloudflare D1 initial schema.
-- Apply with: npx wrangler d1 migrations apply tahouri-license-db --remote

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activation_codes (
    code_hash TEXT PRIMARY KEY,
    code_preview TEXT NOT NULL,
    product_id TEXT NOT NULL,
    grade_id TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    renewal_mode TEXT NOT NULL DEFAULT 'promotion',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    used_at TEXT,
    license_id TEXT
);

CREATE TABLE IF NOT EXISTS licenses (
    license_id TEXT PRIMARY KEY,
    code_hash TEXT,
    product_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    grade_id TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    valid_from TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    installation_binding TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    entitlement_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    license_id TEXT,
    code_hash TEXT,
    created_at TEXT NOT NULL,
    metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    session_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    authority TEXT,
    status TEXT NOT NULL,
    amount INTEGER,
    currency TEXT,
    product_id TEXT NOT NULL,
    grade_id TEXT,
    academic_year TEXT,
    license_id TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    verified_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_license_student_grade ON licenses(student_id, grade_id);
CREATE INDEX IF NOT EXISTS idx_license_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_code_status ON activation_codes(status);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
