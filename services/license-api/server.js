// =====================================
// Tahouri License API
// TEST / DEVELOPMENT ONLY
// Version 2.0
// =====================================

"use strict";

const SERVICE_VERSION = String(process.env.TAHOURI_SERVICE_VERSION || "1.0.0").trim() || "unknown";
const BUILD_ID = String(process.env.TAHOURI_BUILD_ID || process.env.GIT_COMMIT_SHA || "unknown").trim() || "unknown";
const SERVICE_ENVIRONMENT = String(process.env.NODE_ENV || "development").trim() || "development";

const INSTANCE_ID = String(
    process.env.TAHOURI_INSTANCE_ID ||
    require("node:os").hostname()
).trim() || "unknown";

const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const paymentProvider = require("./payment-provider");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const PRODUCT_ID = "tahouri-edu";
const ENTITLEMENT_VERSION = 1;
const NODE_ENV = String(process.env.NODE_ENV || "development").toLowerCase();
const IS_PRODUCTION = NODE_ENV === "production";
const ADMIN_KEY = String(process.env.TAHOURI_ADMIN_KEY || (IS_PRODUCTION ? "" : "TAHOURI-ADMIN-TEST"));
const ADMIN_PASSWORD = String(process.env.TAHOURI_ADMIN_PASSWORD || ADMIN_KEY);
const ADMIN_SESSIONS = new Map();
const ADMIN_LOGIN_FAILURES = new Map();
const ADMIN_LOCK_MS = 15 * 60 * 1000;
const ADMIN_MAX_FAILURES = 5;
const ADMIN_LOGIN_RATE_LIMIT = 10;
const adminLoginRateBuckets = new Map();
const ACTIVATION_RATE_LIMIT = 10;
const activationRateBuckets = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_COOKIE_NAME = "tahouri_admin_session";
const PAYMENT_PROVIDER = String(process.env.TAHOURI_PAYMENT_PROVIDER || "manual");
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = process.env.TAHOURI_TEST_MODE === "true" ? 1000 : 30;
const rateBuckets = new Map();

function createRequestId() {
    return crypto.randomBytes(12).toString("hex");
}

function safeLog(level, message, meta = {}) {
    const blocked = /password|token|secret|authority|private.?key|api.?key|merchant|cookie|authorization|code_hash/i;
    const sanitized = {};
    for (const [key, value] of Object.entries(meta || {})) {
        if (blocked.test(key)) {
            sanitized[key] = "[REDACTED]";
        } else if (typeof value === "string" && blocked.test(value)) {
            sanitized[key] = "[REDACTED]";
        } else {
            sanitized[key] = value;
        }
    }

    const output = Object.keys(sanitized).length
        ? message + " " + JSON.stringify(sanitized)
        : message;

    if (level === "error") console.error(output);
    else if (level === "warn") console.warn(output);
    else console.log(output);
}

const METRICS = {
    startedAt: new Date().toISOString(),
    requests: 0,
    responses4xx: 0,
    responses5xx: 0,
    activations: 0,
    activationFailures: 0,
    paymentCreations: 0,
    paymentFailures: 0,
    paymentVerifications: 0,
    paymentVerificationFailures: 0,
    adminLoginFailures: 0,
    licenseRevocations: 0,
    suspiciousAttempts: 0,
    securityRateLimitBlocks: 0,
    unauthorizedAdminAttempts: 0,
    invalidActivationAttempts: 0,
    backupNote: "Use scheduled external backup monitoring."
};

function recordMetric(name, amount = 1) {
    if (Object.prototype.hasOwnProperty.call(METRICS, name)) {
        METRICS[name] += amount;
    }
}

function operationalHealthStatus() {
    const alerts = evaluateOperationalAlerts();
    const critical = alerts.filter((item) => item.severity === "critical");
    if (critical.length > 0) {
        return { status: "critical", reasons: critical.map((item) => item.code), alerts };
    }
    if (alerts.length > 0) {
        return { status: "degraded", reasons: alerts.map((item) => item.code), alerts };
    }
    return { status: "healthy", reasons: [], alerts: [] };
}

function evaluateOperationalAlerts() {
    const alerts = [];
    if (METRICS.responses5xx >= 10) {
        alerts.push({ code: "high_5xx", severity: "critical", message: "تعداد پاسخ‌های 5xx از آستانه عبور کرده است." });
    }
    if (METRICS.activationFailures >= 20) {
        alerts.push({ code: "activation_failures", severity: "warning", message: "تعداد خطاهای فعال‌سازی غیرعادی افزایش یافته است." });
    }
    if (METRICS.paymentFailures >= 10) {
        alerts.push({ code: "payment_failures", severity: "critical", message: "تعداد خطاهای ایجاد پرداخت از آستانه عبور کرده است." });
    }
    if (METRICS.paymentVerificationFailures >= 10) {
        alerts.push({ code: "payment_verification_failures", severity: "critical", message: "تعداد خطاهای تأیید پرداخت از آستانه عبور کرده است." });
    }
    if (METRICS.adminLoginFailures >= 10) {
        alerts.push({ code: "admin_login_failures", severity: "warning", message: "تعداد تلاش‌های ناموفق ورود مدیر افزایش یافته است." });
    }
    if (METRICS.suspiciousAttempts >= 20) {
        alerts.push({ code: "suspicious_attempts", severity: "warning", message: "تعداد تلاش‌های مشکوک از آستانه پایش عبور کرده است." });
    }
    return alerts;
}

function auditOperationalAlerts(alerts) {
    if (!Array.isArray(alerts) || alerts.length === 0) return;
    for (const alert of alerts) {
        const eventKey = "operational.alert." + alert.code;
        const recent = db.prepare(
            "SELECT id FROM audit_log WHERE event_type = ? AND created_at >= datetime('now', '-10 minutes') LIMIT 1"
        ).get(eventKey);
        if (!recent) {
            audit(eventKey, "system", {
                severity: alert.severity,
                message: alert.message
            });
        }
    }
}

function metricsSnapshot() {
    return {
        ...METRICS,
        instanceId: INSTANCE_ID,
        serviceVersion: SERVICE_VERSION,
        buildId: BUILD_ID,
        dbSchemaVersion: DB_SCHEMA_VERSION,
        environment: SERVICE_ENVIRONMENT,
        uptimeSeconds: Math.floor(process.uptime()),
        alerts: evaluateOperationalAlerts()
    };
}
const ADMIN_ORIGIN = String(process.env.TAHOURI_ADMIN_ORIGIN || (IS_PRODUCTION ? "" : "http://localhost:5500"));
const APP_ORIGIN = String(process.env.TAHOURI_APP_ORIGIN || (IS_PRODUCTION ? "" : "http://localhost:5500"));
const DEV_LOOPBACK_ORIGINS = IS_PRODUCTION ? [] : ["http://127.0.0.1:5500", "https://asada100.github.io"];
const COOKIE_SECURE = IS_PRODUCTION ? "; Secure" : "";

if (IS_PRODUCTION && !process.env.TAHOURI_ADMIN_ORIGIN) {
    throw new Error("TAHOURI_ADMIN_ORIGIN is required in production.");
}

if (IS_PRODUCTION && !process.env.TAHOURI_APP_ORIGIN) {
    throw new Error("TAHOURI_APP_ORIGIN is required in production.");
}

