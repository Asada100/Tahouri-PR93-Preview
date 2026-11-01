// =====================================
// Tahouri Signed Entitlement Verifier
// Version 1.3
// RSA-SHA256 / Web Crypto
// =====================================

(function () {
    "use strict";

    let importedKeyPromise = null;

    function pemToArrayBuffer(pem) {
        const base64 = pem
            .replace(/-----BEGIN PUBLIC KEY-----/g, "")
            .replace(/-----END PUBLIC KEY-----/g, "")
            .replace(/\s+/g, "");

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes.buffer;
    }

    async function getPublicKeyPem() {
        const config = window.TahouriServiceConfig;

        if (!config) throw new Error("Tahouri service configuration is unavailable.");

        if (config.publicKeyPem) return config.publicKeyPem;

        if (config.mode !== "test") {
            throw new Error("Production public key is not configured.");
        }

        const response = await fetch(config.apiBaseUrl + "/public-key", {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Development public key could not be loaded.");
        }

        const payload = await response.json();

        if (!payload || !payload.publicKeyPem) {
            throw new Error("Development public key is missing.");
        }

        return payload.publicKeyPem;
    }

    function getPublicKey() {
        if (importedKeyPromise) return importedKeyPromise;

        if (!window.crypto?.subtle) {
            return Promise.reject(new Error("Web Crypto یا کلید عمومی در دسترس نیست."));
        }

        importedKeyPromise = getPublicKeyPem().then(publicKeyPem =>
            crypto.subtle.importKey(
                "spki",
                pemToArrayBuffer(publicKeyPem),
                { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                false,
                ["verify"]
            )
        );

        return importedKeyPromise;
    }

    function canonicalizeClaims(claims) {
        return JSON.stringify(claims);
    }

    function base64ToBytes(value) {
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    }

    async function verifyEnvelope(envelope, options) {
        options = options || {};
        const allowFuture = options.allowFuture === true;
        if (!envelope || !envelope.claims || !envelope.signature) {
            return { valid: false, reason: "ساختار مجوز ناقص است." };
        }

        try {
            const key = await getPublicKey();
            const data = new TextEncoder().encode(canonicalizeClaims(envelope.claims));

            const valid = await crypto.subtle.verify(
                { name: "RSASSA-PKCS1-v1_5" },
                key,
                base64ToBytes(envelope.signature),
                data
            );

            if (!valid) return { valid: false, reason: "امضای مجوز معتبر نیست." };

            const claims = envelope.claims;
            const config = window.TahouriServiceConfig || {};

            if (claims.productId !== config.productId) {
                return { valid: false, reason: "مجوز مربوط به این محصول نیست." };
            }

            if (Number(claims.entitlementVersion) !== Number(config.entitlementVersion)) {
                return { valid: false, reason: "نسخه مجوز پشتیبانی نمی‌شود." };
            }

            if (!claims.licenseId || !claims.validFrom || !claims.validUntil || !claims.academicYear || !claims.studentId) {
                return { valid: false, reason: "اطلاعات مجوز کامل نیست." };
            }

            const validFrom = new Date(claims.validFrom);
            const validUntil = new Date(claims.validUntil);

            if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime())) {
                return { valid: false, reason: "تاریخ اعتبار مجوز معتبر نیست." };
            }

            const now = Date.now();

            if (now < validFrom.getTime()) {
                if (!allowFuture) {
                    return { valid: false, reason: "زمان شروع مجوز هنوز نرسیده است." };
                }
            }

            if (now >= validUntil.getTime()) {
                return { valid: false, reason: "مجوز منقضی شده است." };
            }

            return { valid: true, claims };
        } catch (error) {
            console.error("EntitlementVerifier: Verification failed.", error);
            return { valid: false, reason: "اعتبارسنجی رمزنگاری مجوز انجام نشد." };
        }
    }

    window.TahouriEntitlementVerifier = { verifyEnvelope };

    console.log("Tahouri Entitlement Verifier v1.3 Ready");
})();