"use strict";

const base = process.env.TAHOURI_RELEASE_API || "https://api.example.com";

async function check(path, expectedStatus = 200) {
    const response = await fetch(base + path, { redirect: "manual" });
    if (response.status !== expectedStatus) {
        throw new Error(path + " -> HTTP " + response.status + " (expected " + expectedStatus + ")");
    }
    return response;
}

async function main() {
    const live = await check("/api/live");
    const liveData = await live.json();
    if (liveData.live !== true) throw new Error("Live endpoint is not healthy.");

    const ready = await check("/api/ready");
    const readyData = await ready.json();
    if (readyData.ready !== true) throw new Error("Ready endpoint is not ready.");

    const health = await check("/api/health");
    const healthData = await health.json();
    if (healthData.ok !== true) throw new Error("Health endpoint is not healthy.");

    const publicKey = await check("/api/public-key");
    const publicKeyData = await publicKey.json();
    if (!publicKeyData.publicKeyPem) throw new Error("Public signing key is unavailable.");

    const securityHeaders = [
        ["x-content-type-options", "nosniff"],
        ["x-frame-options", "DENY"],
        ["referrer-policy", "no-referrer"]
    ];

    for (const [name, expected] of securityHeaders) {
        if (publicKey.headers.get(name) !== expected) {
            throw new Error("Security header mismatch: " + name);
        }
    }

    console.log("Tahouri License API release smoke test: PASS");
}

main().catch(error => {
    console.error("Tahouri License API release smoke test: FAIL");
    console.error(error.message);
    process.exit(1);
});
