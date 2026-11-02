import test from "node:test";
import assert from "node:assert/strict";
import { ensurePrimaryStudentProfile } from "./student-profile-service.js";

function envFixture({ account = true, existing = null } = {}) {
  const calls = [];
  const batches = [];
  const env = {
    DB: {
      prepare(sql) {
        let values = [];
        return {
          bind(...args) { values = args; return this; },
          async first() {
            calls.push({ sql, values });
            if (sql.includes("FROM student_accounts")) {
              return account ? { studentId: "account-A" } : null;
            }
            if (sql.includes("FROM student_profiles")) return existing;
            return null;
          }
        };
      },
      async batch(statements) {
        batches.push(statements.map(s => ({ sql: s._sql, values: s._values() })));
        return [{ meta: { changes: 1 } }, { meta: { changes: 1 } }];
      }
    }
  };
  const originalPrepare = env.DB.prepare.bind(env.DB);
  env.DB.prepare = sql => {
    const statement = originalPrepare(sql);
    const bind = statement.bind.bind(statement);
    statement.bind = (...args) => {
      statement._sql = sql;
      statement._values = () => args;
      return bind(...args);
    };
    return statement;
  };
  return { env, calls, batches };
}

test("primary profile provisioning creates profile and audit atomically", async () => {
  const { env, batches } = envFixture();
  const result = await ensurePrimaryStudentProfile(env, "account-A");
  assert.equal(result.accountId, "account-A");
  assert.equal(result.created, true);
  assert.match(result.profileId, /^prof_[0-9a-f-]{36}$/);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 2);
  assert.match(batches[0][0].sql, /INSERT INTO student_profiles/);
  assert.match(batches[0][0].sql, /NOT EXISTS/);
  assert.equal(batches[0][0].values[3], "account-A");
  assert.match(batches[0][1].sql, /student\.profile\.created/);
  assert.equal(batches[0][1].values[2], result.profileId);
});

test("primary profile provisioning returns an existing primary profile without writes", async () => {
  const { env, batches } = envFixture({
    existing: { profileId: "prof_existing_primary" }
  });
  const result = await ensurePrimaryStudentProfile(env, "account-A");
  assert.deepEqual(result, {
    profileId: "prof_existing_primary",
    accountId: "account-A",
    created: false
  });
  assert.equal(batches.length, 0);
});

test("primary profile provisioning rejects an inactive or missing account", async () => {
  const { env, batches } = envFixture({ account: false });
  await assert.rejects(
    () => ensurePrimaryStudentProfile(env, "account-A"),
    error => error.status === 409
  );
  assert.equal(batches.length, 0);
});

test("primary profile provisioning validates account identifiers", async () => {
  const { env, batches } = envFixture();
  await assert.rejects(
    () => ensurePrimaryStudentProfile(env, "bad account id"),
    error => error.status === 400
  );
  assert.equal(batches.length, 0);
});
