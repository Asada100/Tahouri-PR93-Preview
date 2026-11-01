"use strict";

const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
const source = fs.readFileSync(serverPath, "utf8");
const composePath = path.join(__dirname, "../../docker-compose.production.yml");
const compose = fs.readFileSync(composePath, "utf8");
const gitignorePath = path.join(__dirname, "../../.gitignore");
const gitignore = fs.readFileSync(gitignorePath, "utf8");
const caddyPath = path.join(__dirname, "Caddyfile.production.example");
const caddy = fs.readFileSync(caddyPath, "utf8");
const backupCryptoPath = path.join(__dirname, "backup-crypto.js");
const backupCrypto = fs.readFileSync(backupCryptoPath, "utf8");
const backupDbPath = path.join(__dirname, "backup-db.js");
const backupDb = fs.readFileSync(backupDbPath, "utf8");

const licenseManagerPath = path.join(__dirname, "../../engine/core/licenseManager.js");
const activationGatePath = path.join(__dirname, "../../engine/core/activationGate.js");
const licenseManager = fs.readFileSync(licenseManagerPath, "utf8");
const activationGate = fs.readFileSync(activationGatePath, "utf8");

const forbidden = [
    /console\.log\([^\n]*(?:password|secret|token|authority|private.?key|api.?key)/i,
    /TAHOURI_ADMIN_PASSWORD\s*=\s*["'][^"']+["']/i,
    /TAHOURI_LICENSE_PRIVATE_KEY_FILE\s*=\s*["'][^"']+["']/i
];

const failures = forbidden.filter(pattern => pattern.test(source));
if (failures.length) {
    throw new Error("Potential secret/logging leak detected in server.js.");
}

const rateLimitMarkers = [
    "function getClientIp",
    "const ACTIVATION_RATE_LIMIT = 10",
    "requestAllowedWithLimit(req, ACTIVATION_RATE_LIMIT, activationRateBuckets)",
    "requestAllowedWithLimit(req, ADMIN_LOGIN_RATE_LIMIT, adminLoginRateBuckets)",
    "x-forwarded-for"
];

for (const marker of rateLimitMarkers) {
    if (!source.includes(marker)) {
        throw new Error("Rate limiting hardening marker missing: " + marker);
    }
}

if (!source.includes("X-Content-Type-Options") || !source.includes("X-Frame-Options") || !source.includes("Referrer-Policy")) {
    throw new Error("Required API security headers are missing.");
}

const caddySecurityMarkers = [
    'Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    'Content-Security-Policy "default-src \'none\'; frame-ancestors \'none\'; base-uri \'none\'"',
    'X-Content-Type-Options "nosniff"',
    'X-Frame-Options "DENY"',
    'Referrer-Policy "no-referrer"'
];

for (const marker of caddySecurityMarkers) {
    if (!caddy.includes(marker)) {
        throw new Error("Required Caddy security header missing: " + marker);
    }
}

if (compose.includes('8787:8787')) {
    throw new Error("License API port 8787 must not be publicly published.");
}
if (!compose.includes("tahouri_backup_encryption_key:") ||
    !compose.includes("TAHOURI_BACKUP_ENCRYPTION_KEY_FILE: /run/secrets/tahouri_backup_encryption_key")) {
    throw new Error("Production backup encryption key must use a Docker secret.");
}

if (!compose.includes("tahouri_private_key:")) {
    throw new Error("Production signing key must use a Docker secret.");
}
if (!compose.includes("TAHOURI_LICENSE_PRIVATE_KEY_FILE: /run/secrets/tahouri_private_key")) {
    throw new Error("Production signing key path must use the Docker secret mount.");
}
if (!gitignore.includes("*.pem") || !gitignore.includes("secrets/")) {
    throw new Error("Production secret files must be ignored by Git.");
}

const required = [
    "function safeLog",
    "function startupRecoveryCheck",
    "function migrateDatabase",
    "function gracefulShutdown",
    "/api/ready",
    "/api/metrics/alerts"
];

for (const marker of required) {
    if (!source.includes(marker)) {
        throw new Error("Required production hardening marker missing: " + marker);
    }
}

if (!backupDb.includes('const { encryptFile, readEncryptionKey } = require("./backup-crypto")') ||
    !backupCrypto.includes('aes-256-gcm') ||
    !backupCrypto.includes('crypto.createCipheriv') ||
    !backupCrypto.includes('crypto.createDecipheriv')) {
    throw new Error("Backup encryption implementation is missing.");
}

const productionLicenseMarkers = [
    "function isRemoteProductionMode",
    "if (isRemoteProductionMode())",
    "فعال‌سازی محلی در نسخه production مجاز نیست."
];

for (const marker of productionLicenseMarkers) {
    if (!licenseManager.includes(marker)) {
        throw new Error("Production license safety marker missing: " + marker);
    }
}

if (!activationGate.includes('const productionMode = serviceConfig.mode === "production";')) {
    throw new Error("Activation gate production mode guard is missing.");
}

console.log("Tahouri License API security test: PASS");
