import test from "node:test";
import assert from "node:assert/strict";
import worker from "./worker.js";

function envWithVersion(version) {
  return { DB: { prepare(sql) {
    assert.match(sql, /schema_migrations/);
    return { async first() { return { version }; } };
  } } };
}

test("health is ready only after a D1 migration exists", async () => {
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/health"), envWithVersion(2));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.schemaVersion, 2);
  assert.equal(body.capabilities.licenseActivation, false);
});

test("health advertises student-bound code issuance only with schema version 3", async () => {
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/health"), envWithVersion(3));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.schemaVersion, 3);
  assert.equal(body.capabilities.studentBoundCodeIssuance, true);
});

test("health fails closed if the schema is missing", async () => {
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/health"), envWithVersion(null));
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.ok, false);
});

test("activation fails closed when the signing secret is not configured", async () => {
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/activate", { method: "POST" }), {});
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /کلید امضای مجوز/);
});
test("public key endpoint returns only the configured public key", async () => {
  const publicKeyPem = "-----BEGIN PUBLIC KEY-----\\nTEST\\n-----END PUBLIC KEY-----";
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/public-key"), { LICENSE_SIGNING_PUBLIC_KEY_PEM: publicKeyPem });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.publicKeyPem, publicKeyPem);
  assert.equal("privateKeyPem" in body, false);
});

test("public key endpoint fails closed when no public key is configured", async () => {
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/public-key"), {});
  assert.equal(response.status, 503);
});

test("admin UI is served from the Assets binding", async () => {
  let called = false;
  const env = { ASSETS: { async fetch(request) {
    called = true;
    assert.equal(new URL(request.url).pathname, "/");
    return new Response("admin asset");
  } } };
  const response = await worker.fetch(new Request("https://api.example.workers.dev/"), env);
  assert.equal(await response.text(), "admin asset");
  assert.equal(called, true);
});


function adminEnv(calls, studentRecord = { student_id: "student-123", grade_id: "grade6", status: "active" }) {
  const batches = [];
  const DB = {
    prepare(sql) {
      return {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes("SELECT expires_at FROM admin_sessions")) {
            return { expires_at: Date.now() + 60_000 };
          }
          if (sql.includes("FROM student_accounts")) {
            return studentRecord &&
              studentRecord.student_id === this.values[0] &&
              studentRecord.grade_id === this.values[1] &&
              studentRecord.status === "active" ? studentRecord : null;
          }
          return null;
        },
        async run() {
          calls.push({ sql, values: this.values });
          return { meta: { changes: 1 } };
        },
        async all() { return { results: [] }; }
      };
    },
    async batch(statements) {
      batches.push(statements.map(statement => ({ sql: statement.sql, values: statement.values })));
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    }
  };
  return { batches, DB };
}

test("admin can register a student account and writes its audit event atomically", async () => {
  const calls = [];
  const env = adminEnv(calls);
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/students", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "tahouri_admin_session=test-session" },
    body: JSON.stringify({ fullName: "دانش‌آموز آزمایشی", gradeId: "grade6" })
  }), env);
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.match(body.student.studentId, /^stu_[a-f0-9]{32}$/);
  assert.equal(body.student.fullName, "دانش‌آموز آزمایشی");
  assert.equal(body.student.gradeId, "grade6");
  assert.equal(env.batches.length, 1);
  assert.equal(env.batches[0].length, 2);
  assert.match(env.batches[0][0].sql, /INSERT INTO student_accounts/);
  assert.match(env.batches[0][1].sql, /student.created/);
});

test("archiving a student also revokes every unused active activation code", async () => {
  const calls = [];
  const env = adminEnv(calls);
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/students/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "tahouri_admin_session=test-session" },
    body: JSON.stringify({ studentId: "student-123" })
  }), env);
  assert.equal(response.status, 200);
  assert.equal(env.batches.length, 1);
  assert.equal(env.batches[0].length, 3);
  assert.match(env.batches[0][0].sql, /student.archived/);
  assert.match(env.batches[0][1].sql, /UPDATE student_accounts/);
  assert.match(env.batches[0][2].sql, /UPDATE activation_codes SET status = 'revoked'/);
  assert.match(env.batches[0][2].sql, /used_at IS NULL/);
});