if (IS_PRODUCTION && process.env.TAHOURI_LICENSE_PRIVATE_KEY_FILE) {
    const configuredKey = path.resolve(process.env.TAHOURI_LICENSE_PRIVATE_KEY_FILE);
    const projectRoot = path.resolve(__dirname, "..", "..");
    if (configuredKey === projectRoot ||
        configuredKey.startsWith(projectRoot + path.sep)) {
        throw new Error("Production signing private key must be stored outside the project directory.");
    }
}

if (IS_PRODUCTION) {
    if (!process.env.TAHOURI_ADMIN_PASSWORD) {
        throw new Error("TAHOURI_ADMIN_PASSWORD is required in production.");
    }
    if (!process.env.TAHOURI_LICENSE_PRIVATE_KEY_FILE) {
        throw new Error("TAHOURI_LICENSE_PRIVATE_KEY_FILE is required in production.");
    }
    if (String(process.env.TAHOURI_PAYMENT_PROVIDER || "manual") === "manual") {
        throw new Error("A real payment provider must be configured in production.");
    }
    if (process.env.TAHOURI_TEST_CODES === "true") {
        throw new Error("TAHOURI_TEST_CODES must not be enabled in production.");
    }
}



const privateKeyFile =
    process.env.TAHOURI_LICENSE_PRIVATE_KEY_FILE ||
    "./dev-private-key.pem";

const DATA_DIR =
    process.env.TAHOURI_LICENSE_DATA_DIR ||
    path.join(__dirname, "data");

const DB_SCHEMA_VERSION = 1;

const DATABASE_MIGRATIONS = [
    {
        version: 1,
        apply() {
            // Version 1 marks the initial persistent schema created by the
            // CREATE TABLE IF NOT EXISTS block above.
        }
    }
];

const DB_FILE =
    process.env.TAHOURI_LICENSE_DB_FILE ||
    path.join(DATA_DIR, "license.sqlite");

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

let privateKey;

try {
    privateKey = crypto.createPrivateKey(
        fs.readFileSync(privateKeyFile, "utf8")
    );
} catch (error) {
    safeLog("error", "Tahouri License API: private key unavailable.", { error: error.message });
    safeLog("error", "Set TAHOURI_LICENSE_PRIVATE_KEY_FILE to a development private key.");
    process.exit(1);
}

const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
        ON admin_sessions(expires_at);

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

    CREATE INDEX IF NOT EXISTS idx_license_student_grade
        ON licenses(student_id, grade_id);

    CREATE INDEX IF NOT EXISTS idx_license_status
        ON licenses(status);

    CREATE INDEX IF NOT EXISTS idx_code_status
        ON activation_codes(status);

    CREATE INDEX IF NOT EXISTS idx_audit_created
        ON audit_log(created_at);
`);

const activationCodeColumns = db.prepare("PRAGMA table_info(activation_codes)").all();
if (!activationCodeColumns.some((column) => column.name === "renewal_mode")) {
    db.exec("ALTER TABLE activation_codes ADD COLUMN renewal_mode TEXT NOT NULL DEFAULT 'promotion'");
}

function assertProductionConfiguration() {
    if (!IS_PRODUCTION) return;

    const required = [
        ["TAHOURI_ADMIN_PASSWORD", process.env.TAHOURI_ADMIN_PASSWORD],
        ["TAHOURI_ADMIN_ORIGIN", process.env.TAHOURI_ADMIN_ORIGIN],
        ["TAHOURI_APP_ORIGIN", process.env.TAHOURI_APP_ORIGIN],
        ["TAHOURI_LICENSE_PRIVATE_KEY_FILE", process.env.TAHOURI_LICENSE_PRIVATE_KEY_FILE],
        ["TAHOURI_PAYMENT_PROVIDER", process.env.TAHOURI_PAYMENT_PROVIDER]
    ];

    for (const [name, value] of required) {
        if (!value) throw new Error(name + " is required in production.");
    }

    if (String(process.env.TAHOURI_PAYMENT_PROVIDER).toLowerCase() === "manual") {
        throw new Error("TAHOURI_PAYMENT_PROVIDER cannot be manual in production.");
    }
}

assertProductionConfiguration();

function hashCode(code) {
    return crypto.createHash("sha256")
        .update(String(code).trim().toUpperCase(), "utf8")
        .digest("hex");
}

function makeCode(gradeId, academicYear) {
    const grade = String(gradeId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const random = crypto.randomBytes(12).toString("hex").toUpperCase();
    return `THR-${grade}-${academicYear}-${random}`;
}

function gradeLevel(gradeId) {
    const match = String(gradeId || "").match(/^(?:grade)?(\d+)$/i);
    return match ? Number(match[1]) : null;
}

function codePreview(code) {
    return code.slice(0, 7) + "…" + code.slice(-6);
}

function audit(eventType, actor, values = {}) {
    db.prepare(`
        INSERT INTO audit_log
            (event_type, actor, license_id, code_hash, created_at, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        eventType,
        actor,
        values.licenseId || null,
        values.codeHash || null,
        new Date().toISOString(),
        JSON.stringify(values.metadata || {})
    );
}

function isAllowedOrigin(origin) {
    if (!origin) return false;
    return origin === ADMIN_ORIGIN ||
        origin === APP_ORIGIN ||
        DEV_LOOPBACK_ORIGINS.includes(origin);
}

function corsOriginForRequest(req) {
    const origin = String(req.headers.origin || "");
    return isAllowedOrigin(origin) ? origin : ADMIN_ORIGIN;
}

function boundedString(value, max, field) {
    const text = String(value ?? "").trim();
    if (!text || text.length > max) {
        throw new Error(field + " is invalid.");
    }
    return text;
}

function validateIdentifier(value, field) {
    const text = boundedString(value, 128, field);
    if (!/^[A-Za-z0-9._:-]+$/.test(text)) {
        const error = new Error(field + " contains invalid characters.");
        error.statusCode = 400;
        throw error;
    }
    return text;
}

function send(res, status, payload) {
    const requestId = res.__requestId || createRequestId();
    res.setHeader("X-Request-Id", requestId);
    recordMetric("requests");
    if (status >= 400 && status < 500) recordMetric("responses4xx");
    if (status >= 500) recordMetric("responses5xx");
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
        "Access-Control-Allow-Origin": corsOriginForRequest(res.req || { headers: {} }),
        "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    res.end(JSON.stringify(payload));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => {
            data += chunk;
            if (data.length > 1024 * 64) {
                reject(new Error("Request too large."));
                req.destroy();
            }
        });
        req.on("end", () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch {
                reject(new Error("Invalid JSON."));
            }
        });
        req.on("error", reject);
    });
}

function signClaims(claims) {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(JSON.stringify(claims));
    signer.end();
    return signer.sign(privateKey).toString("base64");
}

function getIranianDateParts(date) {
    const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
        timeZone: "Asia/Tehran", year: "numeric", month: "numeric", day: "numeric"
    });
    const parts = Object.fromEntries(
        formatter.formatToParts(date)
            .filter(part => part.type !== "literal")
            .map(part => [part.type, Number(part.value)])
    );
    return { year: parts.year, month: parts.month, day: parts.day };
}

function findNext31Shahrivar(year) {
    const start = Date.UTC(year + 621, 8, 20);
    const end = Date.UTC(year + 621, 8, 25);
    for (let time = start; time <= end; time += 24 * 60 * 60 * 1000) {
        const date = new Date(time);
        const parts = getIranianDateParts(date);
        if (parts.year === year && parts.month === 6 && parts.day === 31) {
            return date;
        }
    }
    throw new Error("31 Shahrivar could not be resolved for academic year " + year);
}

