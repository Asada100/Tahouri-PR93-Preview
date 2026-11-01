// =====================================
// Tahouri Edu Platform
// License History Manager v1.0
// =====================================
//
// هدف:
// - مجوز فعال فقط برای سال تحصیلی جاری معتبر است.
// - سوابق مجوزهای سال‌های قبل حذف نمی‌شوند.
// - سابقه برای گزارش‌ها و بررسی تاریخچه قابل دسترسی است.
//
// این فایل عمداً از LicenseManager جداست تا منطق
// فعال‌سازی فعلی تغییر نکند.
// =====================================

(function () {

    "use strict";

    const LICENSE_STORAGE_KEY =
        "Tahouri_Activation_Licenses";

    const HISTORY_STORAGE_KEY =
        "Tahouri_License_History";


    function loadArray(key) {

        try {

            const raw =
                localStorage.getItem(key);

            if (!raw) {
                return [];
            }

            const data =
                JSON.parse(raw);

            return Array.isArray(data)
                ? data
                : [];

        }
        catch (error) {

            console.error(
                "License History Manager: Load failed.",
                error
            );

            return [];
        }
    }


    function saveArray(key, data) {

        try {

            localStorage.setItem(
                key,
                JSON.stringify(data)
            );

            return true;

        }
        catch (error) {

            console.error(
                "License History Manager: Save failed.",
                error
            );

            return false;
        }
    }


    function getIdentity(license) {

        if (!license) {
            return "";
        }

        return [
            license.id || "",
            license.code || "",
            license.studentId || "",
            license.gradeId || "",
            license.academicYear || ""
        ].join("|");
    }


    function sync() {

        const currentLicenses =
            loadArray(LICENSE_STORAGE_KEY);

        const history =
            loadArray(HISTORY_STORAGE_KEY);

        const known =
            new Set(
                history.map(getIdentity)
            );

        let changed = false;

        currentLicenses.forEach(
            function (license) {

                if (!license) {
                    return;
                }

                const identity =
                    getIdentity(license);

                if (!identity || known.has(identity)) {
                    return;
                }

                history.push({
                    ...license,
                    historySavedAt:
                        new Date().toISOString()
                });

                known.add(identity);
                changed = true;
            }
        );

        if (changed) {
            saveArray(
                HISTORY_STORAGE_KEY,
                history
            );
        }

        return history;
    }


    function getAll() {
        return sync().slice();
    }


    function getForProfile(studentId) {

        const normalized =
            String(studentId || "").trim();

        if (!normalized) {
            return [];
        }

        return getAll().filter(
            function (license) {
                return String(
                    license.studentId || ""
                ).trim() === normalized;
            }
        );
    }


    function getForGrade(gradeId) {

        if (!gradeId) {
            return [];
        }

        return getAll().filter(
            function (license) {
                return license.gradeId === gradeId;
            }
        );
    }


    const api = {
        sync: sync,
        getAll: getAll,
        getForProfile: getForProfile,
        getForGrade: getForGrade
    };


    window.LicenseHistoryManager =
        api;


    // این اجرا باید قبل از اولین استفاده از LicenseManager
    // انجام شود تا سوابق قبل از cleanup سالانه حفظ شوند.
    sync();

    console.log(
        "License History Manager v1.0 Ready"
    );

})();