test("admin student registry rejects invalid grades", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/students", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "tahouri_admin_session=test-session" },
    body: JSON.stringify({ fullName: "Test", gradeId: "grade7" })
  }), adminEnv(calls));
  assert.equal(response.status, 400);
});

test("admin code issuance requires a student ID", async () => {
  const calls = [];
  const env = adminEnv(calls);
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/codes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "tahouri_admin_session=test-session" },
    body: JSON.stringify({ gradeId: "grade6", academicYear: "1405", renewalMode: "promotion" })
  }), env);
  assert.equal(response.status, 400);
  assert.equal(calls.some(call => call.sql.includes("INSERT INTO activation_codes")), false);
});

test("admin issues exactly one activation code bound to the requested student", async () => {
  const calls = [];
  const env = adminEnv(calls);
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/codes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "tahouri_admin_session=test-session" },
    body: JSON.stringify({
      studentId: "student-123",
      gradeId: "grade6",
      academicYear: "1405",
      renewalMode: "promotion"
    })
  }), env);
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.studentId, "student-123");
  assert.equal(body.codes.length, 1);
  const insert = calls.find(call => call.sql.includes("INSERT INTO activation_codes"));
  assert.ok(insert);
  assert.match(insert.sql, /student_id/);
  assert.ok(insert.values.includes("student-123"));
  const audit = calls.find(call => call.sql.includes("INSERT INTO audit_log"));
  assert.ok(audit);
  assert.match(audit.values.at(-1), /student-123/);
  assert.equal(env.batches.length, 1);
  assert.equal(env.batches[0].length, 2);
  assert.match(env.batches[0][0].sql, /INSERT INTO activation_codes/);
  assert.match(env.batches[0][1].sql, /INSERT INTO audit_log/);
});

test("preflight allows same-origin and rejects foreign origin", async () => {
  const good = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/login", {
    method: "OPTIONS", headers: { Origin: "https://api.example.workers.dev" }
  }), {});
  assert.equal(good.status, 204);
  const bad = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/login", {
    method: "OPTIONS", headers: { Origin: "https://evil.example" }
  }), {});
  assert.equal(bad.status, 403);
});

import { signEntitlementClaims } from "./entitlement-crypto.js";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("Worker public-key route and browser verifier complete a signed entitlement round trip", async () => {
  const pair = await crypto.subtle.generateKey({
    name: "RSASSA-PKCS1-v1_5", modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256"
  }, true, ["sign", "verify"]);
  const privatePem = pemFromDer(await crypto.subtle.exportKey("pkcs8", pair.privateKey), "PRIVATE KEY");
  const publicPem = pemFromDer(await crypto.subtle.exportKey("spki", pair.publicKey), "PUBLIC KEY");
  const claims = {
    licenseId: "lic_roundtrip-1", productId: "tahouri-edu", academicYear: "1405",
    gradeScope: "grade6", studentId: "student-roundtrip",
    validFrom: new Date(Date.now() - 60_000).toISOString(),
    validUntil: new Date(Date.now() + 86_400_000).toISOString(),
    installationBinding: "install-roundtrip", entitlementVersion: 1
  };
  const signature = await signEntitlementClaims(privatePem, claims);
  const apiBaseUrl = "https://api.example.workers.dev/api";
  const fetchMock = async (url, init = {}) => worker.fetch(
    new Request(String(url), init),
    { LICENSE_SIGNING_PUBLIC_KEY_PEM: publicPem }
  );
  const window = { crypto, TahouriServiceConfig: {
    mode: "test", apiBaseUrl, productId: "tahouri-edu", entitlementVersion: 1
  } };
  const verifierSource = await readFile(new URL("../../engine/core/tahouriEntitlementVerifier.js", import.meta.url), "utf8");
  runInNewContext(verifierSource, { window, crypto, atob, TextEncoder, fetch: fetchMock, console });
  const envelope = { claims, signature, algorithm: "RSASSA-PKCS1-v1_5-SHA256" };
  const verified = await window.TahouriEntitlementVerifier.verifyEnvelope(envelope);
  assert.equal(verified.valid, true, verified.reason);
  assert.equal(verified.claims.studentId, "student-roundtrip");
  const tampered = { ...envelope, claims: { ...claims, studentId: "student-attacker" } };
  const rejected = await window.TahouriEntitlementVerifier.verifyEnvelope(tampered);
  assert.equal(rejected.valid, false);
  assert.match(rejected.reason, /امضای مجوز معتبر نیست/);
});


