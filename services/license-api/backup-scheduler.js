"use strict";

const { spawn } = require("node:child_process");

const intervalHours = Number(process.env.TAHOURI_BACKUP_INTERVAL_HOURS || 24);
if (!Number.isFinite(intervalHours) || intervalHours < 1 || intervalHours > 168) {
    throw new Error("TAHOURI_BACKUP_INTERVAL_HOURS must be between 1 and 168.");
}

let backupRunning = false;

function runBackup() {
    if (backupRunning) {
        console.warn("Scheduled backup skipped: previous backup is still running.");
        return;
    }

    backupRunning = true;
    let child;

    try {
        child = spawn(process.execPath, ["backup-db.js"], {
            cwd: __dirname,
            env: process.env,
            stdio: "inherit"
        });
    } catch (error) {
        backupRunning = false;
        console.error("Backup scheduler failed to start:", error.message);
        return;
    }

    child.on("error", error => {
        backupRunning = false;
        console.error("Backup scheduler failed to start:", error.message);
    });

    child.on("exit", code => {
        backupRunning = false;
        if (code !== 0) {
            console.error("Scheduled backup failed with exit code:", code);
        }
    });
}

console.log("Tahouri backup scheduler started.");
console.log("Interval hours:", intervalHours);
runBackup();
setInterval(runBackup, intervalHours * 60 * 60 * 1000);
