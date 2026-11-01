// =====================================
// Tahouri Service Configuration
// Version 1.1
// =====================================
// Central configuration only.
// No secret belongs in this file.

(function () {
    "use strict";

    const CONFIG = {
        enabled: true,
        mode: "test",
        apiBaseUrl: "https://tahouri-license-api-pr93-e2e.asadtahouri1986.workers.dev/api",
        requestTimeoutMs: 8000,
        appVersion: "5.1.0",
        updateManifestUrl: "",
        productId: "tahouri-edu",
        entitlementVersion: 1,

        // Production: pin the real public key here.
        // Isolated test mode obtains the public key
        // from the separately deployed test Worker.
        publicKeyPem: ""
    };

    window.TahouriServiceConfig = Object.freeze(CONFIG);

    console.log("Tahouri Service Config v1.1 Ready");
})();