function pemFromDer(bytes, label) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${encoded}\n-----END ${label}-----`;
}

test("Worker entitlement signer produces a verifiable RSA-SHA256 signature", async () => {
  const pair = await crypto.subtle.generateKey({
    name: "RSASSA-PKCS1-v1_5", modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256"
  }, true, ["sign", "verify"]);
  const privatePem = pemFromDer(await crypto.subtle.exportKey("pkcs8", pair.privateKey), "PRIVATE KEY");
  const claims = {
    licenseId: "lic_test-1", studentId: "student-123",
    gradeScope: "grade6", academicYear: "1405"
  };
  const signature = await signEntitlementClaims(privatePem, claims);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", pair.publicKey,
    Uint8Array.from(atob(signature), character => character.charCodeAt(0)),
    new TextEncoder().encode(JSON.stringify(claims))
  );
  assert.equal(valid, true);
  const tampered = { ...claims, studentId: "student-other" };
  const tamperedValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", pair.publicKey,
    Uint8Array.from(atob(signature), character => character.charCodeAt(0)),
    new TextEncoder().encode(JSON.stringify(tampered))
  );
  assert.equal(tamperedValid, false);
});

test("Worker entitlement signer fails closed for a missing or malformed key", async () => {
  await assert.rejects(() => signEntitlementClaims("", { licenseId: "lic_test" }));
  await assert.rejects(() => signEntitlementClaims("not-a-private-key", { licenseId: "lic_test" }));
});

test("Worker entitlement signer rejects non-object claims", async () => {
  await assert.rejects(
    () => signEntitlementClaims("-----BEGIN PRIVATE KEY-----\nAA==\n-----END PRIVATE KEY-----", null),
    /claims must be an object/
  );
});

import { activateStudentBoundCode } from "./activation-service.js";

function activationEnv(codeRow, batchResult = [
  { meta: { changes: 1 } }, { meta: { changes: 1 } }, { meta: { changes: 1 } }
]) {
  const batches = [];
  return {
    batches,
    LICENSE_SIGNING_PRIVATE_KEY_PEM: "",
    DB: {
      prepare(sql) {
        let values = [];
        return {
          bind(...args) { values = args; return this; },
          async first() {
            if (sql.includes("FROM activation_codes WHERE code_hash")) return codeRow;
            return null;
          },
          async all() { return { results: [] }; },
          async run() { return { meta: { changes: 1 } }; },
          _sql: sql,
          _values: () => values
        };
      },
      async batch(statements) {
        batches.push(statements.map(statement => ({ sql: statement._sql, values: statement._values() })));
        return batchResult;
      }
    }
  };
}

async function makeTestSigningPem() {
  const pair = await crypto.subtle.generateKey({
    name: "RSASSA-PKCS1-v1_5", modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256"
  }, true, ["sign", "verify"]);
  return pemFromDer(await crypto.subtle.exportKey("pkcs8", pair.privateKey), "PRIVATE KEY");
}

function thisAcademicYear() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran", year: "numeric", month: "numeric"
  }).formatToParts(new Date()).filter(x => x.type !== "literal").map(x => [x.type, Number(x.value)]));
  return String(p.month >= 7 ? p.year : p.year - 1);
}

test("activation rejects a code bound to a different student before any D1 write", async () => {
  const env = activationEnv({
    studentId: "student-A", gradeId: "grade6", academicYear: thisAcademicYear(),
    renewalMode: "promotion", status: "active", usedAt: null, productId: "tahouri-edu"
  });
  await assert.rejects(
    () => activateStudentBoundCode(env, {
      code: "THR-TEST-CODE", gradeId: "grade6", studentId: "student-B",
      installationId: "install-A"
    }),
    error => error.status === 400
  );
  assert.equal(env.batches.length, 0);
});

test("activation rejects legacy unbound and already-consumed codes", async () => {
  const base = {
    gradeId: "grade6", academicYear: thisAcademicYear(), renewalMode: "promotion",
    status: "active", usedAt: null, productId: "tahouri-edu"
  };
  const unbound = activationEnv({ ...base, studentId: null });
  await assert.rejects(() => activateStudentBoundCode(unbound, {
    code: "THR-TEST-CODE", gradeId: "grade6", studentId: "student-A", installationId: "install-A"
  }), error => error.status === 400);
  const used = activationEnv({ ...base, studentId: "student-A", status: "used", usedAt: "2026-01-01" });
  await assert.rejects(() => activateStudentBoundCode(used, {
    code: "THR-TEST-CODE", gradeId: "grade6", studentId: "student-A", installationId: "install-A"
  }), error => error.status === 409);
  assert.equal(unbound.batches.length, 0);
  assert.equal(used.batches.length, 0);
});

test("activation claims code, creates license and audit in one conditional D1 batch", async () => {
  const env = activationEnv({
    studentId: "student-A", gradeId: "grade6", academicYear: thisAcademicYear(),
    renewalMode: "promotion", status: "active", usedAt: null, productId: "tahouri-edu"
  });
  env.LICENSE_SIGNING_PRIVATE_KEY_PEM = await makeTestSigningPem();
  // The signing function is exercised separately by the cryptographic tests;
  // this test focuses on the atomic D1 statement ordering and exact bindings.
  const result = await activateStudentBoundCode(env, {
    code: "THR-TEST-CODE", gradeId: "grade6", studentId: "student-A",
    installationId: "install-A"
  });
  assert.equal(result.valid, true);
  assert.equal(result.entitlement.claims.studentId, "student-A");
  assert.equal(result.entitlement.claims.gradeScope, "grade6");
  assert.equal(env.batches.length, 1);
  const statements = env.batches[0];
  assert.equal(statements.length, 3);
  assert.match(statements[0].sql, /student_id = \?/);
  assert.match(statements[0].sql, /NOT EXISTS[\s\S]*FROM licenses/);
  assert.equal(statements[0].sql.includes("? = 0 OR NOT EXISTS"), false);
  assert.ok(statements[0].values.includes("student-A"));
  assert.match(statements[1].sql, /INSERT INTO licenses/);
  assert.match(statements[2].sql, /INSERT INTO audit_log/);
});

test("activation fails closed when the atomic code claim loses a race", async () => {
  const env = activationEnv({
    studentId: "student-A", gradeId: "grade6", academicYear: thisAcademicYear(),
    renewalMode: "promotion", status: "active", usedAt: null, productId: "tahouri-edu"
  }, [{ meta: { changes: 0 } }, { meta: { changes: 0 } }, { meta: { changes: 0 } }]);
  env.LICENSE_SIGNING_PRIVATE_KEY_PEM = await makeTestSigningPem();
  await assert.rejects(() => activateStudentBoundCode(env, {
    code: "THR-TEST-CODE", gradeId: "grade6", studentId: "student-A",
    installationId: "install-A"
  }), error => error.status === 409);
});


function licenseStatusEnv(license) {
  let captured = null;
  return {
    get captured() { return captured; },
    DB: {
      prepare(sql) {
        let values = [];
        return {
          bind(...args) { values = args; return this; },
          async first() {
            captured = { sql, values };
            return license;
          }
        };
      }
    }
  };
}

test("license status requires the exact student and installation bindings", async () => {
  const env = licenseStatusEnv({
    status: "active", studentId: "student-A", installationBinding: "install-A",
    validFrom: new Date(Date.now() - 60_000).toISOString(),
    validUntil: new Date(Date.now() + 60_000).toISOString()
  });
  const url = "https://api.example.workers.dev/api/licenses/status?licenseId=lic_A&studentId=student-A&installationId=install-A";
  const response = await worker.fetch(new Request(url), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.valid, true);
  assert.equal(body.status, "active");
  assert.deepEqual(env.captured.values, ["lic_A", "tahouri-edu"]);
});

test("license status does not disclose a license to a different student or installation", async () => {
  for (const query of [
    "licenseId=lic_A&studentId=student-B&installationId=install-A",
    "licenseId=lic_A&studentId=student-A&installationId=install-B"
  ]) {
    const env = licenseStatusEnv({
      status: "active", studentId: "student-A", installationBinding: "install-A",
      validFrom: new Date(Date.now() - 60_000).toISOString(),
      validUntil: new Date(Date.now() + 60_000).toISOString()
    });
    const response = await worker.fetch(new Request(
      "https://api.example.workers.dev/api/licenses/status?" + query
    ), env);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.valid, false);
    assert.equal(body.reason, "not_found");
  }
});

test("license status reports revoked licenses as invalid", async () => {
  const env = licenseStatusEnv({
    status: "revoked", studentId: "student-A", installationBinding: "install-A",
    validFrom: new Date(Date.now() - 60_000).toISOString(),
    validUntil: new Date(Date.now() + 60_000).toISOString()
  });
  const response = await worker.fetch(new Request(
    "https://api.example.workers.dev/api/licenses/status?licenseId=lic_A&studentId=student-A&installationId=install-A"
  ), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.valid, false);
  assert.equal(body.status, "revoked");
});

test("administrator can revoke a future-reserved license", async () => {
  const calls = [];
  const env = adminEnv(calls);
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/licenses/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "tahouri_admin_session=test-session" },
    body: JSON.stringify({ licenseId: "lic_future_A" })
  }), env);
  assert.equal(response.status, 200);
  const update = calls.find(call => call.sql.includes("UPDATE licenses"));
  assert.ok(update);
  assert.ok(update.sql.includes("status IN ('active', 'future')"));
  assert.equal(env.batches.length, 1);
  assert.equal(env.batches[0].length, 2);
  assert.match(env.batches[0][0].sql, /INSERT INTO audit_log/);
  assert.match(env.batches[0][1].sql, /UPDATE licenses/);
});



test("admin code revocation writes audit and status in one D1 batch", async () => {
  const calls = [];
  const env = adminEnv(calls);
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/codes/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "tahouri_admin_session=test-session" },
    body: JSON.stringify({ code: "THR-GRADE6-1405-TESTCODE" })
  }), env);
  assert.equal(response.status, 200);
  assert.equal(env.batches.length, 1);
  assert.equal(env.batches[0].length, 2);
  assert.match(env.batches[0][0].sql, /INSERT INTO audit_log/);
  assert.match(env.batches[0][1].sql, /UPDATE activation_codes/);
});

test("admin revocation immediately invalidates the same bound entitlement status", async () => {
  const license = {
    status: "active",
    studentId: "student-lifecycle",
    installationBinding: "install-lifecycle",
    validFrom: new Date(Date.now() - 60_000).toISOString(),
    validUntil: new Date(Date.now() + 60_000).toISOString()
  };
  const env = {
    DB: {
      prepare(sql) {
        let values = [];
        return {
          bind(...args) { values = args; return this; },
          async first() {
            if (sql.includes("SELECT expires_at FROM admin_sessions")) {
              return { expires_at: Date.now() + 60_000 };
            }
            if (sql.includes("FROM licenses") && sql.includes("WHERE license_id = ?")) {
              return { ...license };
            }
            return null;
          },
          async run() {
            if (sql.includes("UPDATE licenses SET status = 'revoked'")) {
              license.status = "revoked";
            }
            return { meta: { changes: 1 } };
          }
        };
      },
      async batch(statements) {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        return results;
      }
    }
  };

  const revoke = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/licenses/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "tahouri_admin_session=test-session" },
    body: JSON.stringify({ licenseId: "lic_lifecycle" })
  }), env);
  assert.equal(revoke.status, 200);

  const status = await worker.fetch(new Request(
    "https://api.example.workers.dev/api/licenses/status?licenseId=lic_lifecycle&studentId=student-lifecycle&installationId=install-lifecycle"
  ), env);
  const body = await status.json();
  assert.equal(status.status, 200);
  assert.equal(body.valid, false);
  assert.equal(body.status, "revoked");
});


test("expired admin session is rejected and removed from D1", async () => {
  const calls = [];
  const env = {
    DB: {
      prepare(sql) {
        let values = [];
        return {
          bind(...args) { values = args; return this; },
          async first() {
            if (sql.includes("SELECT expires_at FROM admin_sessions")) return { expires_at: Date.now() - 1 };
            return null;
          },
          async run() { calls.push({ sql, values }); return { meta: { changes: 1 } }; },
          async all() { return { results: [] }; }
        };
      }
    }
  };
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/licenses", {
    headers: { Cookie: "tahouri_admin_session=expired-session" }
  }), env);
  assert.equal(response.status, 401);
  assert.ok(calls.some(call => call.sql.includes("DELETE FROM admin_sessions")));
});

test("admin mutation is rejected when no session cookie is supplied", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/licenses/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ licenseId: "lic_no_session" })
  }), adminEnv(calls));
  assert.equal(response.status, 401);
  assert.equal(calls.some(call => call.sql.includes("UPDATE licenses SET status = 'revoked'")), false);
});


test("admin login locks after five failed attempts within one minute", async () => {
  const state = { attempts: 0, window_started_at: Date.now(), locked_until: 0 };
  const calls = [];
  const env = {
    ADMIN_PASSWORD: "test-password-that-is-long-enough",
    DB: {
      prepare(sql) {
        let values = [];
        return {
          bind(...args) { values = args; return this; },
          async first() {
            if (sql.includes("SELECT attempts, window_started_at, locked_until FROM admin_login_attempts")) {
              return state.attempts ? { ...state } : null;
            }
            if (sql.includes("SELECT attempts, locked_until FROM admin_login_attempts")) {
              return { attempts: state.attempts, locked_until: state.locked_until };
            }
            return null;
          },
          async run() {
            calls.push({ sql, values });
            if (sql.includes("INSERT INTO admin_login_attempts")) {
              const now = values[1];
              if (now - state.window_started_at >= 60_000) {
                state.attempts = 1;
                state.window_started_at = now;
              } else {
                state.attempts += 1;
              }
              if (state.attempts >= 5 && now - state.window_started_at < 60_000) {
                state.locked_until = now + 900_000;
              }
            }
            return { meta: { changes: 1 } };
          },
          async all() { return { results: [] }; }
        };
      }
    }
  };
  for (let i = 0; i < 4; i++) {
    const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong-password" })
    }), env);
    assert.equal(response.status, 401);
  }
  const fifth = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong-password" })
  }), env);
  assert.equal(fifth.status, 429);
  assert.ok(state.locked_until > Date.now());
  const sixth = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test-password-that-is-long-enough" })
  }), env);
  assert.equal(sixth.status, 429);
});


test("worker route activates a student-bound code, returns a signed entitlement, and rejects replay", async () => {
  const keyPair = await crypto.subtle.generateKey({
    name: "RSASSA-PKCS1-v1_5", modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256"
  }, true, ["sign", "verify"]);
  const privatePem = pemFromDer(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey), "PRIVATE KEY");
  const publicPem = pemFromDer(await crypto.subtle.exportKey("spki", keyPair.publicKey), "PUBLIC KEY");
  const currentYear = thisAcademicYear();
  const codeRow = {
    studentId: "route-student", gradeId: "grade6", academicYear: currentYear,
    renewalMode: "promotion", status: "active", usedAt: null, productId: "tahouri-edu"
  };
  let batchCalls = 0;
  const env = {
    LICENSE_SIGNING_PRIVATE_KEY_PEM: privatePem,
    DB: {
      prepare(sql) {
        let values = [];
        return {
          bind(...args) { values = args; return this; },
          async first() {
            if (sql.includes("schema_migrations")) return { version: 3 };
            if (sql.includes("FROM activation_codes WHERE code_hash")) return codeRow;
            return null;
          },
          async all() { return { results: [] }; },
          async run() { return { meta: { changes: 1 } }; },
          _sql: sql,
          _values: () => values
        };
      },
      async batch() {
        batchCalls++;
        const changes = batchCalls === 1 ? 1 : 0;
        return [{ meta: { changes } }, { meta: { changes } }, { meta: { changes } }];
      }
    }
  };
  const body = {
    code: "THR-ROUTE-TEST", gradeId: "grade6", studentId: "route-student",
    installationId: "route-installation"
  };
  const first = await worker.fetch(new Request("https://api.example.workers.dev/api/activate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  }), env);
  const activation = await first.json();
  assert.equal(first.status, 200);
  assert.equal(activation.valid, true);
  assert.equal(activation.entitlement.claims.studentId, "route-student");
  assert.equal(activation.entitlement.claims.gradeScope, "grade6");
  assert.equal(activation.entitlement.algorithm, "RSASSA-PKCS1-v1_5-SHA256");
  const publicKey = await crypto.subtle.importKey(
    "spki",
    Uint8Array.from(atob(publicPem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), c => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const signature = Uint8Array.from(atob(activation.entitlement.signature), c => c.charCodeAt(0));
  const payload = new TextEncoder().encode(JSON.stringify(activation.entitlement.claims));
  assert.equal(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, payload), true);
  const tamperedClaims = { ...activation.entitlement.claims, studentId: "attacker-student" };
  assert.equal(await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", publicKey, signature, new TextEncoder().encode(JSON.stringify(tamperedClaims))
  ), false);
  const replay = await worker.fetch(new Request("https://api.example.workers.dev/api/activate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  }), env);
  assert.equal(replay.status, 409);
  assert.equal(batchCalls, 2);
});

test("admin refuses to issue a code when the student account is missing or grade-mismatched", async () => {
  for (const studentRecord of [null, { student_id: "student-123", grade_id: "grade5", status: "active" }]) {
    const calls = [];
    const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "tahouri_admin_session=test-session" },
      body: JSON.stringify({ studentId: "student-123", gradeId: "grade6", academicYear: "1405", renewalMode: "promotion" })
    }), adminEnv(calls, studentRecord));
    assert.equal(response.status, 409);
    assert.equal(calls.some(call => call.sql.includes("INSERT INTO activation_codes")), false);
    assert.equal(calls.some(call => call.sql.includes("INSERT INTO audit_log")), false);
  }
});

test("student registry listing rejects requests without an admin session", async () => {
  const response = await worker.fetch(new Request("https://api.example.workers.dev/api/admin/students"), adminEnv([]));
  assert.equal(response.status, 401);
});
