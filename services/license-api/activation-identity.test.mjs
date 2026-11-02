import test from "node:test";
import assert from "node:assert/strict";
import { activateStudentBoundCode } from "./activation-service.js";

const year = (() => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran", year: "numeric", month: "numeric"
  }).formatToParts(new Date()).filter(x => x.type !== "literal").map(x => [x.type, Number(x.value)]));
  return String(p.month >= 7 ? p.year : p.year - 1);
})();

function identityEnv({ codeStatus = "active", profile = null, account = null, replay = null } = {}) {
  const calls = [];
  const batches = [];
  const code = {
    studentId: "account-A", gradeId: "grade6", academicYear: year,
    renewalMode: "promotion", status: codeStatus,
    usedAt: codeStatus === "active" ? null : "2026-11-01T00:00:00.000Z",
    productId: "tahouri-edu"
  };
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() {
          calls.push({ sql, values });
          if (sql.includes("FROM activation_codes WHERE code_hash")) return code;
          if (sql.includes("FROM activation_requests")) return replay;
          if (sql.includes("FROM student_profiles")) return profile;
          if (sql.includes("FROM student_accounts")) return account;
          return null;
        },
        async run() { return { meta: { changes: 1 } }; },
        _sql: sql, _values: () => values
      };
    },
    async batch(statements) {
      batches.push(statements.map(s => ({ sql: s._sql, values: s._values() })));
      return statements.map(() => ({ meta: { changes: 1 } }));
    }
  };
  return { DB, calls, batches, LICENSE_SIGNING_PRIVATE_KEY_PEM: "" };
}

const request = {
  code: "THR-IDENTITY-TEST", gradeId: "grade6", studentId: "account-A",
  installationId: "install-A", profileId: "profile-A", idempotencyKey: "idem-key-00000001"
};

test("identity activation requires profileId and idempotencyKey together", async () => {
  const env = identityEnv();
  await assert.rejects(
    () => activateStudentBoundCode(env, { ...request, idempotencyKey: undefined }),
    error => error.status === 400
  );
  assert.equal(env.batches.length, 0);
});

test("identity activation rejects a profile not owned by the code-bound account", async () => {
  const env = identityEnv({
    profile: { profileId: "profile-A", accountId: "account-B", status: "active" },
    account: { studentId: "account-A", status: "active" }
  });
  await assert.rejects(
    () => activateStudentBoundCode(env, request),
    error => error.status === 409
  );
  assert.equal(env.batches.length, 0);
});

test("identity activation rejects archived profiles and inactive accounts", async () => {
  for (const state of [
    { profile: { profileId: "profile-A", accountId: "account-A", status: "archived" },
      account: { studentId: "account-A", status: "active" } },
    { profile: { profileId: "profile-A", accountId: "account-A", status: "active" },
      account: { studentId: "account-A", status: "archived" } }
  ]) {
    const env = identityEnv(state);
    await assert.rejects(
      () => activateStudentBoundCode(env, request),
      error => error.status === 409
    );
    assert.equal(env.batches.length, 0);
  }
});

test("legacy activation remains available when identity fields are both absent", async () => {
  const env = identityEnv();
  // The legacy route must not require student_profiles or activation_requests.
  await assert.rejects(
    () => activateStudentBoundCode(env, {
      code: request.code, gradeId: request.gradeId,
      studentId: request.studentId, installationId: request.installationId
    }),
    error => error.status === 503 || error.status === 409
  );
  assert.equal(env.calls.some(x => x.sql.includes("FROM student_profiles")), false);
});
