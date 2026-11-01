"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const backupDir = process.env.TAHOURI_LICENSE_BACKUP_DIR ||
    path.join(__dirname, "backups");
const host = process.env.TAHOURI_BACKUP_OFFSITE_HOST;
const user = process.env.TAHOURI_BACKUP_OFFSITE_USER;
const remoteDir = process.env.TAHOURI_BACKUP_OFFSITE_DIR;
const identityFile = process.env.TAHOURI_BACKUP_OFFSITE_SSH_KEY_FILE;
const knownHostsFile = process.env.TAHOURI_BACKUP_OFFSITE_KNOWN_HOSTS_FILE;

// A test-only executable hook lets the backup/recovery test simulate scp on
// Windows and POSIX without making a network connection. It is ignored outside
// NODE_ENV=test, so production always invokes the real scp command.
const testScpScript = process.env.NODE_ENV === "test"
    ? process.env.TAHOURI_BACKUP_SCP_TEST_SCRIPT
    : null;

if (process.env.NODE_ENV === "production" &&
    (!host || !user || !remoteDir || !identityFile || !knownHostsFile)) {
    throw new Error(
        "Off-site backup configuration is required in production: " +
        "TAHOURI_BACKUP_OFFSITE_HOST, TAHOURI_BACKUP_OFFSITE_USER, " +
        "TAHOURI_BACKUP_OFFSITE_DIR, TAHOURI_BACKUP_OFFSITE_SSH_KEY_FILE, TAHOURI_BACKUP_OFFSITE_KNOWN_HOSTS_FILE."
    );
}

if (!host || !user || !remoteDir || !identityFile) {
    console.log("Off-site backup replication skipped: configuration is incomplete.");
    process.exit(0);
}

if (!fs.existsSync(backupDir)) {
    throw new Error("Backup directory not found: " + backupDir);
}
if (!fs.existsSync(identityFile)) {
    throw new Error("Off-site SSH key not found: " + identityFile);
}
if (!fs.existsSync(knownHostsFile)) {
    throw new Error("Off-site known_hosts file not found: " + knownHostsFile);
}
if (testScpScript && !fs.existsSync(testScpScript)) {
    throw new Error("Test scp script not found: " + testScpScript);
}

const files = fs.readdirSync(backupDir)
    .filter(name => name.endsWith(".sqlite.enc") || name.endsWith(".sqlite.enc.sig"))
    .map(name => path.join(backupDir, name));

if (!files.length) {
    throw new Error("No backup files found for off-site replication.");
}

const remote = user + "@" + host + ":" + remoteDir + "/";
const args = ["-i", identityFile, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "UserKnownHostsFile=" + knownHostsFile];

for (const file of files) {
    if (testScpScript) {
        execFileSync(process.execPath, [testScpScript, ...args, file, remote], { stdio: "inherit" });
    } else {
        execFileSync("scp", [...args, file, remote], { stdio: "inherit" });
    }
}

console.log("Off-site backup replication: PASS");
console.log("Files replicated: " + files.length);