function findPersianDateUtc(year, month, day) {
    const start = Date.UTC(Number(year) + 621, 2, 1);
    const end = Date.UTC(Number(year) + 621, 8, 30);
    const target = Number(year) * 10000 + Number(month) * 100 + Number(day);

    for (let time = start; time <= end; time += 24 * 60 * 60 * 1000) {
        const date = new Date(time);
        const parts = getIranianDateParts(date);
        const current = parts.year * 10000 + parts.month * 100 + parts.day;
        if (current === target) return date;
    }

    throw new Error("Persian date could not be resolved.");
}

function tehranMidnightFromPersianDate(year, month, day) {
    const utcDate = findPersianDateUtc(year, month, day);
    return new Date(utcDate.getTime() - (3 * 60 + 30) * 60 * 1000);
}

function academicPeriodForYear(academicYear) {
    const year = Number(academicYear);
    if (!Number.isInteger(year) || year < 1300 || year > 1600) {
        throw new Error("Invalid academic year.");
    }

    const validFrom = tehranMidnightFromPersianDate(year, 7, 1);
    const nextYearStart = tehranMidnightFromPersianDate(year + 1, 7, 1);
    const validUntil = new Date(nextYearStart.getTime() - 1);

    return {
        academicYear: String(year),
        validFrom: validFrom.toISOString(),
        validUntil: validUntil.toISOString()
    };
}

function currentAcademicYear() {
    const iran = getIranianDateParts(new Date());
    return iran.month >= 7 ? iran.year : iran.year - 1;
}

function academicPeriod() {
    return academicPeriodForYear(currentAcademicYear());
}

function getSessionId(req) {
    const cookie = String(req.headers.cookie || "");
    const match = cookie.match(/(?:^|;)\s*tahouri_admin_session=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}

function sessionHash(id) {
    return crypto.createHash("sha256").update(String(id)).digest("hex");
}

function adminAuthorized(req) {
    const sessionId = getSessionId(req);
    if (!sessionId) return false;

    const hash = sessionHash(sessionId);
    let session = ADMIN_SESSIONS.get(sessionId);

    if (!session) {
        const row = db.prepare(
            "SELECT expires_at FROM admin_sessions WHERE session_hash = ?"
        ).get(hash);
        if (!row) return false;
        session = { expiresAt: Number(row.expires_at) };
        ADMIN_SESSIONS.set(sessionId, session);
    }

    if (Date.now() > session.expiresAt) {
        ADMIN_SESSIONS.delete(sessionId);
        db.prepare("DELETE FROM admin_sessions WHERE session_hash = ?").run(hash);
        return false;
    }
    return true;
}

function parseCookies(req) {
    const header = String(req.headers.cookie || "");
    const cookies = {};
    for (const part of header.split(";")) {
        const index = part.indexOf("=");
        if (index < 0) continue;
        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (key) cookies[key] = decodeURIComponent(value);
    }
    return cookies;
}

function createAdminSession() {
    const id = crypto.randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + SESSION_TTL_MS;
    ADMIN_SESSIONS.set(id, { expiresAt });
    db.prepare(
        "INSERT INTO admin_sessions (session_hash, expires_at, created_at) VALUES (?, ?, ?)"
    ).run(sessionHash(id), expiresAt, new Date().toISOString());
    return id;
}

function clearAdminSession(req) {
    const id = getSessionId(req);
    if (!id) return;
    ADMIN_SESSIONS.delete(id);
    db.prepare("DELETE FROM admin_sessions WHERE session_hash = ?").run(sessionHash(id));
}

function adminLogin(req, res, body) {
    const loginAttempts = Number(body.loginAttempts || 0);

    if (!requestAllowedWithLimit(req, ADMIN_LOGIN_RATE_LIMIT, adminLoginRateBuckets)) {
        recordMetric("securityRateLimitBlocks");
        recordSuspiciousAttempt(req, "admin_login_rate_limited");
        return send(res, 429, { ok: false, message: "تعداد تلاش‌های ورود بیش از حد مجاز است." });
    }

    const clientIp = getClientIp(req);
    const now = Date.now();
    const failure = ADMIN_LOGIN_FAILURES.get(clientIp);
    if (failure && failure.lockedUntil > now) {
        recordMetric("securityRateLimitBlocks");
        recordSuspiciousAttempt(req, "admin_login_locked");
        return send(res, 429, { ok: false, message: "ورود موقتاً قفل شده است. بعداً دوباره تلاش کنید." });
    }

    const supplied = String(body.password || "");
    if (!supplied || supplied.length !== ADMIN_PASSWORD.length ||
        !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(ADMIN_PASSWORD))) {
        const next = failure || { count: 0, lockedUntil: 0 };
        next.count += 1;
        if (next.count >= ADMIN_MAX_FAILURES) {
            next.lockedUntil = now + ADMIN_LOCK_MS;
        }
        ADMIN_LOGIN_FAILURES.set(clientIp, next);
        recordMetric("adminLoginFailures");
        recordSuspiciousAttempt(req, "admin_login_failed", {
            failureCount: next.count,
            locked: next.lockedUntil > now
        });
        return send(res, 401, { ok: false, message: "رمز مدیریت نادرست است." });
    }

    ADMIN_LOGIN_FAILURES.delete(clientIp);
    const sessionId = createAdminSession();
    res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": "tahouri_admin_session=" + encodeURIComponent(sessionId) + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + Math.floor(SESSION_TTL_MS / 1000) + COOKIE_SECURE,
        "Access-Control-Allow-Origin": ADMIN_ORIGIN,
        "Access-Control-Allow-Credentials": "true"
    });
    res.end(JSON.stringify({ ok: true }));
}

function adminLogout(req, res) {
    clearAdminSession(req);
    res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": "tahouri_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" + COOKIE_SECURE,
        "Access-Control-Allow-Origin": ADMIN_ORIGIN,
        "Access-Control-Allow-Credentials": "true"
    });
    res.end(JSON.stringify({ ok: true }));
}

function cleanupAdminSessions() {
    const now = Date.now();
    for (const [sessionId, session] of ADMIN_SESSIONS) {
        if (!session || session.expiresAt <= now) ADMIN_SESSIONS.delete(sessionId);
    }
    db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").run(now);
}

setInterval(cleanupAdminSessions, 10 * 60 * 1000).unref();

function getClientIp(req) {
    if (IS_PRODUCTION) {
        const forwarded = String(req.headers["x-forwarded-for"] || "").trim();
        if (forwarded) return forwarded.split(",")[0].trim();
    }
    return String(req.socket.remoteAddress || "unknown");
}

function recordSuspiciousAttempt(req, category, metadata = {}) {
    recordMetric("suspiciousAttempts");
    const safeMetadata = {
        category,
        requestId: req.__requestId || null,
        method: req.method || null,
        path: String(req.url || "").split("?")[0],
        ipHash: crypto.createHash("sha256")
            .update(getClientIp(req), "utf8")
            .digest("hex")
            .slice(0, 16),
        ...metadata
    };
    audit("security.suspicious_attempt", "security", {
        metadata: safeMetadata
    });
}

function requestAllowedWithLimit(req, limit, bucketMap) {
    const ip = getClientIp(req);
    const now = Date.now();
    const current = bucketMap.get(ip);

    if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
        bucketMap.set(ip, { startedAt: now, count: 1 });
        return true;
    }

    current.count += 1;
    return current.count <= limit;
}

