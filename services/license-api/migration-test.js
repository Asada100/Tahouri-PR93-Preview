"use strict";

const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const port = 8898;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tahouri-migration-test-"));
const dbFile = path.join(tempDir, "license.sqlite");
const keyFile = path.join(tempDir, "private.pem");
const base = "http://127.0.0.1:" + port;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function request(method, route) {
    return new Promise((resolve, reject) => {
        const req = http.request(base + route, { method }, res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve({ status: res.statusCode, body: data }));
        });
        req.on("error", reject);
        req.end();
    });
}

async function waitForReady(child) {
    for (let i = 0; i < 50; i++) {
        if (child.exitCode !== null) {
            throw new Error("Server exited before readiness.");
        }
        try {
            const result = await request("GET", "/api/ready");
            if (result.status === 200) return;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Server did not become ready.");
}

function startServer() {
    return spawn(process.execPath, [path.join(__dirname, "server.js")], {
        env: {
            ...process.env,
            PORT: String(port),
            HOST: "127.0.0.1",
            NODE_ENV: "development",
            TAHOURI_TEST_CODES: "true",
            TAHOURI_LICENSE_DB_FILE: dbFile,
            TAHOURI_LICENSE_PRIVATE_KEY_FILE: keyFile
        },
        stdio: ["ignore", "pipe", "pipe"]
    });
}

function stopServer(child) {
    if (child.exitCode === null) child.kill("SIGTERM");
}

async function main() {
    const key = require("crypto").generateKeyPairSync("rsa", { modulusLength: 2048 });
    fs.writeFileSync(
        keyFile,
        key.privateKey.export({ type: "pkcs8", format: "pem" })
    );

    const first = startServer();
    await waitForReady(first);
    stopServer(first);
    await new Promise(resolve => first.once("exit", resolve));

    const db = new DatabaseSync(dbFile);
    const versionAfterMigration = Number(
        db.prepare("PRAGMA user_version").get().user_version || 0
    );
    const migratedRows = db.prepare(
        "SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'database.migrated'"
    ).get().count;
    assert(versionAfterMigration === 1, "Initial migration did not set schema version to 1.");
    assert(Number(migratedRows) === 1, "Initial migration audit entry is missing.");
    db.close();

    const second = startServer();
    await waitForReady(second);
    stopServer(second);
    await new Promise(resolve => second.once("exit", resolve));

    const dbAfterRestart = new DatabaseSync(dbFile);
    const versionAfterRestart = Number(
        dbAfterRestart.prepare("PRAGMA user_version").get().user_version || 0
    );
    const migrationRowsAfterRestart = dbAfterRestart.prepare(
        "SELECT COUNT(*) AS count FROM audit_log WHERE event_type = 'database.migrated'"
    ).get().count;
    assert(versionAfterRestart === 1, "Schema version changed after restart.");
    assert(Number(migrationRowsAfterRestart) === 1, "Migration ran again after restart.");
    dbAfterRestart.exec("PRAGMA user_version = 99");
    dbAfterRestart.close();

    const incompatible = startServer();
    let output = "";
    incompatible.stdout.on("data", chunk => output += chunk);
    incompatible.stderr.on("data", chunk => output += chunk);

    await new Promise(resolve => incompatible.once("exit", resolve));
    assert(incompatible.exitCode !== 0, "Newer database schema was not rejected.");
    assert(
        output.includes("Database schema is newer than this service.") ||
        output.includes("Startup recovery check: FAIL"),
        "Incompatible schema rejection was not observed."
    );

    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log("Migration verification: PASS");
}

main().catch(error => {
    console.error("Migration verification: FAIL -", error.message);
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    process.exit(1);
});
