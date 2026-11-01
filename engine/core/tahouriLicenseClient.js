// =====================================
// Tahouri License Client
// Version 1.0
// =====================================

(function () {
    "use strict";

    function config() {
        return window.TahouriServiceConfig || {};
    }

    async function request(path, options) {
        const cfg = config();

        if (!cfg.enabled) {
            throw new Error("سرویس مجوز غیرفعال است.");
        }

        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            Number(cfg.requestTimeoutMs) || 8000
        );

        try {
            const response = await fetch(
                String(cfg.apiBaseUrl).replace(/\/$/, "") + path,
                {
                    ...(options || {}),
                    signal: controller.signal,
                    headers: {
                        "Content-Type": "application/json",
                        ...((options && options.headers) || {})
                    }
                }
            );

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    body.message || "خطا در ارتباط با سرویس مجوز."
                );
            }

            return body;
        } finally {
            clearTimeout(timeout);
        }
    }

    async function activate(payload) {
        return request("/activate", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    async function health() {
        return request("/health", { method: "GET" });
    }

    async function status(licenseId, studentId, installationId) {
        const values = {
            licenseId: String(licenseId || "").trim(),
            studentId: String(studentId || "").trim(),
            installationId: String(installationId || "").trim()
        };
        if (!values.licenseId || !values.studentId || !values.installationId) {
            throw new Error("اطلاعات اتصال مجوز کامل نیست.");
        }
        const query = new URLSearchParams(values);
        return request("/licenses/status?" + query.toString(), {
            method: "GET"
        });
    }

    window.TahouriLicenseClient = {
        activate,
        health,
        status
    };

    console.log("Tahouri License Client v1.0 Ready");
})();