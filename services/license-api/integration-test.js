"use strict";

const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const port = 8897;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tahouri-license-test-"));
const dbFile = path.join(tempDir, "license.sqlite");
const keyFile = path.join(tempDir, "private.pem");
const base = "http://127.0.0.1:" + port;

function request(method, route, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = body === undefined ? null : JSON.stringify(body);
        const req = http.request(base + route, {
            method,
            headers: {
                ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
                ...headers
            }
        }, res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                let json = {};
                try { json = data ? JSON.parse(data) : {}; } catch {}
                resolve({ status: res.statusCode, headers: res.headers, data: json });
            });
        });
        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function waitForServer(child) {
    for (let i = 0; i < 50; i++) {
        if (child.exitCode !== null) throw new Error("Server exited during startup.");
        try {
            const result = await request("GET", "/api/health");
            const ready = await request("GET", "/api/ready");
            assert(ready.status === 200 && ready.data.ready === true, "Readiness check failed.");

            if (result.status === 200) return;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Server did not start.");
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function main() {
    const sourceServer = path.join(__dirname, "server.js");
    const key = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    fs.writeFileSync(keyFile, key.privateKey.export({ type: "pkcs8", format: "pem" }));

    const child = spawn(process.execPath, [sourceServer], {
        env: {
            ...process.env,
            PORT: String(port),
            HOST: "127.0.0.1",
            NODE_ENV: "development",
            TAHOURI_TEST_CODES: "true",
            TAHOURI_TEST_MODE: "true",
            TAHOURI_LICENSE_DB_FILE: dbFile,
            TAHOURI_LICENSE_PRIVATE_KEY_FILE: keyFile
        },
        stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    child.stderr.on("data", chunk => stderr += chunk);

    try {
        await waitForServer(child);

        const activation = await request("POST", "/api/licenses/activate", {
            code: "GRADE6-1405-TEST-A",
            gradeId: "grade6",
            studentId: "integration-student",
            installationId: "integration-installation"
        });
        assert(activation.status === 200 && activation.data.valid, "Activation failed.");
        assert(activation.data.entitlement?.claims?.studentId === "integration-student", "Student binding missing.");
        assert(activation.data.entitlement?.claims?.gradeScope === "grade6", "Grade binding missing.");
        assert(Number.isFinite(Date.parse(activation.data.entitlement.claims.validUntil)), "Expiry is invalid.");

        const metricsUnauthenticated = await request("GET", "/api/metrics");
        assert(metricsUnauthenticated.status === 401, "Metrics endpoint must require admin authentication.");

        const login = await request("POST", "/api/admin/login", { password: "TAHOURI-ADMIN-TEST" });
        const adminCookie = Array.isArray(login.headers["set-cookie"]) ? login.headers["set-cookie"][0].split(";")[0] : "";
        assert(adminCookie, "Admin login did not return a session cookie.");

        const metricsAuthenticated = await request("GET", "/api/metrics", undefined, { Cookie: adminCookie });
        assert(metricsAuthenticated.status === 200 && metricsAuthenticated.data.ok, "Authenticated metrics failed.");

        assert(login.status === 200 && login.data.ok, "Admin login failed.");
        const cookie = login.headers["set-cookie"]?.[0]?.split(";")[0];
        assert(cookie, "Admin session cookie missing.");

        const list = await request("GET", "/api/admin/licenses", undefined, { Cookie: cookie });
        assert(list.status === 200 && list.data.licenses?.length === 1, "License was not listed.");

        const licenseId = activation.data.entitlement.claims.licenseId;
        const extension = new Date(Date.now() + 370 * 24 * 60 * 60 * 1000).toISOString();
        const extended = await request("POST", "/api/admin/licenses/extend", { licenseId, validUntil: extension }, { Cookie: cookie });
        assert(extended.status === 200 && extended.data.ok, "License extension failed.");
        assert(extended.data.entitlement.claims.validUntil === extension, "Extended expiry was not signed.");

        const reuse = await request("POST", "/api/licenses/activate", {
            code: "GRADE6-1405-TEST-A", gradeId: "grade6", studentId: "second-student", installationId: "second-installation"
        });
        assert(reuse.status === 409, "Used activation code was reusable.");

        const wrongGrade = await request("POST", "/api/licenses/activate", {
            code: "GRADE6-1405-TEST-B", gradeId: "grade5", studentId: "wrong-grade-student", installationId: "wrong-grade-installation"
        });
        assert(wrongGrade.status === 400, "Grade mismatch was accepted.");

        const expiryDb = new DatabaseSync(dbFile);
        try {
            expiryDb.prepare("UPDATE licenses SET valid_until = ? WHERE license_id = ?").run(new Date(Date.now() - 1000).toISOString(), licenseId);
            const expired = expiryDb.prepare("SELECT valid_until AS validUntil, status FROM licenses WHERE license_id = ?").get(licenseId);
            assert(Date.parse(expired.validUntil) < Date.now(), "Expiry test data was not set.");
            assert(expired.status === "active", "Expiry should not change the persisted lifecycle state before explicit revocation.");

            const restoredExpiry = new Date(Date.now() + 370 * 24 * 60 * 60 * 1000).toISOString();
            expiryDb.prepare("UPDATE licenses SET valid_until = ? WHERE license_id = ?").run(restoredExpiry, licenseId);
            const restored = expiryDb.prepare("SELECT valid_until AS validUntil, status FROM licenses WHERE license_id = ?").get(licenseId);
            assert(Date.parse(restored.validUntil) > Date.now(), "License expiry was not restored after the expiry lifecycle check.");
            assert(restored.status === "active", "License lifecycle state changed during the expiry test.");
        } finally { expiryDb.close(); }

        const payment = await request("POST", "/api/payments", {
            gradeId: "grade6", academicYear: "1405", amount: 100000, currency: "IRR"
        });
        assert(payment.status === 201 && payment.data.status === "pending", "Payment creation failed.");

        const verifyPayment = await request("POST", "/api/admin/payments/verify", { paymentId: payment.data.paymentId }, { Cookie: cookie });
        assert(verifyPayment.status === 200 && verifyPayment.data.status === "verified", "Payment verification failed.");

        const paymentStatus = await request("GET", "/api/payments/status?paymentId=" + encodeURIComponent(payment.data.paymentId));
        assert(paymentStatus.status === 200 && paymentStatus.data.payment.status === "verified", "Verified payment status failed.");

        const audit = await request("GET", "/api/admin/audit?limit=100", undefined, { Cookie: cookie });
        assert(audit.status === 200 && Array.isArray(audit.data.audit), "Audit endpoint failed.");

        const auditEvents = audit.data.audit.map(item => item.event_type || item.eventType);
        for (const requiredEvent of ["license.activated", "license.extended"]) {
            assert(auditEvents.includes(requiredEvent), "Missing audit event: " + requiredEvent);
        }

        const badAdminLogin = await request("POST", "/api/admin/login", { password: "definitely-wrong-password" });
        assert(badAdminLogin.status === 401, "Invalid admin login was not rejected.");

        const securityAudit = await request("GET", "/api/admin/audit?limit=100", undefined, { Cookie: cookie });
        assert(securityAudit.status === 200 && Array.isArray(securityAudit.data.audit), "Security audit endpoint failed.");
        const securityEvents = securityAudit.data.audit.filter(item =>
            (item.event_type || item.eventType) === "security.suspicious_attempt"
        );
        assert(securityEvents.length >= 1, "Suspicious admin login attempt was not recorded.");

        const suspiciousMetric = securityAudit.data.audit.find(item =>
            (item.event_type || item.eventType) === "security.suspicious_attempt"
        );
        assert(suspiciousMetric?.metadata?.category === "admin_login_failed", "Suspicious login category was not recorded.");

        const badCode = await request("POST", "/api/licenses/activate", {
            code: "bad code with spaces", gradeId: "grade6", studentId: "integration-student", installationId: "integration-installation"
        });
        assert(badCode.status === 400, "Invalid activation code input was accepted.");

        const badStudent = await request("POST", "/api/licenses/activate", {
            code: "GRADE6-1405-TEST-B", gradeId: "grade6", studentId: "student with spaces", installationId: "integration-installation"
        });
        assert(badStudent.status === 400, "Invalid student identifier was accepted.");

        const badStatus = await request("GET", "/api/licenses/status?licenseId=" + encodeURIComponent("license id with spaces"));
        assert(badStatus.status === 400, "Invalid license identifier was accepted.");

        const iranParts = Object.fromEntries(
            new Intl.DateTimeFormat("en-US-u-ca-persian", {
                timeZone: "Asia/Tehran",
                year: "numeric",
                month: "numeric",
                day: "numeric"
            }).formatToParts(new Date())
              .filter(part => part.type !== "literal")
              .map(part => [part.type, Number(part.value)])
        );
        const activeAcademicYear = iranParts.month >= 7 ? iranParts.year : iranParts.year - 1;
        const nextAcademicYear = String(activeAcademicYear + 1);

        const promotionCodes = await request("POST", "/api/admin/codes", {
            gradeId: "grade7",
            academicYear: nextAcademicYear,
            count: 3
        }, { Cookie: cookie });
        assert(promotionCodes.status === 201 && promotionCodes.data.codes?.length === 3, "Grade 7 next-year promotion codes were not created.");

        const repeatCodes = await request("POST", "/api/admin/codes", {
            gradeId: "grade6",
            academicYear: nextAcademicYear,
            renewalMode: "repeat",
            count: 1
        }, { Cookie: cookie });
        assert(repeatCodes.status === 201 && repeatCodes.data.codes?.length === 1, "Grade 6 next-year repeat code creation failed.");

        const promotionActivation = await request("POST", "/api/licenses/activate", {
            code: promotionCodes.data.codes[0],
            gradeId: "grade7",
            studentId: "integration-student",
            installationId: "integration-installation",
            renewalMode: "promotion"
        });
        assert(promotionActivation.status === 200 && promotionActivation.data.valid, "Grade 6 → Grade 7 next-year promotion failed.");
        assert(promotionActivation.data.renewalStored === true, "Future promotion was not marked as stored.");
        assert(
            promotionActivation.data.entitlement.claims.gradeScope === "grade7",
            "Promotion entitlement must be bound to Grade 7."
        );
        assert(
            promotionActivation.data.entitlement.claims.academicYear === nextAcademicYear,
            "Promotion entitlement academic year is incorrect."
        );
        assert(
            Date.parse(promotionActivation.data.entitlement.claims.validFrom) > Date.now(),
            "Early promotion must not become active immediately."
        );

        const promotionStatus = await request(
            "GET",
            "/api/licenses/status?licenseId=" +
            encodeURIComponent(promotionActivation.data.entitlement.claims.licenseId)
        );
        assert(promotionStatus.status === 200 && promotionStatus.data.valid === false &&
            promotionStatus.data.reason === "future", "Future promotion must not be usable before its start date.");

        const tamperedPromotion = await request("POST", "/api/licenses/activate", {
            code: promotionCodes.data.codes[1],
            gradeId: "grade6",
            studentId: "integration-student",
            installationId: "integration-installation",
            renewalMode: "promotion"
        });
        assert(tamperedPromotion.status === 400, "A Grade 7 promotion code must reject a tampered Grade 6 request.");

        const invalidSameGradePromotion = await request("POST", "/api/licenses/activate", {
            code: repeatCodes.data.codes[0],
            gradeId: "grade6",
            studentId: "integration-student",
            installationId: "integration-installation",
            renewalMode: "promotion"
        });
        assert(invalidSameGradePromotion.status === 409, "A Grade 6 next-year code must not be usable as a promotion.");
        const repeatActivation = await request("POST", "/api/licenses/activate", {
            code: repeatCodes.data.codes[0],
            gradeId: "grade6",
            studentId: "integration-student",
            installationId: "integration-installation",
            renewalMode: "repeat"
        });
        assert(repeatActivation.status === 200 && repeatActivation.data.valid, "Same-grade repeat renewal failed.");
        assert(repeatActivation.data.renewalStored === true, "Future repeat renewal was not marked as stored.");
        assert(
            repeatActivation.data.entitlement.claims.gradeScope === "grade6",
            "Repeat entitlement must remain bound to Grade 6."
        );

        const wrongProfileRenewal = await request("POST", "/api/licenses/activate", {
            code: promotionCodes.data.codes[2],
            gradeId: "grade7",
            studentId: "other-profile",
            installationId: "other-installation",
            renewalMode: "promotion"
        });
        assert(wrongProfileRenewal.status === 409, "Future renewal must not be activatable by another profile.");

        const auditAfterRenewal = await request("GET", "/api/admin/audit?limit=100", undefined, { Cookie: cookie });
        assert(auditAfterRenewal.status === 200 && Array.isArray(auditAfterRenewal.data.audit), "Audit endpoint failed after renewal.");
        const renewalAuditEvents = auditAfterRenewal.data.audit.map(item => item.event_type || item.eventType);
        assert(renewalAuditEvents.includes("license.renewal_reserved"), "Missing audit event: license.renewal_reserved");

        const revoked = await request("POST", "/api/admin/licenses/revoke", { licenseId }, { Cookie: cookie });
        assert(revoked.status === 200 && revoked.data.ok, "License revoke failed.");

        const afterRevoke = await request("GET", "/api/admin/licenses", undefined, { Cookie: cookie });
        const revokedRow = afterRevoke.data.licenses.find(item => item.licenseId === licenseId);
        const futureRow = afterRevoke.data.licenses.find(item => item.licenseId === promotionActivation.data.entitlement.claims.licenseId);
        assert(afterRevoke.status === 200 && revokedRow?.status === "revoked", "Revoked license status was not persisted.");
        assert(futureRow?.status === "future", "Future renewal must appear as future in admin.");

        const health = await request("GET", "/api/health");
        assert(health.status === 200 && health.data.ok, "Health failed after activation: " + JSON.stringify({ status: health.status, data: health.data }));

        const sessionDb = new DatabaseSync(dbFile);
        try {
            const sessionTable = sessionDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_sessions'").get();
            assert(sessionTable, "Persistent admin_sessions table is missing.");
            const sessionCount = sessionDb.prepare("SELECT COUNT(*) AS count FROM admin_sessions").get().count;
            assert(Number(sessionCount) >= 1, "Admin session was not persisted.");
        } finally { sessionDb.close(); }

        const db = new DatabaseSync(dbFile);
        try {
            const license = db.prepare("SELECT license_id, student_id, grade_id, status FROM licenses LIMIT 1").get();
            assert(license && license.student_id === "integration-student", "License was not persisted.");
            assert(license.status === "revoked", "Persisted license is not revoked.");
        } finally { db.close(); }

        console.log("Tahouri License API integration test: PASS");
    } finally {
        child.kill();
        await new Promise(resolve => setTimeout(resolve, 100));
        if (stderr) process.stderr.write(stderr);
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error("Tahouri License API integration test: FAIL");
    console.error(error.message);
    process.exit(1);
});
