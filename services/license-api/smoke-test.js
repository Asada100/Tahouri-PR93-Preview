"use strict";

const base = process.env.TAHOURI_TEST_API || "http://127.0.0.1:8787";

async function request(path, options) {
    const response = await fetch(base + path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(path + " -> HTTP " + response.status);
    return data;
}

async function main() {
    const live = await request("/api/live");
    if (!live.live) throw new Error("Liveness check failed.");

    const health = await request("/api/health");
    if (!health.ok) throw new Error("Health check failed.");

    const publicKey = await request("/api/public-key");
    if (!publicKey.publicKeyPem) throw new Error("Public key endpoint failed.");

    const adminSession = await request("/api/admin/session");

    const metricsResponse = await fetch(base + "/api/metrics");
    if (metricsResponse.status !== 401) throw new Error("Metrics endpoint must reject unauthenticated access.");

    const ready = await request("/api/ready");
    if (ready.ready !== true) throw new Error("Readiness check failed.");
    if (typeof adminSession.ok !== "boolean") throw new Error("Admin session endpoint failed.");

    const callback = await request("/api/payments/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: "nonexistent-smoke-test", authority: "smoke", status: "verified" })
    }).catch(error => ({ error }));
    if (!callback.error || !String(callback.error.message).includes("HTTP 404")) {
        throw new Error("Payment callback negative-path test failed.");
    }

    console.log("Tahouri License API smoke test: PASS");
}

main().catch(error => {
    console.error("Tahouri License API smoke test: FAIL");
    console.error(error.message);
    process.exit(1);
});