function requestAllowed(req) {
    const ip = getClientIp(req);
    const now = Date.now();
    const current = rateBuckets.get(ip);

    if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
        rateBuckets.set(ip, { startedAt: now, count: 1 });
        return true;
    }

    current.count += 1;
    return current.count <= RATE_LIMIT;
}

function cleanRateBuckets() {
    const cutoff = Date.now() - RATE_WINDOW_MS;
    for (const buckets of [rateBuckets, adminLoginRateBuckets, activationRateBuckets]) {
        for (const [ip, bucket] of buckets) {
            if (bucket.startedAt < cutoff) buckets.delete(ip);
        }
    }
}

setInterval(cleanRateBuckets, RATE_WINDOW_MS).unref();

function requireAdmin(req, res) {
    if (!adminAuthorized(req)) {
        recordMetric("unauthorizedAdminAttempts");
        recordSuspiciousAttempt(req, "admin_unauthorized");
        send(res, 401, { ok: false, message: "دسترسی مدیریت مجاز نیست." });
        return false;
    }
    return true;
}

function createEntitlement({ licenseId, gradeId, studentId, installationId, academicYear, validFrom, validUntil }) {
    const claims = {
        licenseId,
        productId: PRODUCT_ID,
        academicYear: String(academicYear),
        gradeScope: gradeId,
        studentId,
        validFrom,
        validUntil,
        installationBinding: installationId,
        entitlementVersion: ENTITLEMENT_VERSION
    };

    return {
        claims,
        signature: signClaims(claims),
        algorithm: "RSASSA-PKCS1-v1_5-SHA256"
    };
}

function seedTestCodes() {
    const codes = [
        ["GRADE1-1405-TEST", "grade1"],
        ["GRADE2-1405-TEST", "grade2"],
        ["GRADE3-1405-TEST", "grade3"],
        ["GRADE4-1405-TEST", "grade4"],
        ["GRADE5-1405-TEST", "grade5"],
        ["GRADE6-1405-TEST", "grade6"],
        ["GRADE6-1405-TEST-A", "grade6"],
        ["GRADE6-1405-TEST-B", "grade6"],
        ["GRADE6-1405-TEST-C", "grade6"]
    ];

    const statement = db.prepare(`
        INSERT OR IGNORE INTO activation_codes
            (code_hash, code_preview, product_id, grade_id, academic_year, status, created_at)
        VALUES (?, ?, ?, ?, '1405', 'active', ?)
    `);

    const now = new Date().toISOString();

    for (const [code, gradeId] of codes) {
        statement.run(hashCode(code), codePreview(code), PRODUCT_ID, gradeId, now);
    }
}

if (!IS_PRODUCTION && process.env.TAHOURI_TEST_CODES !== "false") {
    seedTestCodes();
}

