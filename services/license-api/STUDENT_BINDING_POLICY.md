# Student-bound activation code policy

Date: 2026-10-30

## Decision

Every newly issued activation code is issued for exactly one existing Tahouri student profile. The administrator must supply that profile's exact `studentId`; bulk code creation is intentionally disabled so one code cannot accidentally be distributed across multiple students.

The Worker stores the binding in `activation_codes.student_id`. The full activation code is returned once at creation time; listings show only its preview and the bound student ID.

## Implemented Worker behavior

The Cloudflare Worker currently exposes:

- `POST /api/activate`: hashes the submitted code on the server, rejects legacy unbound codes, checks the exact student and grade binding, checks academic-year and renewal constraints, signs the entitlement, and batches code consumption, license creation, and audit insertion through D1.
- `GET /api/licenses/status`: requires the exact license ID, student ID, and installation ID; it does not disclose a license to a different student or installation.
- `GET /api/public-key`: returns the configured public verification key when available.

The activation route requires schema migration version 3 and the `LICENSE_SIGNING_PRIVATE_KEY_PEM` Worker secret. It is not usable until those prerequisites are present in the target environment.

## Validation still required

The current automated tests cover student mismatch, legacy unbound codes, consumed codes, conditional D1 batch statements, a simulated lost claim race, signature verification/tamper rejection, and bound license-status lookup.

Before Production activation is enabled, add and run isolated-D1 end-to-end tests for:

1. Two concurrent requests attempting to consume the same code.
2. Failures at each write boundary, proving no partially consumed code or orphan license remains.
3. Current-year activation and next-year promotion/repeat reservation against realistic existing license rows.
4. A full Worker-to-client entitlement verification round trip using the production client verifier.

The isolated test configuration is `wrangler.test.jsonc`; run `npm run test:config` before any test command that invokes Wrangler. Never use the Production configuration for tests.

## Existing codes

Migration 0003 adds a nullable `student_id` column. Existing codes remain visible to administrators, but they are explicitly unbound and must be rejected by the activation route. Administrators must issue new student-bound codes for students who have not yet activated.

## Security boundary

A student ID is an identifier, not a password or proof of a real-world identity. The per-student activation code is a bearer credential: whoever obtains it first may attempt to claim the bound profile. The code must therefore be delivered privately to the intended student's parent/guardian or school contact.

This policy prevents one issued code from being used for a different student ID. It does NOT by itself prevent someone who has both the intended student ID and a stolen activation code from claiming it, nor does it provide hardware-backed device identity. Stronger identity assurance requires a separate parent/school verification channel. Do not describe this feature as full identity authentication.

## Operational constraints

- New codes are issued one at a time and tied to a non-empty student ID.
- Admin code listings and search results expose the bound student ID but never the full code.
- The full code is shown only in the immediate creation response; store/deliver it securely.
- Do not apply migration 0003 to Production or deploy the Worker as part of this PR.
- The test configuration must continue to reference only the isolated D1 database.
