// =====================================
// Tahouri Edu Platform
// License Manager
// Version 2.1
// =====================================
//
// License Binding:
// studentId + gradeId + academicYear
//
// هر کد فعال‌سازی فقط به یک پروفایل
// در یک پایه و یک سال تحصیلی متصل می‌شود.
// =====================================

(function () {

    "use strict";


    // =====================================
    // Configuration
    // =====================================

    const STORAGE_KEY =
        "Tahouri_Activation_Licenses";


    // =====================================
    // Grades
    // =====================================

    let verifiedRemoteEntitlement = null;


    const GRADES = {

        grade1: "پایه اول",
        grade2: "پایه دوم",
        grade3: "پایه سوم",
        grade4: "پایه چهارم",
        grade5: "پایه پنجم",
        grade6: "پایه ششم"

    };


    // =====================================
    // Demo Codes
    // =====================================
    //
    // فقط برای تست داخلی پروژه.
    //
    // هر کد می‌تواند فقط یک بار به یک
    // studentId متصل شود.
    //
    // در نسخه نهایی عمومی نباید کدهای
    // واقعی داخل فایل JavaScript قرار بگیرند.
    //
    // =====================================

    const DEMO_CODES = {

        "GRADE1-1405-TEST": "grade1",

        "GRADE2-1405-TEST": "grade2",

        "GRADE3-1405-TEST": "grade3",

        "GRADE4-1405-TEST": "grade4",

        "GRADE5-1405-TEST": "grade5",

        // ---------------------------------
        // Grade 6 Test Codes
        // ---------------------------------

        "GRADE6-1405-TEST": "grade6",

        "GRADE6-1405-TEST-A": "grade6",

        "GRADE6-1405-TEST-B": "grade6",

        "GRADE6-1405-TEST-C": "grade6"

    };


    // =====================================
    // Helpers
    // =====================================

    function safeText(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value);

    }


    function normalizeCode(code) {

        return safeText(code)
            .trim()
            .toUpperCase();

    }


    function normalizeStudentId(studentId) {

        return safeText(studentId)
            .trim();

    }


    function toPersianDigits(value) {

        return String(value)
            .replace(
                /\d/g,
                function (digit) {

                    return "۰۱۲۳۴۵۶۷۸۹"[
                        Number(digit)
                    ];

                }
            );

    }


    // =====================================
    // Active Profile
    // =====================================

    async function refreshRemoteLicenseStatus() {
        const claims = verifiedRemoteEntitlement;
        if (!claims) {
            return { valid: false, reason: "no_remote_entitlement" };
        }

        if (!window.TahouriLicenseClient ||
            typeof window.TahouriLicenseClient.status !== "function") {
            return { valid: false, reason: "status_client_unavailable" };
        }

        const licenseId = claims.licenseId;
        const studentId = getActiveStudentId();
        const installationId = getOrCreateInstallationId();
        if (!licenseId || !studentId || !installationId) {
            return { valid: false, reason: "binding_information_unavailable" };
        }

        try {
            const result = await window.TahouriLicenseClient.status(
                licenseId, studentId, installationId
            );

            if (!result.valid) {
                verifiedRemoteEntitlement = null;
            }

            return result;
        } catch (error) {
            console.warn("License Manager: Remote status check failed; cached offline entitlement is retained.", error);
            return {
                valid: false,
                reason: "network_error",
                offlineEntitlementRetained: true,
                error: error.message
            };
        }
    }


    function getActiveProfile() {

        try {

            if (
                window.ProfileManager &&
                typeof window.ProfileManager.get ===
                "function"
            ) {

                return (
                    window.ProfileManager.get() ||
                    null
                );

            }

        }
        catch (error) {

            console.error(
                "License Manager: Cannot read active profile.",
                error
            );

        }

        return null;

    }


    function getActiveStudentId() {

        const profile =
            getActiveProfile();

        if (!profile) {

            return "";

        }

        return normalizeStudentId(
            profile.studentId
        );

    }


    // =====================================
    // Persian Calendar
    // =====================================

    function getPersianParts(date) {

        try {

            const formatter =
                new Intl.DateTimeFormat(
                    "en-US-u-ca-persian",
                    {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric"
                    }
                );

            const parts =
                formatter.formatToParts(date);

            const result = {};

            parts.forEach(
                function (part) {

                    if (
                        part.type === "year" ||
                        part.type === "month" ||
                        part.type === "day"
                    ) {

                        result[part.type] =
                            Number(part.value);

                    }

                }
            );

            if (
                !result.year ||
                !result.month ||
                !result.day
            ) {

                return null;

            }

            return result;

        }
        catch (error) {

            console.error(
                "License Manager: Persian date conversion failed.",
                error
            );

            return null;

        }

    }


    // =====================================
    // Academic Year
    // =====================================

    function getAcademicYear() {

        const now =
            new Date();

        const parts =
            getPersianParts(now);

        if (!parts) {

            console.error(
                "License Manager: Cannot calculate Persian academic year."
            );

            return null;

        }

        let academicStartYear =
            parts.year;

        // قبل از ۱ مهر
        if (
            parts.month < 7
        ) {

            academicStartYear =
                parts.year - 1;

        }

        return academicStartYear;

    }


    // =====================================
    // Academic Year Text
    // =====================================

    function getAcademicYearText() {

        const start =
            getAcademicYear();

        if (
            start === null ||
            start === undefined
        ) {

            return "نامشخص";

        }

        const end =
            start + 1;

        return (
            toPersianDigits(start) +
            "–" +
            toPersianDigits(end)
        );

    }


    // =====================================
    // Persian Date → Gregorian Date
    // =====================================

    function persianToGregorian(
        persianYear,
        persianMonth,
        persianDay
    ) {

        /*
         * Robust conversion for the licensing layer.
         *
         * The previous binary-search implementation depended on
         * millisecond/day arithmetic across local timezone/DST
         * boundaries and could fail even when Intl Persian calendar
         * support was available.
         *
         * We only need exact academic boundary dates here, so use
         * Intl as the source of truth and scan a safe Gregorian window.
         */

        try {

            const target =
                (
                    Number(persianYear) * 10000 +
                    Number(persianMonth) * 100 +
                    Number(persianDay)
                );

            if (
                !Number.isFinite(target) ||
                !persianYear ||
                !persianMonth ||
                !persianDay
            ) {

                return null;

            }

            // Persian year Y is approximately Gregorian Y + 621.
            // Start at the beginning of March and scan the whole year.
            const base =
                new Date(
                    Date.UTC(
                        Number(persianYear) + 621,
                        2,
                        1,
                        12,
                        0,
                        0,
                        0
                    )
                );

            const maxDays = 400;

            for (
                let offset = 0;
                offset < maxDays;
                offset++
            ) {

                const date =
                    new Date(
                        base.getTime() +
                        offset * 86400000
                    );

                const parts =
                    getPersianParts(date);

                if (!parts) {

                    return null;

                }

                const current =
                    (
                        parts.year * 10000 +
                        parts.month * 100 +
                        parts.day
                    );

                if (
                    current === target
                ) {

                    return date;

                }

            }

            return null;

        }
        catch (error) {

            console.error(
                "License Manager: Persian to Gregorian conversion failed.",
                error
            );

            return null;

        }

    }

    // =====================================
    // Academic Period
    // =====================================

    function getAcademicPeriod() {

        const academicStartYear =
            getAcademicYear();

        if (
            academicStartYear === null
        ) {

            return {

                start: null,
                end: null,
                nextStart: null,
                academicStartYear: null,
                academicEndYear: null

            };

        }

        const nextAcademicYear =
            academicStartYear + 1;

        const start =
            persianToGregorian(
                academicStartYear,
                7,
                1
            );

        const nextStart =
            persianToGregorian(
                nextAcademicYear,
                7,
                1
            );

        if (
            !start ||
            !nextStart
        ) {

            console.error(
                "License Manager: Academic period conversion failed."
            );

            return {

                start: null,
                end: null,
                nextStart: null,

                academicStartYear:
                    academicStartYear,

                academicEndYear:
                    nextAcademicYear

            };

        }

        const end =
            new Date(
                nextStart.getTime() - 1
            );

        return {

            start: start,
            end: end,
            nextStart: nextStart,

            academicStartYear:
                academicStartYear,

            academicEndYear:
                nextAcademicYear

        };

    }


    // =====================================
    // Remaining Days
    // =====================================

    function getRemainingDays() {

        const period =
            getAcademicPeriod();

        if (
            !period.start ||
            !period.nextStart
        ) {

            return 0;

        }

        const now =
            new Date();

        if (
            now < period.start
        ) {

            return 0;

        }

        if (
            now >= period.nextStart
        ) {

            return 0;

        }

        const difference =
            period.nextStart.getTime() -
            now.getTime();

        return Math.max(
            0,
            Math.ceil(
                difference /
                86400000
            )
        );

    }


    // =====================================
    // Persian Date
    // =====================================

    function getPersianDate(date) {

        try {

            return new Intl.DateTimeFormat(
                "fa-IR-u-ca-persian",
                {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            ).format(date);

        }
        catch (error) {

            return "";

        }

    }


    // =====================================
    // Gregorian Date
    // =====================================

    function getGregorianDate(date) {

        try {

            const targetDate =
                date instanceof Date
                    ? date
                    : new Date(date);

            if (
                isNaN(
                    targetDate.getTime()
                )
            ) {

                return "";

            }

            return new Intl.DateTimeFormat(
                "en-US",
                {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }
            ).format(targetDate);

        }
        catch (error) {

            return "";

        }

    }


    // =====================================
    // Storage
    // =====================================

    function loadLicenses() {

        try {

            const raw =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!raw) {

                return [];

            }

            const data =
                JSON.parse(raw);

            if (
                !Array.isArray(data)
            ) {

                return [];

            }

            return data;

        }
        catch (error) {

            console.error(
                "License Manager: Load failed.",
                error
            );

            return [];

        }

    }


    function saveLicenses(
        licenses
    ) {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    licenses
                )
            );

            return true;

        }
        catch (error) {

            console.error(
                "License Manager: Save failed.",
                error
            );

            return false;

        }

    }


    // =====================================
    // Cleanup
    // =====================================

    function cleanupExpiredLicenses() {

        const currentYear =
            getAcademicYear();

        if (
            currentYear === null
        ) {

            return [];

        }

        const licenses =
            loadLicenses();

        const valid =
            licenses.filter(
                function (license) {

                    if (
                        !license ||
                        license.academicYear ===
                        undefined ||
                        license.academicYear ===
                        null
                    ) {

                        return false;

                    }

                    return (
                        Number(
                            license.academicYear
                        ) ===
                        Number(
                            currentYear
                        )
                    );

                }
            );

        if (
            valid.length !==
            licenses.length
        ) {

            saveLicenses(
                valid
            );

        }

        return valid;

    }


    // =====================================
    // Active Licenses
    // =====================================

    function getActiveLicenses() {

        return cleanupExpiredLicenses();

    }


    // =====================================
    // Profile License
    // =====================================

    function getProfileLicenses(
        studentId
    ) {

        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );

        if (!normalizedStudentId) {

            return [];

        }

        return getActiveLicenses()
            .filter(
                function (license) {

                    return (
                        normalizeStudentId(
                            license.studentId
                        ) ===
                        normalizedStudentId
                    );

                }
            );

    }


    function getProfileLicense(
        studentId,
        gradeId
    ) {

        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );

        if (
            !normalizedStudentId ||
            !gradeId
        ) {

            return null;

        }

        return getActiveLicenses()
            .find(
                function (license) {

                    return (
                        normalizeStudentId(
                            license.studentId
                        ) ===
                        normalizedStudentId
                        &&
                        license.gradeId ===
                        gradeId
                    );

                }
            ) || null;

    }


    // =====================================
    // Activation Status
    // =====================================

    function isActivated(
        studentId
    ) {

        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );

        if (!normalizedStudentId) {

            return false;

        }

        return getActiveLicenses()
            .some(
                function (license) {

                    return (
                        normalizeStudentId(
                            license.studentId
                        ) ===
                        normalizedStudentId
                    );

                }
            );

    }


    function isGradeActivated(
        gradeId,
        studentId
    ) {

        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );

        if (
            !normalizedStudentId ||
            !gradeId
        ) {

            return false;

        }

        if (hasValidRemoteEntitlement(gradeId)) {
            return true;
        }

        return getActiveLicenses()
            .some(
                function (license) {
                    return (
                        normalizeStudentId(license.studentId) === normalizedStudentId
                        && license.gradeId === gradeId
                    );
                }
            );

    }


    // =====================================
    // Profile Activation
    // =====================================

    function isProfileActivated(
        studentId,
        gradeId
    ) {

        return isGradeActivated(
            gradeId,
            studentId
        );

    }


    // =====================================
    // Find Code
    // =====================================

    function findLicenseByCode(
        code
    ) {

        const normalized =
            normalizeCode(code);

        if (!normalized) {

            return null;

        }

        return getActiveLicenses()
            .find(
                function (license) {

                    return (
                        normalizeCode(
                            license.code
                        ) ===
                        normalized
                    );

                }
            ) || null;

    }


    // =====================================
    // Validate Code
    // =====================================

    function validateCode(
        code,
        selectedGrade,
        studentId
    ) {

        if (isRemoteProductionMode()) {
            return {
                valid: false,
                message: "اعتبارسنجی کد محلی در نسخه production مجاز نیست."
            };
        }

        const normalized =
            normalizeCode(code);

        if (!normalized) {

            return {

                valid: false,

                message:
                    "لطفاً کد فعال‌سازی را وارد کنید."

            };

        }


        if (!selectedGrade) {

            return {

                valid: false,

                message:
                    "لطفاً پایه تحصیلی را انتخاب کنید."

            };

        }


        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );


        if (!normalizedStudentId) {

            return {

                valid: false,

                message:
                    "پروفایل فعال پیدا نشد."

            };

        }


        const codeGrade =
            DEMO_CODES[
                normalized
            ];


        // =====================================
        // Code must exist
        // =====================================

        if (!codeGrade) {

            return {

                valid: false,

                message:
                    "کد فعال‌سازی معتبر نیست."

            };

        }


        // =====================================
        // Grade Match
        // =====================================

        if (
            codeGrade !==
            selectedGrade
        ) {

            return {

                valid: false,

                message:
                    "این کد مربوط به پایه انتخاب‌شده نیست."

            };

        }


        // =====================================
        // Existing license for this profile
        // =====================================

        const profileLicense =
            getProfileLicense(
                normalizedStudentId,
                selectedGrade
            );

        if (profileLicense) {

            return {

                valid: false,

                message:
                    "این پروفایل قبلاً برای این پایه فعال شده است."

            };

        }


        // =====================================
        // Code already used
        // =====================================

        const existingLicense =
            findLicenseByCode(
                normalized
            );


        if (existingLicense) {

            const ownerStudentId =
                normalizeStudentId(
                    existingLicense.studentId
                );


            // =====================================
            // Legacy license
            // =====================================
            //
            // مجوزهای نسخه 1.3 فاقد studentId
            // هستند.
            //
            // اولین پروفایل استفاده‌کننده مالک
            // آن مجوز خواهد شد.
            //
            // =====================================

            if (!ownerStudentId) {

                return {

                    valid: true,

                    code:
                        normalized,

                    gradeId:
                        codeGrade,

                    studentId:
                        normalizedStudentId,

                    legacy:
                        true

                };

            }


            // =====================================
            // Same owner
            // =====================================

            if (
                ownerStudentId ===
                normalizedStudentId
            ) {

                return {

                    valid: false,

                    message:
                        "این کد قبلاً برای همین پروفایل فعال شده است."

                };

            }


            // =====================================
            // Different owner
            // =====================================

            return {

                valid: false,

                message:
                    "این کد قبلاً برای پروفایل دیگری استفاده شده است."

            };

        }


        // =====================================
        // New Code
        // =====================================

        return {

            valid: true,

            gradeId:
                codeGrade,

            code:
                normalized,

            studentId:
                normalizedStudentId

        };

    }


    // =====================================
    // Activate
    // =====================================

    function activate(
        code,
        gradeId,
        studentId
    ) {

        if (isRemoteProductionMode()) {
            return {
                valid: false,
                message: "فعال‌سازی محلی در نسخه production مجاز نیست."
            };
        }

        const normalizedStudentId =
            normalizeStudentId(
                studentId ||
                getActiveStudentId()
            );


        const validation =
            validateCode(
                code,
                gradeId,
                normalizedStudentId
            );


        if (
            !validation.valid
        ) {

            return validation;

        }


        const period =
            getAcademicPeriod();


        if (
            !period.start ||
            !period.nextStart
        ) {

            return {

                valid: false,

                message:
                    "تاریخ سال تحصیلی قابل محاسبه نیست."

            };

        }


        const licenses =
            getActiveLicenses();


        // =====================================
        // Legacy License Claim
        // =====================================

        const existingLicense =
            licenses.find(
                function (license) {

                    return (
                        normalizeCode(
                            license.code
                        ) ===
                        validation.code
                    );

                }
            );


        if (
            existingLicense &&
            !normalizeStudentId(
                existingLicense.studentId
            )
        ) {

            existingLicense.studentId =
                normalizedStudentId;

            existingLicense.studentName =
                getActiveProfileName();

            existingLicense.boundAt =
                new Date().toISOString();

            existingLicense.bindingVersion =
                2;

            const saved =
                saveLicenses(
                    licenses
                );

            if (!saved) {

                return {

                    valid: false,

                    message:
                        "ذخیره مالکیت مجوز انجام نشد."

                };

            }

            console.log(
                "Legacy License Bound:",
                existingLicense
            );

            return {

                valid: true,

                license:
                    existingLicense

            };

        }


        // =====================================
        // New License
        // =====================================

        const license = {

            id:
                "license_" +
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .slice(2, 8),

            code:
                validation.code,

            gradeId:
                validation.gradeId,

            gradeTitle:
                GRADES[
                    validation.gradeId
                ],

            studentId:
                normalizedStudentId,

            studentName:
                getActiveProfileName(),

            academicYear:
                period.academicStartYear,

            academicYearText:
                getAcademicYearText(),

            activatedAt:
                new Date().toISOString(),

            boundAt:
                new Date().toISOString(),

            validFrom:
                period.start.toISOString(),

            validUntil:
                period.nextStart.toISOString(),

            bindingVersion:
                2

        };


        licenses.push(
            license
        );


        const saved =
            saveLicenses(
                licenses
            );


        if (!saved) {

            return {

                valid: false,

                message:
                    "ذخیره مجوز انجام نشد."

            };

        }


        console.log(
            "License Activated:",
            license
        );


        return {

            valid: true,

            license:
                license

        };

    }


    // =====================================
    // Active Profile Name
    // =====================================

    function getActiveProfileName() {

        const profile =
            getActiveProfile();

        if (!profile) {

            return "";

        }

        return safeText(
            profile.name
        );

    }


    // =====================================
    // Remove License
    // =====================================
    //
    // فعلاً فقط برای تست داخلی.
    // در نسخه نهایی عمومی نباید امکان حذف
    // آزادانه مجوز وجود داشته باشد.
    //
    // =====================================

    function removeLicense(
        licenseId
    ) {

        if (!licenseId) {

            return false;

        }

        const licenses =
            getActiveLicenses();

        const filtered =
            licenses.filter(
                function (license) {

                    return (
                        license.id !==
                        licenseId
                    );

                }
            );

        if (
            filtered.length ===
            licenses.length
        ) {

            return false;

        }

        return saveLicenses(
            filtered
        );

    }


    function isRemoteProductionMode() {
        return Boolean(
            window.TahouriServiceConfig &&
            window.TahouriServiceConfig.mode === "production"
        );
    }

    // =====================================
    // Remote Activation Bridge
    // =====================================
    async function activateRemote(code, gradeId, studentId, renewalMode = "promotion") {
        if (!window.TahouriLicenseClient || !window.TahouriEntitlementVerifier || !window.TahouriEntitlementStore) return null;
        const installationId = getOrCreateInstallationId();
        try {
            const normalizedStudentId = String(studentId || getActiveStudentId() || "").trim();
            const response = await window.TahouriLicenseClient.activate({code, gradeId, studentId: normalizedStudentId, installationId, renewalMode});
            if (!response || !response.valid || !response.entitlement) return response || {valid:false,message:"فعال‌سازی آنلاین انجام نشد."};
            const verified = await window.TahouriEntitlementVerifier.verifyEnvelope(
                response.entitlement,
                { allowFuture: true }
            );
            if (!verified.valid) return {valid:false,message:verified.reason || "مجوز آنلاین معتبر نیست."};
            const claims = verified.claims;
            if (claims.installationBinding !== installationId) return {valid:false,message:"این مجوز برای نصب دیگری صادر شده است."};
            if (claims.gradeScope && claims.gradeScope !== gradeId) return {valid:false,message:"مجوز مربوط به این پایه نیست."};
            if (claims.studentId && claims.studentId !== String(studentId || getActiveStudentId()).trim()) return {valid:false,message:"این مجوز متعلق به پروفایل دیگری است."};
            if (!window.TahouriEntitlementStore.write(response.entitlement)) return {valid:false,message:"ذخیره مجوز امن انجام نشد."};
            if (
                claims.productId !== "tahouri-edu" ||
                claims.entitlementVersion !== 1 ||
                claims.licenseId === undefined ||
                claims.academicYear === undefined ||
                claims.validFrom === undefined ||
                claims.validUntil === undefined
            ) {
                return {
                    valid: false,
                    message: "اطلاعات مجوز دریافتی کامل نیست."
                };
            }

            const validFrom = new Date(claims.validFrom);
            const isFutureRenewal =
                !Number.isNaN(validFrom.getTime()) &&
                Date.now() < validFrom.getTime();

            if (isFutureRenewal) {
                await initializeRemoteEntitlement();
                return {
                    valid: true,
                    remote: true,
                    renewalStored: true,
                    entitlement: response.entitlement,
                    license: claims,
                    studentId
                };
            }

            verifiedRemoteEntitlement = claims;
            return {valid:true,remote:true,entitlement:response.entitlement,license:claims,studentId};
        } catch (error) {
            console.warn("License Manager: Remote activation unavailable.", error);
            if (isRemoteProductionMode()) {
                return {
                    valid: false,
                    message: "سرویس فعال‌سازی در دسترس نیست. برای فعال‌سازی دوباره بعداً تلاش کنید."
                };
            }
            return null;
        }
    }
    function getOrCreateInstallationId() {
        const key="Tahouri_Installation_Id_v1";
        try { let id=localStorage.getItem(key); if(!id){ id=(window.crypto&&typeof window.crypto.randomUUID==="function")?window.crypto.randomUUID():"install_"+Date.now()+"_"+Math.random().toString(36).slice(2); localStorage.setItem(key,id);} return id; }
        catch(error){ return "ephemeral_"+Date.now(); }
    }
    function getRemoteEntitlement() {
        try {
            if (!window.TahouriEntitlementStore) return null;
            const all = typeof window.TahouriEntitlementStore.readAll === "function"
                ? window.TahouriEntitlementStore.readAll()
                : [window.TahouriEntitlementStore.read()].filter(Boolean);
            return all.length ? all[0] : null;
        } catch(error) {
            return null;
        }
    }

    async function initializeRemoteEntitlement() {
        verifiedRemoteEntitlement = null;
        if (!window.TahouriEntitlementStore || !window.TahouriEntitlementVerifier) return false;

        try {
            const all = typeof window.TahouriEntitlementStore.readAll === "function"
                ? window.TahouriEntitlementStore.readAll()
                : [window.TahouriEntitlementStore.read()].filter(Boolean);

            const installationId = getOrCreateInstallationId();

            for (const envelope of all) {
                const result = await window.TahouriEntitlementVerifier.verifyEnvelope(envelope);

                if (!result.valid) continue;

                const claims = result.claims;
                const binding = claims.installationBinding;

                if (binding && binding !== installationId) continue;

                verifiedRemoteEntitlement = claims;

                // Recheck revocation when online, but keep the signed entitlement
                // available for offline use if the status service cannot be reached.
                const remoteStatus = await refreshRemoteLicenseStatus();
                if (!remoteStatus.valid &&
                    !["network_error", "status_client_unavailable", "binding_information_unavailable"]
                        .includes(remoteStatus.reason)) {
                    verifiedRemoteEntitlement = null;
                    continue;
                }

                return true;
            }

            return false;
        } catch (error) {
            console.warn("License Manager: Stored entitlement verification failed.", error);
            return false;
        }
    }

    function hasValidRemoteEntitlement(gradeId) {
        const c=verifiedRemoteEntitlement;
        if(!c || c.productId!=="tahouri-edu") return false;
        if(c.gradeScope && c.gradeScope!==gradeId) return false;
        const activeStudentId = getActiveStudentId();
        if(c.studentId && c.studentId!==activeStudentId) return false;
        const from=new Date(c.validFrom);
        const until=new Date(c.validUntil);
        return (
            !Number.isNaN(from.getTime()) &&
            !Number.isNaN(until.getTime()) &&
            Date.now() >= from.getTime() &&
            Date.now() < until.getTime()
        );
    }

    // =====================================
    // Public API
    // =====================================

    const api = {

        // Grades
        getGrades:
            function () {

                return {
                    ...GRADES
                };

            },


        // Academic Year
        getAcademicYear:
            getAcademicYear,

        getAcademicYearText:
            getAcademicYearText,

        getAcademicPeriod:
            getAcademicPeriod,

        getRemainingDays:
            getRemainingDays,


        // Dates
        getPersianDate:
            getPersianDate,

        getGregorianDate:
            getGregorianDate,


        // Licenses
        getActiveLicenses:
            getActiveLicenses,

        getProfileLicenses:
            getProfileLicenses,

        getProfileLicense:
            getProfileLicense,


        // Status
        isActivated:
            isActivated,

        isGradeActivated:
            isGradeActivated,

        isProfileActivated:
            isProfileActivated,


        // Validation
        validateCode:
            validateCode,


        // Activation
        activate:
            activate,

        refreshRemoteLicenseStatus:
            refreshRemoteLicenseStatus,

        activateRemote:
            activateRemote,

        hasValidRemoteEntitlement:
            hasValidRemoteEntitlement,

        getRemoteEntitlement:
            getRemoteEntitlement,

        initializeRemoteEntitlement:
            initializeRemoteEntitlement,


        // Internal / Testing
        removeLicense:
            removeLicense

    };


    // =====================================
    // Global
    // =====================================

    window.LicenseManager =
        api;


    console.log(
        "License Manager v2.1 Ready"
    );

})();