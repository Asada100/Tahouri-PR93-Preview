"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");
const crypto = require("node:crypto");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "tahouri-backup-test-"));
const dbFile = path.join(root, "live", "license.sqlite");
const backupDir = path.join(root, "backups");
const keyDir = path.join(root, "keys");
fs.mkdirSync(keyDir, { recursive: true });

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicExponent: 0x10001
});
const privateKeyFile = path.join(keyDir, "backup-private.pem");
const publicKeyFile = path.join(keyDir, "backup-public.pem");
const encryptionKeyFile = path.join(keyDir, "backup-encryption.key");
const offsiteSshKeyFile = path.join(keyDir, "offsite-ssh-key");
const knownHostsFile = path.join(keyDir, "known_hosts");

fs.writeFileSync(privateKeyFile, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
fs.writeFileSync(publicKeyFile, publicKey.export({ type: "spki", format: "pem" }));
fs.writeFileSync(encryptionKeyFile, crypto.randomBytes(32).toString("base64") + "\n", { mode: 0o600 });
fs.writeFileSync(offsiteSshKeyFile, "test-offsite-key\n", { mode: 0o600 });
fs.writeFileSync(knownHostsFile, "# test known_hosts\n");

const offsiteDir = path.join(root, "offsite");
fs.mkdirSync(offsiteDir, { recursive: true });

// Node-based fake scp works on Windows and POSIX and never opens a network
// connection. offsite-backup.js invokes it only in NODE_ENV=test.
const fakeScp = path.join(keyDir, "fake-scp.js");
fs.writeFileSync(fakeScp, `"use strict";
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const destination = process.env.TAHOURI_TEST_OFFSITE;
if (!destination) throw new Error("TAHOURI_TEST_OFFSITE is required");
for (const arg of args) {
    if ((arg.endsWith(".sqlite.enc") || arg.endsWith(".sqlite.enc.sig")) && fs.existsSync(arg)) {
        fs.copyFileSync(arg, path.join(destination, path.basename(arg)));
    }
}
`);

fs.mkdirSync(path.dirname(dbFile), { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });

const db = new DatabaseSync(dbFile);
try {
    db.exec("CREATE TABLE activation_codes (id INTEGER PRIMARY KEY, code_hash TEXT); CREATE TABLE licenses (id INTEGER PRIMARY KEY, license_id TEXT); CREATE TABLE audit_log (id INTEGER PRIMARY KEY, event_type TEXT); CREATE TABLE payments (id INTEGER PRIMARY KEY, payment_id TEXT); INSERT INTO activation_codes(code_hash) VALUES ('test-hash'); INSERT INTO licenses(license_id) VALUES ('lic-test'); INSERT INTO audit_log(event_type) VALUES ('test'); INSERT INTO payments(payment_id) VALUES ('pay-test'); PRAGMA user_version = 1;");
} finally {
    db.close();
}

try {
    const env = {
        ...process.env,
        NODE_ENV: "test",
        TAHOURI_LICENSE_DB_FILE: dbFile,
        TAHOURI_LICENSE_BACKUP_DIR: backupDir,
        TAHOURI_BACKUP_SIGNING_PRIVATE_KEY_FILE: privateKeyFile,
        TAHOURI_BACKUP_SIGNING_PUBLIC_KEY_FILE: publicKeyFile,
        TAHOURI_BACKUP_ENCRYPTION_KEY_FILE: encryptionKeyFile,
        TAHOURI_BACKUP_OFFSITE_HOST: "test-host",
        TAHOURI_BACKUP_OFFSITE_USER: "test-user",
        TAHOURI_BACKUP_OFFSITE_DIR: "/offsite",
        TAHOURI_BACKUP_OFFSITE_SSH_KEY_FILE: offsiteSshKeyFile,
        TAHOURI_BACKUP_OFFSITE_KNOWN_HOSTS_FILE: knownHostsFile,
        TAHOURI_BACKUP_SCP_TEST_SCRIPT: fakeScp,
        TAHOURI_TEST_OFFSITE: offsiteDir
    };

    execFileSync(process.execPath, ["backup-db.js"], { cwd: __dirname, env, stdio: "inherit" });

    const backups = fs.readdirSync(backupDir).filter(name => name.endsWith(".sqlite.enc"));
    if (backups.length !== 1) throw new Error("Expected exactly one encrypted backup file.");

    const backup = path.join(backupDir, backups[0]);

    execFileSync(process.execPath, ["verify-backup.js", backup], { cwd: __dirname, env, stdio: "inherit" });

    const replicated = fs.readdirSync(offsiteDir);
    if (!replicated.includes(path.basename(backup)) || !replicated.includes(path.basename(backup) + ".sig")) {
        throw new Error("Off-site replication did not copy backup and signature.");
    }

    // Verify and restore the copy from the off-site destination, not the source.
    const offsiteBackup = path.join(offsiteDir, path.basename(backup));
    execFileSync(process.execPath, ["verify-backup.js", offsiteBackup], { cwd: __dirname, env, stdio: "inherit" });
    execFileSync(process.execPath, ["restore-rehearsal.js", offsiteBackup], { cwd: __dirname, env, stdio: "inherit" });

    // Also keep coverage for the original local backup.
    execFileSync(process.execPath, ["restore-rehearsal.js", backup], { cwd: __dirname, env, stdio: "inherit" });

    const tampered = path.join(root, "tampered.sqlite.enc");
    fs.copyFileSync(backup, tampered);
    fs.appendFileSync(tampered, "tampered");
    fs.copyFileSync(backup + ".sig", tampered + ".sig");

    let tamperRejected = false;
    try {
        execFileSync(process.execPath, ["verify-backup.js", tampered], { cwd: __dirname, env, stdio: "pipe" });
    } catch {
        tamperRejected = true;
    }
    if (!tamperRejected) throw new Error("Tampered signed backup was accepted.");

    // The restore rehearsal must enforce the same signature check as verification.
    let tamperedRestoreRejected = false;
    try {
        execFileSync(process.execPath, ["restore-rehearsal.js", tampered], { cwd: __dirname, env, stdio: "pipe" });
    } catch {
        tamperedRestoreRejected = true;
    }
    if (!tamperedRestoreRejected) throw new Error("Restore rehearsal accepted a tampered signed backup.");

    // A public verification key makes a detached signature mandatory.
    const unsigned = path.join(root, "unsigned.sqlite.enc");
    fs.copyFileSync(backup, unsigned);
    for (const [script, label] of [
        ["verify-backup.js", "verification"],
        ["restore-rehearsal.js", "restore rehearsal"]
    ]) {
        let unsignedRejected = false;
        try {
            execFileSync(process.execPath, [script, unsigned], { cwd: __dirname, env, stdio: "pipe" });
        } catch {
            unsignedRejected = true;
        }
        if (!unsignedRejected) throw new Error(label + " accepted a backup without its signature.");
    }

    const malformed = path.join(root, "malformed.sqlite.enc");
    const bad = new DatabaseSync(malformed);
    try {
        bad.exec("PRAGMA user_version = 99; CREATE TABLE activation_codes (id INTEGER); CREATE TABLE licenses (id INTEGER); CREATE TABLE audit_log (id INTEGER); CREATE TABLE payments (id INTEGER);");
    } finally {
        bad.close();
    }

    let rejected = false;
    try {
        execFileSync(process.execPath, ["verify-backup.js", malformed], { cwd: __dirname, env, stdio: "pipe" });
    } catch {
        rejected = true;
    }
    if (!rejected) throw new Error("Malformed/unsupported backup was accepted.");

    const live = new DatabaseSync(dbFile);
    try {
        const counts = [
            live.prepare("SELECT COUNT(*) AS count FROM activation_codes").get().count,
            live.prepare("SELECT COUNT(*) AS count FROM licenses").get().count,
            live.prepare("SELECT COUNT(*) AS count FROM audit_log").get().count,
            live.prepare("SELECT COUNT(*) AS count FROM payments").get().count
        ];
        if (counts.some(count => count !== 1)) {
            throw new Error("Live database changed during backup/recovery test.");
        }
    } finally {
        live.close();
    }

    console.log("Backup/recovery verification: PASS");
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
