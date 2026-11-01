// =====================================
// Tahouri Update Manager
// Version 1.0
// Offline-safe / non-blocking
// =====================================

(function () {
    "use strict";

    const STORAGE_KEY = "Tahouri_Update_Later_v1";

    function getConfig() {
        return window.TahouriServiceConfig || {};
    }

    function isOnline() {
        return typeof navigator === "undefined" || navigator.onLine !== false;
    }

    async function check() {
        const cfg = getConfig();
        const url = cfg.updateManifestUrl;

        if (!url || !isOnline()) return null;

        try {
            const response = await fetch(url, {
                method: "GET",
                cache: "no-store",
                headers: { "Accept": "application/json" }
            });

            if (!response.ok) return null;

            const manifest = await response.json();

            if (!manifest || manifest.productId !== cfg.productId) return null;

            return {
                available: String(manifest.version || "") !== String(cfg.appVersion || ""),
                manifest: manifest
            };
        } catch (error) {
            console.warn("Tahouri Update Manager: Check skipped.", error);
            return null;
        }
    }

    function dismiss(version) {
        try {
            localStorage.setItem(STORAGE_KEY, String(version || ""));
        } catch (error) {}
    }

    function wasDismissed(version) {
        try {
            return localStorage.getItem(STORAGE_KEY) === String(version || "");
        } catch (error) {
            return false;
        }
    }

    function renderHomeNotice(result) {
        if (!result || !result.available || !result.manifest) return;

        const manifest = result.manifest;

        if (wasDismissed(manifest.version)) return;

        const home = document.querySelector("#app > .screen");
        if (!home || document.getElementById("tahouriUpdateNotice")) return;

        const notice = document.createElement("div");
        notice.id = "tahouriUpdateNotice";
        notice.className = "tahouri-update-notice";
        notice.innerHTML = `
            <div class="tahouri-update-moving">
                <span>✨ نسخه جدید طهوری آماده است: ${escapeHtml(manifest.version)}</span>
            </div>
            <p class="tahouri-update-text">
                یک به‌روزرسانی جدید برای پلتفرم آموزشی طهوری در دسترس است.
            </p>
            <div class="tahouri-update-actions">
                <button id="tahouriUpdateNow" type="button">به‌روزرسانی</button>
                <button id="tahouriUpdateLater" type="button">بعداً</button>
            </div>
        `;

        const daily = home.querySelector(".daily-message-home");
        const buttons = home.querySelector(".home-buttons");

        if (daily) daily.insertAdjacentElement("afterend", notice);
        else if (buttons) buttons.insertAdjacentElement("beforebegin", notice);
        else home.appendChild(notice);

        const later = notice.querySelector("#tahouriUpdateLater");
        const now = notice.querySelector("#tahouriUpdateNow");

        later.onclick = function () {
            dismiss(manifest.version);
            notice.remove();
        };

        now.onclick = function () {
            beginUpdate(manifest, notice);
        };
    }

    function beginUpdate(manifest, notice) {
        const url = String(manifest.packageUrl || "").trim();

        if (!url) {
            showUpdateMessage(notice, "بسته به‌روزرسانی هنوز برای این نسخه منتشر نشده است.");
            return;
        }

        const button = notice.querySelector("#tahouriUpdateNow");
        if (button) {
            button.disabled = true;
            button.textContent = "در حال آماده‌سازی...";
        }

        // Browser/web fallback: open the signed release/package URL.
        // Native APK/EXE adapters can replace this operation later.
        try {
            window.open(url, "_blank", "noopener,noreferrer");
            showUpdateMessage(
                notice,
                "صفحه به‌روزرسانی باز شد. پس از نصب، طهوری را دوباره اجرا کنید."
            );
        } catch (error) {
            showUpdateMessage(notice, "امکان شروع به‌روزرسانی وجود نداشت.");
        }
    }

    function showUpdateMessage(notice, message) {
        if (!notice) return;
        const text = notice.querySelector(".tahouri-update-text");
        if (text) text.textContent = message;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function checkHome() {
        const result = await check();
        renderHomeNotice(result);
        return result;
    }

    window.TahouriUpdateManager = {
        check,
        checkHome,
        renderHomeNotice,
        dismiss
    };

    console.log("Tahouri Update Manager v1.0 Ready");
})();