async function activate(req, res) {
    const body = await readBody(req);
    const code = String(body.code || "").trim().toUpperCase();
    const gradeId = validateIdentifier(body.gradeId, "gradeId");
    const installationId = validateIdentifier(body.installationId, "installationId");
    const studentId = validateIdentifier(body.studentId, "studentId");
    const renewalMode = String(body.renewalMode || "promotion").trim().toLowerCase();

    if (!code || !gradeId || !studentId || !installationId) {
        recordMetric("activationFailures");
        return send(res, 400, { valid: false, message: "اطلاعات فعال‌سازی کامل نیست." });
    }

    const codeHash = hashCode(code);
    const codeRecord = db.prepare(`
        SELECT code_hash AS codeHash, grade_id AS gradeId,
               academic_year AS academicYear,
               renewal_mode AS renewalMode,
               status, used_at AS usedAt
        FROM activation_codes
        WHERE code_hash = ?
    `).get(codeHash);

    if (!codeRecord) {
        recordMetric("activationFailures");
        recordMetric("invalidActivationAttempts");
        recordSuspiciousAttempt(req, "activation_invalid_code", { gradeId });
        return send(res, 400, { valid: false, message: "کد فعال‌سازی معتبر نیست." });
    }

    if (codeRecord.gradeId !== gradeId) {
        recordMetric("activationFailures");
        recordMetric("invalidActivationAttempts");
        recordSuspiciousAttempt(req, "activation_grade_mismatch", {
            requestedGradeId: gradeId
        });
        return send(res, 400, { valid: false, message: "این کد مربوط به پایه انتخاب‌شده نیست." });
    }

    const requestedAcademicYear = Number(codeRecord.academicYear);
    const activeAcademicYear = currentAcademicYear();
    if (!Number.isInteger(requestedAcademicYear) ||
        requestedAcademicYear < activeAcademicYear ||
        requestedAcademicYear > activeAcademicYear + 1) {
        recordMetric("activationFailures");
        return send(res, 400, {
            valid: false,
            message: "این کد مربوط به سال تحصیلی مجاز فعلی یا سال تحصیلی بعد است."
        });
    }

    if (codeRecord.status !== "active" || codeRecord.usedAt) {
        recordMetric("activationFailures");
        recordMetric("invalidActivationAttempts");
        recordSuspiciousAttempt(req, "activation_reused_or_disabled_code", {
            gradeId: codeRecord.gradeId
        });
        return send(res, 409, { valid: false, message: "این کد قبلاً استفاده شده یا غیرفعال است." });
    }

    const period = academicPeriodForYear(requestedAcademicYear);
    const isFutureRenewal = requestedAcademicYear > activeAcademicYear;

    if (isFutureRenewal && codeRecord.renewalMode !== renewalMode) {
        recordMetric("activationFailures");
        return send(res, 409, {
            valid: false,
            message: renewalMode === "repeat"
                ? "این کد برای رزرو پایه تکراری صادر نشده است."
                : "این کد برای انتقال به پایه بعدی صادر نشده است."
        });
    }

    if (isFutureRenewal) {
        const nowIso = new Date().toISOString();
        const currentLicense = db.prepare(`
            SELECT license_id AS licenseId, grade_id AS gradeId
            FROM licenses
            WHERE product_id = ?
              AND student_id = ?
              AND status = 'active'
              AND valid_from <= ?
              AND valid_until > ?
            ORDER BY valid_until DESC
            LIMIT 1
        `).get(PRODUCT_ID, studentId, nowIso, nowIso);

        if (!currentLicense) {
            recordMetric("activationFailures");
            return send(res, 409, {
                valid: false,
                message: "رزرو سال بعد فقط برای پروفایلی که مجوز فعال فعلی دارد مجاز است."
            });
        }

        const currentLevel = gradeLevel(currentLicense.gradeId);
        const targetLevel = gradeLevel(gradeId);

        if (currentLevel === null || targetLevel === null) {
            recordMetric("activationFailures");
            return send(res, 409, {
                valid: false,
                message: "پایه فعلی یا پایه مقصد برای رزرو سال بعد قابل تشخیص نیست."
            });
        }

        if (renewalMode === "promotion") {
            if (targetLevel !== currentLevel + 1) {
                recordMetric("activationFailures");
                return send(res, 409, {
                    valid: false,
                    message: "رزرو سال بعد باید برای پایه تحصیلی بعدی انجام شود."
                });
            }
        } else if (renewalMode === "repeat") {
            if (targetLevel !== currentLevel) {
                recordMetric("activationFailures");
                return send(res, 409, {
                    valid: false,
                    message: "تکرار پایه فقط برای همان پایه فعلی مجاز است."
                });
            }
        } else {
            recordMetric("activationFailures");
            return send(res, 400, {
                valid: false,
                message: "نوع رزرو سال بعد معتبر نیست."
            });
        }

        const existingFuture = db.prepare(`
            SELECT license_id AS licenseId
            FROM licenses
            WHERE product_id = ?
              AND student_id = ?
              AND grade_id = ?
              AND academic_year = ?
              AND status = 'future'
            LIMIT 1
        `).get(PRODUCT_ID, studentId, gradeId, String(requestedAcademicYear));

        if (existingFuture) {
            recordMetric("activationFailures");
            return send(res, 409, {
                valid: false,
                message: "برای این پروفایل و سال تحصیلی، رزرو قبلاً ثبت شده است."
            });
        }
    }

    const licenseId = "lic_" + crypto.randomUUID();
    const entitlement = createEntitlement({
        licenseId,
        gradeId,
        studentId,
        installationId,
        academicYear: period.academicYear,
        validFrom: period.validFrom,
        validUntil: period.validUntil
    });

    db.exec("BEGIN IMMEDIATE");
    try {
        const current = db.prepare(
            "SELECT status, used_at AS usedAt FROM activation_codes WHERE code_hash = ?"
        ).get(codeHash);

        if (!current || current.status !== "active" || current.usedAt) {
            db.exec("ROLLBACK");
            return send(res, 409, { valid: false, message: "این کد قبلاً استفاده شده است." });
        }

        const now = new Date().toISOString();

        db.prepare(`
            INSERT INTO licenses (
                license_id, code_hash, product_id, student_id, grade_id,
                academic_year, valid_from, valid_until, installation_binding,
                status, entitlement_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            licenseId,
            codeHash,
            PRODUCT_ID,
            studentId,
            gradeId,
            period.academicYear,
            period.validFrom,
            period.validUntil,
            installationId,
            isFutureRenewal ? "future" : "active",
            JSON.stringify(entitlement),
            now
        );

        db.prepare(`
            UPDATE activation_codes
            SET status = 'used', used_at = ?, license_id = ?
            WHERE code_hash = ? AND status = 'active' AND used_at IS NULL
        `).run(now, licenseId, codeHash);

        audit(
            isFutureRenewal ? "license.renewal_reserved" : "license.activated",
            "client",
            {
                licenseId,
                codeHash,
                metadata: {
                    gradeId,
                    studentId,
                    academicYear: period.academicYear,
                    validFrom: period.validFrom
                }
            }
        );

        db.exec("COMMIT");
    } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
    }

    recordMetric("activations");
    return send(res, 200, {
        valid: true,
        renewalStored: isFutureRenewal,
        entitlement
    });
}

function getActiveLicense(licenseId) {
    const license = db.prepare(
        "SELECT * FROM licenses WHERE license_id = ?"
    ).get(licenseId);

    if (!license) return { valid: false, reason: "not_found" };
    if (license.status === "revoked") return { valid: false, reason: "revoked" };

    const validFrom = Date.parse(license.validFrom || license.valid_from);
    const validUntil = Date.parse(license.validUntil || license.valid_until);

    if (!Number.isFinite(validFrom) || !Number.isFinite(validUntil)) {
        return { valid: false, reason: "invalid_dates" };
    }

    if (validFrom > Date.now()) {
        return { valid: false, reason: "future" };
    }

    if (license.status === "future") {
        db.prepare("UPDATE licenses SET status = 'active' WHERE license_id = ? AND status = 'future'")
            .run(licenseId);
        license.status = "active";
    }

    if (license.status !== "active") return { valid: false, reason: license.status };

    if (validUntil <= Date.now()) {
        return { valid: false, reason: "expired" };
    }

    return { valid: true, license };
}

async function licenseStatus(req, res) {
    const url = new URL(req.url, "http://localhost");
    const licenseId = String(url.searchParams.get("licenseId") || "").trim();
    if (!licenseId) return send(res, 400, { ok: false, valid: false, message: "licenseId الزامی است." });

    try {
        validateIdentifier(licenseId, "licenseId");
    } catch (error) {
        return send(res, error.statusCode || 400, {
            ok: false,
            valid: false,
            message: error.message
        });
    }

    const result = getActiveLicense(licenseId);
    if (!result.valid) {
        return send(res, 200, { ok: true, valid: false, reason: result.reason });
    }

    return send(res, 200, {
        ok: true,
        valid: true,
        license: {
            licenseId: result.license.license_id,
            studentId: result.license.student_id,
            gradeId: result.license.grade_id,
            academicYear: result.license.academic_year,
            validFrom: result.license.valid_from,
            validUntil: result.license.valid_until,
            status: result.license.status
        }
    });
}

async function adminCreateCodes(req, res) {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const gradeId = validateIdentifier(body.gradeId, "gradeId");
    const academicYear = String(body.academicYear || academicPeriod().academicYear).trim();
    const renewalMode = String(body.renewalMode || "promotion").trim().toLowerCase();
    if (!["promotion", "repeat"].includes(renewalMode)) {
        return send(res, 400, { ok: false, message: "نوع کد رزرو معتبر نیست." });
    }
    const targetYear = Number(academicYear);
    const activeYear = currentAcademicYear();
    if (!/^\d{4}$/.test(academicYear) ||
        !Number.isInteger(targetYear) ||
        targetYear < activeYear ||
        targetYear > activeYear + 1) {
        return send(res, 400, {
            ok: false,
            message: "سال تحصیلی باید سال جاری یا سال تحصیلی بعد باشد."
        });
    }
    if (targetYear === activeYear && renewalMode === "repeat") {
        return send(res, 400, { ok: false, message: "کد تکرار پایه فقط برای سال تحصیلی بعد قابل ساخت است." });
    }

    const count = Math.min(Math.max(Number(body.count || 1), 1), 100);

    if (!gradeId) {
        return send(res, 400, { ok: false, message: "gradeId الزامی است." });
    }

    const created = [];
    const now = new Date().toISOString();
    const insert = db.prepare(`
        INSERT INTO activation_codes
            (code_hash, code_preview, product_id, grade_id, academic_year, renewal_mode, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
    `);

    db.exec("BEGIN IMMEDIATE");
    try {
        for (let i = 0; i < count; i++) {
            const code = makeCode(gradeId, academicYear);
            insert.run(hashCode(code), codePreview(code), PRODUCT_ID, gradeId, academicYear, renewalMode, now);
            created.push(code);
        }
        audit("codes.created", "admin", {
            metadata: { gradeId, academicYear, renewalMode, count }
        });
        db.exec("COMMIT");
    } catch (error) {
        try { db.exec("ROLLBACK"); } catch {}
        throw error;
    }

    return send(res, 201, { ok: true, codes: created });
}

async function adminListCodes(req, res) {
    if (!requireAdmin(req, res)) return;
    const rows = db.prepare(`
        SELECT code_preview AS codePreview, product_id AS productId,
               grade_id AS gradeId, academic_year AS academicYear,
               renewal_mode AS renewalMode,
               status, created_at AS createdAt, used_at AS usedAt,
               license_id AS licenseId
        FROM activation_codes
        ORDER BY created_at DESC
        LIMIT 500
    `).all();
    return send(res, 200, { ok: true, codes: rows });
}

async function adminRevokeCode(req, res) {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const code = String(body.code || "").trim().toUpperCase();
    if (!code) return send(res, 400, { ok: false, message: "کد الزامی است." });

    const codeHash = hashCode(code);
    const result = db.prepare(`
        UPDATE activation_codes
        SET status = 'revoked'
        WHERE code_hash = ? AND status = 'active' AND used_at IS NULL
    `).run(codeHash);

    if (!result.changes) {
        return send(res, 404, { ok: false, message: "کد فعال و قابل لغو پیدا نشد." });
    }

    audit("code.revoked", "admin", { codeHash });
    return send(res, 200, { ok: true });
}

async function adminDiagnostics(req, res) {
    if (!requireAdmin(req, res)) return;
    const activationCodes = db.prepare("SELECT COUNT(*) AS count FROM activation_codes").get();
    const licenses = db.prepare("SELECT COUNT(*) AS count FROM licenses").get();
    const activeLicenses = db.prepare("SELECT COUNT(*) AS count FROM licenses WHERE status = 'active'").get();
    return send(res, 200, {
        ok: true,
        database: {
            file: DB_FILE,
            activationCodes: Number(activationCodes.count || 0),
            licenses: Number(licenses.count || 0),
            activeLicenses: Number(activeLicenses.count || 0)
        },
        instance: {
            instanceId: INSTANCE_ID,
            processId: process.pid,
            serviceVersion: SERVICE_VERSION,
            buildId: BUILD_ID
        }
    });
}

function adminListLicenses(req, res) {
    if (!requireAdmin(req, res)) return;
    const rows = db.prepare(`
        SELECT license_id AS licenseId, product_id AS productId,
               student_id AS studentId, grade_id AS gradeId,
               academic_year AS academicYear, valid_from AS validFrom,
               valid_until AS validUntil, installation_binding AS installationBinding,
               status, created_at AS createdAt, revoked_at AS revokedAt
        FROM licenses
        ORDER BY created_at DESC
        LIMIT 500
    `).all();
    const now = Date.now();
    for (const row of rows) {
        if (row.status === "revoked") continue;
        const from = Date.parse(row.validFrom);
        const until = Date.parse(row.validUntil);
        if (Number.isFinite(from) && from > now) row.status = "future";
        else if (Number.isFinite(until) && until <= now) row.status = "expired";
        else row.status = "active";
    }

    return send(res, 200, { ok: true, licenses: rows });
}

async function adminSearch(req, res) {
    if (!requireAdmin(req, res)) return;
    const url = new URL(req.url, "http://localhost");
    const q = String(url.searchParams.get("q") || "").trim();
    if (!q) return send(res, 400, { ok: false, message: "عبارت جستجو الزامی است." });

    const like = "%" + q.replace(/[%_]/g, "") + "%";
    const licenses = db.prepare(`
        SELECT license_id AS licenseId, student_id AS studentId, grade_id AS gradeId,
               academic_year AS academicYear, valid_from AS validFrom,
               valid_until AS validUntil, status, created_at AS createdAt
        FROM licenses
        WHERE license_id = ? OR student_id = ? OR grade_id = ?
           OR LOWER(license_id) LIKE LOWER(?)
           OR LOWER(student_id) LIKE LOWER(?)
           OR LOWER(grade_id) LIKE LOWER(?)
        ORDER BY created_at DESC LIMIT 100
    `).all(q, q, q, like, like, like);

    const codes = db.prepare(`
        SELECT code_preview AS codePreview, grade_id AS gradeId,
               academic_year AS academicYear, status, created_at AS createdAt,
               used_at AS usedAt, license_id AS licenseId
        FROM activation_codes
        WHERE code_preview LIKE ? OR grade_id LIKE ?
        ORDER BY created_at DESC LIMIT 100
    `).all(like, like);

    return send(res, 200, { ok: true, licenses, codes });
}

async function adminRevokeLicense(req, res) {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const licenseId = validateIdentifier(body.licenseId, "licenseId");

    const result = db.prepare(`
        UPDATE licenses
        SET status = 'revoked', revoked_at = ?
        WHERE license_id = ? AND status = 'active'
    `).run(new Date().toISOString(), licenseId);

    if (!result.changes) {
        return send(res, 404, { ok: false, message: "مجوز فعال پیدا نشد." });
    }

    audit("license.revoked", "admin", { licenseId, requestId: res.__requestId });
    return send(res, 200, { ok: true });
}

async function adminExtendLicense(req, res) {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const licenseId = validateIdentifier(body.licenseId, "licenseId");
    const validUntil = String(body.validUntil || "").trim();

    if (!licenseId || !validUntil || Number.isNaN(Date.parse(validUntil))) {
        return send(res, 400, { ok: false, message: "licenseId و تاریخ معتبر الزامی است." });
    }

    const license = db.prepare(
        "SELECT * FROM licenses WHERE license_id = ?"
    ).get(licenseId);

    if (!license || license.status === "revoked") {
        return send(res, 404, { ok: false, message: "مجوز قابل تمدید پیدا نشد." });
    }

    const entitlement = createEntitlement({
        licenseId,
        gradeId: license.grade_id,
        studentId: license.student_id,
        installationId: license.installation_binding,
        academicYear: license.academic_year,
        validFrom: license.valid_from,
        validUntil
    });

    db.prepare(`
        UPDATE licenses
        SET valid_until = ?, status = 'active', entitlement_json = ?
        WHERE license_id = ?
    `).run(validUntil, JSON.stringify(entitlement), licenseId);

    audit("license.extended", "admin", {
        licenseId,
        metadata: { validUntil }
    });

    return send(res, 200, { ok: true, entitlement });
}

async function adminAudit(req, res) {
    if (!requireAdmin(req, res)) return;
    const rows = db.prepare(`
        SELECT id, event_type AS eventType, actor,
               license_id AS licenseId, created_at AS createdAt,
               metadata_json AS metadata
        FROM audit_log
        ORDER BY id DESC
        LIMIT 500
    `).all();

    return send(res, 200, {
        ok: true,
        audit: rows.map(row => ({
            ...row,
            metadata: JSON.parse(row.metadata || "{}")
        }))
    });
}

async function paymentCreate(req, res) {
    const body = await readBody(req);
    const paymentId = "pay_" + crypto.randomUUID();
    const now = new Date().toISOString();
    const gradeId = validateIdentifier(body.gradeId, "gradeId");
    const academicYear = String(body.academicYear || academicPeriod().academicYear).trim();
    const amount = Number(body.amount || 0);

    if (!gradeId || !Number.isFinite(amount) || amount <= 0) {
        recordMetric("paymentFailures");
        return send(res, 400, { ok: false, message: "gradeId و مبلغ معتبر الزامی است." });
    }

    db.prepare(`
        INSERT INTO payments (
            payment_id, provider, authority, status, amount, currency,
            product_id, grade_id, academic_year, metadata_json, created_at
        ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
    `).run(
        paymentId, PAYMENT_PROVIDER, "", amount,
        String(body.currency || "IRR"), PRODUCT_ID, gradeId,
        academicYear, JSON.stringify(body.metadata || {}), now
    );

    let gateway;
    try {
        gateway = paymentProvider.createPaymentRequest({
            payment: {
                payment_id: paymentId,
                amount,
                currency: String(body.currency || "IRR"),
                product_id: PRODUCT_ID,
                grade_id: gradeId,
                academic_year: academicYear
            }
        });
    } catch (error) {
        db.prepare("DELETE FROM payments WHERE payment_id = ? AND status = 'pending'").run(paymentId);
        audit("payment.create.rejected", "server", {
            metadata: { paymentId, provider: PAYMENT_PROVIDER, reason: error.message }
        });
        return send(res, 503, {
            ok: false,
            message: "درگاه پرداخت برای ایجاد تراکنش آماده نیست."
        });
    }

    audit("payment.created", "client", {
        metadata: { paymentId, provider: PAYMENT_PROVIDER }
    });

    return send(res, 201, {
        ok: true,
        paymentId,
        provider: PAYMENT_PROVIDER,
        status: "pending",
        gateway,
        message: PAYMENT_PROVIDER === "manual"
            ? "پرداخت درگاه هنوز متصل نشده است."
            : "درخواست پرداخت ایجاد شد."
    });
}

async function paymentCallback(req, res) {
    const body = await readBody(req);
    const paymentId = String(body.paymentId || "").trim();
    const authority = String(body.authority || "").trim();
    const status = String(body.status || "").trim().toLowerCase();

    if (!paymentId || !authority) {
        recordMetric("paymentVerificationFailures");
        return send(res, 400, { ok: false, message: "paymentId و authority الزامی است." });
    }

    const payment = db.prepare("SELECT * FROM payments WHERE payment_id = ?").get(paymentId);
    if (!payment) { recordMetric("paymentVerificationFailures"); return send(res, 404, { ok: false, message: "پرداخت پیدا نشد." }); }
    if (payment.status !== "pending") {
        recordMetric("paymentVerificationFailures");
        return send(res, 409, { ok: false, message: "این پرداخت قبلاً تعیین تکلیف شده است." });
    }

    let verified = false;
    try {
        verified = paymentProvider.verifyServerSide({
            payment,
            authority,
            status,
            amount: payment.amount,
            currency: payment.currency
        });
    } catch (error) {
        audit("payment.callback.rejected", "gateway", {
            metadata: { paymentId, authority, reason: error.message }
        });
        recordMetric("paymentVerificationFailures");
        return send(res, 503, { ok: false, message: "درگاه پرداخت هنوز برای تأیید سمت سرور پیکربندی نشده است." });
    }
    db.prepare("UPDATE payments SET authority = ?, status = ?, verified_at = ? WHERE payment_id = ? AND status = 'pending'")
        .run(authority, verified ? "verified" : "failed", verified ? new Date().toISOString() : null, paymentId);

    audit(verified ? "payment.callback.verified" : "payment.callback.failed", "gateway", {
        metadata: { paymentId, authority }
    });

    recordMetric("paymentVerifications");
    if (!verified) recordMetric("paymentVerificationFailures");
    return send(res, 200, { ok: true, paymentId, status: verified ? "verified" : "failed" });
}

async function paymentStatus(req, res) {
    const url = new URL(req.url, "http://localhost");
    const paymentId = String(url.searchParams.get("paymentId") || "").trim();
    if (!paymentId) return send(res, 400, { ok: false, message: "paymentId الزامی است." });

    const row = db.prepare(`
        SELECT payment_id AS paymentId, provider, status, amount, currency,
               product_id AS productId, grade_id AS gradeId,
               academic_year AS academicYear, license_id AS licenseId,
               created_at AS createdAt, verified_at AS verifiedAt
        FROM payments WHERE payment_id = ?
    `).get(paymentId);

    if (!row) return send(res, 404, { ok: false, message: "پرداخت پیدا نشد." });
    return send(res, 200, { ok: true, payment: row });
}

async function adminCreatePayment(req, res) {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const paymentId = "pay_" + crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO payments (
            payment_id, provider, authority, status, amount, currency,
            product_id, grade_id, academic_year, metadata_json, created_at
        ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
    `).run(
        paymentId,
        String(body.provider || "manual"),
        String(body.authority || ""),
        Number(body.amount || 0),
        String(body.currency || "IRR"),
        PRODUCT_ID,
        String(body.gradeId || ""),
        String(body.academicYear || academicPeriod().academicYear),
        JSON.stringify(body.metadata || {}),
        now
    );

    audit("payment.created", "admin", { metadata: { paymentId } });
    return send(res, 201, { ok: true, paymentId, status: "pending" });
}

async function adminListPayments(req, res) {
    if (!requireAdmin(req, res)) return;
    const rows = db.prepare(`
        SELECT payment_id AS paymentId, provider, authority, status,
               amount, currency, product_id AS productId,
               grade_id AS gradeId, academic_year AS academicYear,
               license_id AS licenseId, created_at AS createdAt,
               verified_at AS verifiedAt
        FROM payments
        ORDER BY created_at DESC
        LIMIT 500
    `).all();
    return send(res, 200, { ok: true, payments: rows });
}

async function adminVerifyPayment(req, res) {
    if (!requireAdmin(req, res)) return;
    if (IS_PRODUCTION) {
        return send(res, 403, { ok: false, message: "تأیید دستی پرداخت در محیط production مجاز نیست." });
    }
    const body = await readBody(req);
    const paymentId = String(body.paymentId || "").trim();

    const result = db.prepare(`
        UPDATE payments
        SET status = 'verified', verified_at = ?
        WHERE payment_id = ? AND status = 'pending'
    `).run(new Date().toISOString(), paymentId);

    if (!result.changes) {
        return send(res, 404, { ok: false, message: "پرداخت pending پیدا نشد." });
    }

    audit("payment.verified", "admin", { metadata: { paymentId } });
    return send(res, 200, { ok: true, status: "verified" });
}

const server = http.createServer(async (req, res) => {
    const requestId = createRequestId();
    res.__requestId = requestId;
    if (req.method === "OPTIONS") {
        const origin = String(req.headers.origin || "");
        if (origin && !isAllowedOrigin(origin)) {
            return send(res, 403, { ok: false, message: "Origin مجاز نیست." });
        }
        res.writeHead(204, {
            "Access-Control-Allow-Origin": origin || ADMIN_ORIGIN,
            "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
        });
        return res.end();
    }

    try {
        if (!requestAllowed(req)) {
            return send(res, 429, {
                ok: false,
                valid: false,
                message: "تعداد درخواست‌ها بیش از حد مجاز است."
            });
        }

        if (req.method === "GET" && req.url === "/api/metrics/alerts") {
    if (!requireAdmin(req, res)) return;
    const alerts = evaluateOperationalAlerts();
    auditOperationalAlerts(alerts);
    return send(res, 200, { ok: true, alerts });
}

if (req.method === "GET" && req.url === "/api/metrics") {
            if (!requireAdmin(req, res)) return;
            return send(res, 200, { ok: true, metrics: metricsSnapshot() });
        }

        if (req.method === "GET" && req.url === "/api/health") {
            let database = "ok";
            let dbIntegrity = "ok";
            try {
                const result = db.prepare("PRAGMA integrity_check").get();
                dbIntegrity = result && result.integrity_check === "ok" ? "ok" : "failed";
                if (dbIntegrity !== "ok") database = "degraded";
            } catch {
                database = "failed";
                dbIntegrity = "failed";
            }

            const operational = operationalHealthStatus();
            const databaseHealthy = database === "ok";
            const critical = operational.status === "critical" || !databaseHealthy;

            return send(res, critical ? 503 : 200, {
                ok: !critical,
                service: "tahouri-license-api",
                environment: SERVICE_ENVIRONMENT,
                serviceVersion: SERVICE_VERSION,
                buildId: BUILD_ID,
                instanceId: INSTANCE_ID,
                dbSchemaVersion: DB_SCHEMA_VERSION,
                database,
                dbIntegrity,
                operational
            });
        }

        if (req.method === "GET" && req.url === "/api/ready") {
            const operational = operationalHealthStatus();
            const ready = operational.status !== "critical";
            return send(res, ready ? 200 : 503, {
                ok: ready,
                ready,
                service: "tahouri-license-api",
                instanceId: INSTANCE_ID
            });
        }

        if (req.method === "GET" && (req.url === "/admin" || req.url === "/admin/")) {
            const adminFile = path.join(__dirname, "admin", "index.html");
            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store"
            });
            return res.end(fs.readFileSync(adminFile, "utf8"));
        }

        if (req.method === "GET" && req.url === "/admin/admin.js") {
            const adminFile = path.join(__dirname, "admin", "admin.js");
            res.writeHead(200, {
                "Content-Type": "application/javascript; charset=utf-8",
                "Cache-Control": "no-store"
            });
            return res.end(fs.readFileSync(adminFile, "utf8"));
        }

        if (req.method === "GET" && req.url === "/admin/admin.css") {
            const adminFile = path.join(__dirname, "admin", "admin.css");
            res.writeHead(200, {
                "Content-Type": "text/css; charset=utf-8",
                "Cache-Control": "no-store"
            });
            return res.end(fs.readFileSync(adminFile, "utf8"));
        }

        if (req.method === "POST" && req.url === "/api/admin/login") {
            return adminLogin(req, res, await readBody(req));
        }

        if (req.method === "POST" && req.url === "/api/admin/logout") {
            return adminLogout(req, res);
        }

        if (req.method === "GET" && req.url === "/api/admin/session") {
            return send(res, 200, { ok: adminAuthorized(req) });
        }

        if (req.method === "GET" && req.url === "/api/public-key") {
            return send(res, 200, {
                environment: NODE_ENV,
                publicKeyPem: crypto.createPublicKey(privateKey).export({
                    type: "spki",
                    format: "pem"
                }).toString()
            });
        }

        if (req.method === "GET" && req.url.startsWith("/api/licenses/status")) {
            return await licenseStatus(req, res);
        }

        if (req.method === "POST" && req.url === "/api/licenses/activate") {
            if (!requestAllowedWithLimit(req, ACTIVATION_RATE_LIMIT, activationRateBuckets)) {
                recordMetric("securityRateLimitBlocks");
                recordSuspiciousAttempt(req, "activation_rate_limited");
                return send(res, 429, { ok: false, valid: false, message: "تعداد تلاش‌های فعال‌سازی بیش از حد مجاز است." });
            }
            return await activate(req, res);
        }

        if (req.method === "POST" && req.url === "/api/admin/codes") {
            return await adminCreateCodes(req, res);
        }

        if (req.method === "GET" && req.url === "/api/admin/codes") {
            return await adminListCodes(req, res);
        }

        if (req.method === "POST" && req.url === "/api/admin/codes/revoke") {
            return await adminRevokeCode(req, res);
        }

        if (req.method === "GET" && req.url.startsWith("/api/admin/search")) {
            return await adminSearch(req, res);
        }

        if (req.method === "GET" && req.url === "/api/admin/diagnostics") {
            return adminDiagnostics(req, res);
        }

        if (req.method === "GET" && req.url === "/api/admin/licenses") {
            return await adminListLicenses(req, res);
        }

        if (req.method === "POST" && req.url === "/api/admin/licenses/revoke") {
            return await adminRevokeLicense(req, res);
        }

        if (req.method === "POST" && req.url === "/api/admin/licenses/extend") {
            return await adminExtendLicense(req, res);
        }

        if (req.method === "GET" && req.url.startsWith("/api/admin/audit")) {
            return await adminAudit(req, res);
        }

        if (req.method === "POST" && req.url === "/api/payments") {
            return await paymentCreate(req, res);
        }

        if (req.method === "POST" && req.url === "/api/payments/callback") {
            return await paymentCallback(req, res);
        }

        if (req.method === "GET" && req.url.startsWith("/api/payments/status")) {
            return await paymentStatus(req, res);
        }

        if (req.method === "POST" && req.url === "/api/admin/payments") {
            return await adminCreatePayment(req, res);
        }

        if (req.method === "GET" && req.url === "/api/admin/payments") {
            return await adminListPayments(req, res);
        }

        if (req.method === "POST" && req.url === "/api/admin/payments/verify") {
            return await adminVerifyPayment(req, res);
        }

        return send(res, 404, { message: "مسیر موردنظر پیدا نشد." });
    } catch (error) {
        safeLog("error", "Tahouri License API request failed.", { requestId: res.__requestId, error: error.message });
        const statusCode = Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 500
            ? error.statusCode
            : 500;
        return send(res, statusCode, {
            ok: false,
            valid: false,
            message: statusCode === 400 ? error.message : "خطای داخلی سرویس."
        });
    }
});

function getDatabaseSchemaVersion() {
    const row = db.prepare("PRAGMA user_version").get();
    return Number(row.user_version || 0);
}

function migrateDatabase() {
    let current = getDatabaseSchemaVersion();

    if (current > DB_SCHEMA_VERSION) {
        throw new Error("Database schema is newer than this service.");
    }

    for (const migration of DATABASE_MIGRATIONS) {
        if (migration.version <= current) continue;

        migration.apply();
        db.exec("PRAGMA user_version = " + migration.version);
        audit("database.migrated", "system", {
            fromVersion: current,
            toVersion: migration.version
        });
        current = migration.version;
    }

    return current;
}

function ensureDatabaseSchemaVersion() {
    const current = getDatabaseSchemaVersion();
    if (current !== DB_SCHEMA_VERSION) {
        throw new Error(
            "Unsupported database schema version: " + current +
            " (expected " + DB_SCHEMA_VERSION + ")"
        );
    }
    return current;
}

function startupRecoveryCheck() {
    try {
        migrateDatabase();
        ensureDatabaseSchemaVersion();
        const integrity = db.prepare("PRAGMA integrity_check").get();
        if (!integrity || integrity.integrity_check !== "ok") {
            throw new Error("SQLite integrity check failed at startup.");
        }

        const requiredTables = ["activation_codes", "licenses", "audit_log", "payments", "admin_sessions"];
        for (const table of requiredTables) {
            const row = db.prepare(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
            ).get(table);
            if (!row) throw new Error("Required table missing: " + table);
        }

        console.log("Startup recovery check: PASS");
        return true;
    } catch (error) {
        console.error("Startup recovery check: FAIL -", error.message);
        return false;
    }
}

const startupHealthy = startupRecoveryCheck();

if (startupHealthy) {
    audit("service.started", "system", { environment: SERVICE_ENVIRONMENT, serviceVersion: SERVICE_VERSION, buildId: BUILD_ID, instanceId: INSTANCE_ID });
}
if (!startupHealthy) {
    console.error("Startup aborted because database recovery check failed.");
    process.exit(1);
}

let isShuttingDown = false;

function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log("Shutdown requested:", signal);

    try {
        audit("service.shutdown", "system", { signal, environment: SERVICE_ENVIRONMENT, serviceVersion: SERVICE_VERSION, buildId: BUILD_ID, instanceId: INSTANCE_ID });
    } catch (error) {
        console.error("Shutdown audit failed:", error.message);
    }

    try {
        db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch (error) {
        console.error("Database checkpoint during shutdown failed:", error.message);
    }

    try {
        db.close();
    } catch (error) {
        console.error("Database close during shutdown failed:", error.message);
    }

    server.close(() => {
        console.log("Tahouri License API stopped.");
        process.exit(0);
    });

    setTimeout(() => {
        console.error("Forced shutdown after timeout.");
        process.exit(1);
    }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

server.listen(PORT, HOST, () => {
    console.log("Tahouri License API TEST listening on http://" + HOST + ":" + PORT);
    console.log("SQLite database:", DB_FILE);
});