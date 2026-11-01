"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const crypto = require("node:crypto");
const { decryptFile } = require("./backup-crypto");

const backupFile = process.argv[2];

if (!backupFile) {
    console.error("Usage: node restore-rehearsal.js <backup.sqlite.enc>");
    process.exit(2);
}

const source = path.resolve(backupFile);
if (!fs.existsSync(source)) {
    console.error("Backup file not found: " + source);
    process.exit(2);
}
if (!source.endsWith(".sqlite.enc")) {
    throw new Error("Only encrypted .sqlite.enc backups are accepted.");
}

const publicKeyFile = process.env.TAHOURI_BACKUP_SIGNING_PUBLIC_KEY_FILE;
const encryptionKeyFile = process.env.TAHOURI_BACKUP_ENCRYPTION_KEY_FILE;
const signatureFile = source + ".sig";

if (process.env.NODE_ENV === "production" && !publicKeyFile) {
    throw new Error("Backup signing public key is required in production.");
}
if (process.env.NODE_ENV === "production" && !encryptionKeyFile) {
    throw new Error("Backup encryption key is required in production.");
}

if (publicKeyFile) {
    if (!fs.existsSync(publicKeyFile) || !fs.existsSync(signatureFile)) {
        throw new Error("Backup signature or verification key is missing.");
    }
    const signature = Buffer.from(fs.readFileSync(signatureFile, "utf8").trim(), "base64");
    const digest = crypto.createHash("sha256").update(fs.readFileSync(source)).digest();
    if (!crypto.verify("RSA-SHA256", digest, fs.readFileSync(publicKeyFile), signature)) {
        throw new Error("Backup signature verification failed.");
    }
}

const rehearsalDir = fs.mkdtempSync(path.join(os.tmpdir(), "tahouri-restore-"));
const restoredFile = path.join(rehearsalDir, "license.sqlite");

try {
    decryptFile(source, restoredFile, encryptionKeyFile);

    const db = new DatabaseSync(restoredFile);
    try {
        const integrity = db.prepare("PRAGMA integrity_check").get();
        if (!integrity || integrity.integrity_check !== "ok") {
            throw new Error("Restored database integrity check failed.");
        }

        const requiredTables = [
            "activation_codes",
            "licenses",
            "audit_log",
            "payments"
        ];

        const schemaVersion = db.prepare("PRAGMA user_version").get().user_version;
        if (schemaVersion !== 1) {
            throw new Error("Unsupported database schema version: " + schemaVersion);
        }

        const tables = db.prepare(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).all().map(row => row.name);

        for (const table of requiredTables) {
            if (!tables.includes(table)) {
                throw new Error("Restored database is missing table: " + table);
            }
        }

        const counts = {};
        for (const table of requiredTables) {
            counts[table] = db.prepare(
                "SELECT COUNT(*) AS count FROM " + table
            ).get().count;
        }

        console.log("Tahouri restore rehearsal: PASS");
        console.log("Restored copy: " + restoredFile);
        console.log(JSON.stringify(counts));
    } finally {
        db.close();
    }
} finally {
    fs.rmSync(rehearsalDir, { recursive: true, force: true });
}
