/* =========================================================
   Tahouri Edu Platform
   License Screen v4.2
   Profile Dropdown + Grade Routing + License Management
   Compatible with ActivationGate v7.0
   Manual Entry Flow
   ========================================================= */

(function () {

    "use strict";


    // =========================================================
    // State
    // =========================================================

    let container = null;
    let overlayMode = false;
    let returnToGate = false;


    // =========================================================
    // Styles
    // =========================================================

    function injectStyles() {

        if (
            document.getElementById(
                "tahouriLicenseStyles"
            )
        ) {
            return;
        }


        const style =
            document.createElement("style");


        style.id =
            "tahouriLicenseStyles";


        style.textContent = `

            #tahouriLicenseContainer {

                position:fixed;
                inset:0;
                z-index:999998;
                background:#f5f7fa;
                overflow-y:auto;
                font-family:"B Yekan",Tahoma,Arial,sans-serif;

            }


            .tahouri-license-screen {

                width:100%;
                min-height:100%;
                display:flex;
                justify-content:center;
                box-sizing:border-box;
                padding:25px 15px 40px;

            }


            .tahouri-license-wrapper {

                width:100%;
                max-width:600px;
                box-sizing:border-box;

            }


            .tahouri-license-header {

                text-align:center;
                margin-bottom:20px;

            }


            .tahouri-license-header h2 {

                margin:0 0 8px;
                font-size:25px;

            }


            .tahouri-license-header p {

                margin:0;
                color:#666;
                font-size:14px;

            }


            .tahouri-license-form {

                background:#fff;
                border-radius:16px;
                padding:20px;
                box-shadow:0 4px 18px rgba(0,0,0,.08);
                box-sizing:border-box;

            }


            .tahouri-license-label {

                display:block;
                margin-bottom:8px;
                font-weight:bold;
                font-size:15px;

            }


            .tahouri-license-select,
            .tahouri-license-input {

                width:100%;
                height:48px;
                border:1px solid #d5d9df;
                border-radius:10px;
                padding:0 12px;
                font-family:inherit;
                font-size:15px;
                box-sizing:border-box;
                background:#fff;
                margin-bottom:18px;

            }


            .tahouri-license-route {

                margin-top:8px;
                padding:18px;
                border-radius:14px;
                background:#f7f8fa;
                border:1px solid #e2e5e9;

            }


            .tahouri-license-route-title {

                font-size:20px;
                font-weight:bold;
                margin-bottom:8px;

            }


            .tahouri-license-route-text {

                color:#666;
                line-height:1.8;
                font-size:14px;
                margin-bottom:14px;

            }


            .tahouri-license-status {

                padding:12px 14px;
                border-radius:10px;
                margin-bottom:14px;
                font-size:14px;
                line-height:1.7;

            }


            .tahouri-license-status.active {

                background:#e9f7ef;
                color:#187744;
                border:1px solid #bfe5ce;

            }


            .tahouri-license-status.inactive {

                background:#fff5e8;
                color:#9a5a00;
                border:1px solid #f0d4a5;

            }


            .tahouri-license-button {

                width:100%;
                min-height:48px;
                border:none;
                border-radius:10px;
                padding:10px 15px;
                margin-top:8px;
                font-family:inherit;
                font-size:15px;
                font-weight:bold;
                cursor:pointer;
                background:#2563eb;
                color:#fff;

            }


            .tahouri-license-button:hover {

                opacity:.92;

            }


            .tahouri-license-button.secondary {

                background:#667085;

            }


            .tahouri-license-button.management {

                background:#7c3aed;

            }


            .tahouri-license-note {

                margin-top:16px;
                padding:12px;
                border-radius:10px;
                background:#f1f3f5;
                color:#666;
                font-size:13px;
                line-height:1.8;
                text-align:center;

            }


            .tahouri-license-back {

                margin-top:10px;

            }


            .tahouri-license-empty {

                text-align:center;
                padding:30px 15px;
                color:#666;
                line-height:2;

            }


            .tahouri-license-management-title {

                font-size:20px;
                font-weight:bold;
                margin-bottom:8px;

            }


            .tahouri-license-management-text {

                color:#666;
                line-height:1.8;
                font-size:14px;
                margin-bottom:18px;

            }


            .tahouri-license-divider {

                height:1px;
                background:#e5e7eb;
                margin:20px 0;

            }

        `;


        document.head.appendChild(style);

    }


    // =========================================================
    // Profile Helpers
    // =========================================================

    function getActiveProfile() {

        try {

            if (
                window.ProfileManager &&
                typeof ProfileManager.get ===
                    "function"
            ) {

                return ProfileManager.get();

            }

        }
        catch (error) {

            console.error(
                "License Screen: Active profile read failed.",
                error
            );

        }


        return null;

    }


    function getAllProfiles() {

        try {

            if (
                window.ProfileManager &&
                typeof ProfileManager.getAll ===
                    "function"
            ) {

                return (
                    ProfileManager.getAll() ||
                    []
                );

            }

        }
        catch (error) {

            console.error(
                "License Screen: Profile list failed.",
                error
            );

        }


        return [];

    }


    function switchProfile(
        studentId
    ) {

        try {

            if (
                window.ProfileManager &&
                typeof ProfileManager.switchProfile ===
                    "function"
            ) {

                return ProfileManager.switchProfile(
                    studentId
                );

            }

        }
        catch (error) {

            console.error(
                "License Screen: Profile switch failed.",
                error
            );

        }


        return false;

    }


    // =========================================================
    // Grade Helpers
    // =========================================================

    function getGrades() {

        try {

            if (
                window.LicenseManager &&
                typeof LicenseManager.getGrades ===
                    "function"
            ) {

                return (
                    LicenseManager.getGrades() ||
                    {}
                );

            }

        }
        catch (error) {

            console.error(
                "License Screen: Grades unavailable.",
                error
            );

        }


        return {};

    }


    function getGradeList() {

        const grades =
            getGrades();


        if (Array.isArray(grades)) {

            return grades;

        }


        if (
            grades &&
            typeof grades === "object"
        ) {

            return Object.keys(grades).map(
                function (gradeId) {

                    const grade =
                        grades[gradeId];


                    if (
                        grade &&
                        typeof grade === "object"
                    ) {

                        return {
                            id:
                                grade.id ||
                                gradeId,

                            title:
                                grade.title ||
                                grade.name ||
                                gradeId,

                            name:
                                grade.name ||
                                grade.title ||
                                gradeId
                        };

                    }


                    return {

                        id:
                            gradeId,

                        title:
                            String(
                                grade ||
                                gradeId
                            ),

                        name:
                            String(
                                grade ||
                                gradeId
                            )

                    };

                }
            );

        }


        return [];

    }


    function getGradeTitle(
        gradeId
    ) {

        if (!gradeId) {

            return "نامشخص";

        }


        const grades =
            getGrades();


        // Object format:
        // {
        //     grade1: "پایه اول",
        //     grade2: "پایه دوم"
        // }

        if (
            grades &&
            !Array.isArray(grades) &&
            typeof grades === "object"
        ) {

            const value =
                grades[gradeId];


            if (
                typeof value === "string"
            ) {

                return value;

            }


            if (
                value &&
                typeof value === "object"
            ) {

                return (
                    value.title ||
                    value.name ||
                    gradeId
                );

            }

        }


        // Array format

        if (Array.isArray(grades)) {

            const grade =
                grades.find(
                    function (item) {

                        return (
                            item &&
                            item.id === gradeId
                        );

                    }
                );


            if (grade) {

                return (
                    grade.title ||
                    grade.name ||
                    gradeId
                );

            }

        }


        return gradeId;

    }


    // =========================================================
    // License Helpers
    // =========================================================

    function getActiveLicenses() {

        try {

            if (
                window.LicenseManager &&
                typeof LicenseManager.getActiveLicenses ===
                    "function"
            ) {

                return (
                    LicenseManager.getActiveLicenses() ||
                    []
                );

            }

        }
        catch (error) {

            console.error(
                "License Screen: Active licenses unavailable.",
                error
            );

        }


        return [];

    }


    function isGradeActivated(
        gradeId
    ) {

        if (!gradeId) {

            return false;

        }


        try {

            /*
             * این همان API اصلی مورد استفاده
             * توسط ActivationGate v7.0 است.
             */

            if (
                window.LicenseManager &&
                typeof LicenseManager.isGradeActivated ===
                    "function"
            ) {

                return Boolean(
                    LicenseManager.isGradeActivated(
                        gradeId
                    )
                );

            }

        }
        catch (error) {

            console.error(
                "License Screen: License status check failed.",
                error
            );

        }


        /*
         * سازگاری با نسخه‌های قدیمی‌تر
         */

        try {

            if (
                window.LicenseManager &&
                typeof LicenseManager.isActivated ===
                    "function"
            ) {

                return Boolean(
                    LicenseManager.isActivated(
                        gradeId
                    )
                );

            }

        }
        catch (error) {

            console.error(
                "License Screen: Legacy license status failed.",
                error
            );

        }


        /*
         * آخرین fallback
         */

        const licenses =
            getActiveLicenses();


        if (!Array.isArray(licenses)) {

            return false;

        }


        return licenses.some(
            function (license) {

                if (!license) {

                    return false;

                }


                const licenseGrade =
                    license.grade ||
                    license.gradeId;


                return (
                    licenseGrade === gradeId &&
                    (
                        license.active === true ||
                        license.valid === true
                    )
                );

            }
        );

    }


    function getAcademicYear() {

        try {

            if (
                window.LicenseManager &&
                typeof LicenseManager.getAcademicYearText ===
                    "function"
            ) {

                return (
                    LicenseManager.getAcademicYearText() ||
                    ""
                );

            }

        }
        catch (error) {

            console.error(
                "License Screen: Academic year unavailable.",
                error
            );

        }


        return "";

    }


    // =========================================================
    // Container Closing
    // =========================================================

    function closeForGradeEntry() {

        /*
         * در ورود مستقیم به پایه، نباید دوباره
         * ActivationGate باز شود.
         */

        if (container) {

            if (overlayMode) {

                container.remove();

            }
            else {

                container.innerHTML = "";

            }


            container =
                null;

        }


        overlayMode =
            false;


        returnToGate =
            false;


        return true;

    }


    function closeContainer() {

        const shouldReturnToGate =
            returnToGate;


        if (container) {

            if (overlayMode) {

                container.remove();

            }
            else {

                container.innerHTML = "";

            }


            container =
                null;

        }


        overlayMode =
            false;


        returnToGate =
            false;


        if (
            shouldReturnToGate &&
            window.ActivationGate &&
            typeof ActivationGate.open ===
                "function"
        ) {

            ActivationGate.open();

            return;

        }


        if (
            window.Screen &&
            typeof Screen.showHome ===
                "function"
        ) {

            Screen.showHome();

        }

    }


    // =========================================================
    // Overlay Container
    // =========================================================

    function createOverlayContainer() {

        const old =
            document.getElementById(
                "tahouriLicenseContainer"
            );


        if (old) {

            old.remove();

        }


        container =
            document.createElement("div");


        container.id =
            "tahouriLicenseContainer";


        document.body.appendChild(
            container
        );


        overlayMode =
            true;


        return container;

    }


    function getTargetContainer(
        target
    ) {

        if (
            target &&
            typeof target === "object"
        ) {

            return target;

        }


        return createOverlayContainer();

    }


    // =========================================================
    // Main List
    // =========================================================

    function renderList() {

        if (!container) {

            return;

        }


        const activeProfile =
            getActiveProfile();


        const profiles =
            getAllProfiles();


        if (!activeProfile) {

            renderNoProfile();

            return;

        }


        const currentGrade =
            activeProfile.grade;


        const currentGradeNumber =
            Number(String(currentGrade || "").replace(/^grade/i, ""));

        const nextGradeId =
            Number.isInteger(currentGradeNumber) && currentGradeNumber > 0
                ? "grade" + (currentGradeNumber + 1)
                : "";

        const gradeTitle =
            getGradeTitle(
                currentGrade
            );


        const activated =
            isGradeActivated(
                currentGrade
            );


        let profileOptions =
            "";


        profiles.forEach(
            function (profile) {

                if (!profile) {

                    return;

                }


                const selected =
                    profile.studentId ===
                    activeProfile.studentId
                        ? "selected"
                        : "";


                profileOptions += `

                    <option
                        value="${profile.studentId || ""}"
                        ${selected}
                    >
                        ${
                            profile.name ||
                            "دانش‌آموز"
                        }
                        -
                        ${
                            getGradeTitle(
                                profile.grade
                            )
                        }
                    </option>

                `;

            }
        );


        container.innerHTML = `

            <div class="tahouri-license-screen">

                <div class="tahouri-license-wrapper">


                    <div class="tahouri-license-header">

                        <h2>
                            🔑 مدیریت دسترسی
                        </h2>

                        <p>
                            پروفایل و مسیر آموزشی را انتخاب کنید
                        </p>

                    </div>


                    <div class="tahouri-license-form">


                        <label
                            class="tahouri-license-label"
                        >
                            پروفایل دانش‌آموز
                        </label>


                        <select
                            id="tahouriLicenseProfileSelect"
                            class="tahouri-license-select"
                        >

                            ${profileOptions}

                        </select>


                        <div
                            class="tahouri-license-route"
                        >

                            <div
                                class="tahouri-license-route-title"
                            >
                                🎓 ${gradeTitle}
                            </div>


                            <div
                                class="tahouri-license-route-text"
                            >
                                مسیر آموزشی این پروفایل بر اساس پایه
                                انتخاب‌شده نمایش داده می‌شود.
                            </div>


                            ${
                                activated

                                ?

                                `

                                    <div
                                        class="tahouri-license-status active"
                                    >

                                        ✅ مجوز این پایه فعال است.

                                        ${
                                            getAcademicYear()

                                            ?

                                            `<br>
                                             سال تحصیلی:
                                             ${getAcademicYear()}`

                                            :

                                            ""
                                        }

                                    </div>


                                    <button
                                        id="tahouriLicenseEnterButton"
                                        type="button"
                                        class="tahouri-license-button"
                                    >
                                        ▶️ ورود به ${gradeTitle}
                                    </button>

                                `

                                :

                                `

                                    <div
                                        class="tahouri-license-status inactive"
                                    >
                                        🔒 مجوز این پایه فعال نیست.
                                    </div>


                                    <button
                                        id="tahouriLicenseActivateGradeButton"
                                        type="button"
                                        class="tahouri-license-button"
                                    >
                                        🔑 فعال‌سازی مجوز ${gradeTitle}
                                    </button>

                                `
                            }


                        </div>


                        <div
                            class="tahouri-license-divider"
                        ></div>


                        <button
                            id="tahouriLicenseManagementButton"
                            type="button"
                            class="tahouri-license-button management"
                        >
                            🔑 مدیریت مجوزها
                        </button>


                        <button
                            id="tahouriLicenseBackButton"
                            type="button"
                            class="tahouri-license-button secondary tahouri-license-back"
                        >
                            ↩️ بازگشت
                        </button>


                        <div
                            class="tahouri-license-note"
                        >

                            تغییر پروفایل فقط مسیر پایه همان پروفایل را تغییر می‌دهد.

                            <br>

                            ورود به پایه فقط با کلیک روی دکمه ورود انجام می‌شود.

                        </div>


                    </div>

                </div>

            </div>

        `;


        bindListEvents();

    }


    // =========================================================
    // Main List Events
    // =========================================================

    function bindListEvents() {

        const profileSelect =
            document.getElementById(
                "tahouriLicenseProfileSelect"
            );


        if (profileSelect) {

            profileSelect.addEventListener(
                "change",
                function () {

                    const studentId =
                        this.value;


                    if (!studentId) {

                        return;

                    }


                    const changed =
                        switchProfile(
                            studentId
                        );


                    /*
                     * بعضی نسخه‌های ProfileManager
                     * مقدار true/false برمی‌گردانند،
                     * بعضی نسخه‌ها در موفقیت چیزی برنمی‌گردانند.
                     */

                    if (changed !== false) {

                        renderList();

                    }

                }
            );

        }


        // =====================================================
        // Enter Grade
        // =====================================================

        const enterButton =
            document.getElementById(
                "tahouriLicenseEnterButton"
            );


        if (enterButton) {

            enterButton.addEventListener(
                "click",
                function () {

                    const activeProfile =
                        getActiveProfile();


                    if (
                        !activeProfile ||
                        !activeProfile.grade
                    ) {

                        return;

                    }


                    const grade =
                        activeProfile.grade;


                    if (
                        !isGradeActivated(
                            grade
                        )
                    ) {

                        renderList();

                        return;

                    }


                    /*
                     * صفحه License بسته می‌شود.
                     *
                     * returnToGate نیز خاموش می‌شود
                     * تا Gate دوباره باز نشود.
                     */

                    closeForGradeEntry();


                    /*
                     * ActivationGate v7.0
                     * تنها مسئول ورود نهایی به پایه است.
                     */

                    if (
                        window.ActivationGate &&
                        typeof ActivationGate.openGrade ===
                            "function"
                    ) {

                        ActivationGate.openGrade(
                            grade
                        );

                        return;

                    }


                    console.warn(
                        "License Screen: ActivationGate.openGrade unavailable."
                    );

                }
            );

        }


        // =====================================================
        // Activate Current Profile Grade
        // =====================================================

        const activateButton =
            document.getElementById(
                "tahouriLicenseActivateGradeButton"
            );


        if (activateButton) {

            activateButton.addEventListener(
                "click",
                function () {

                    const activeProfile =
                        getActiveProfile();


                    if (
                        !activeProfile ||
                        !activeProfile.grade
                    ) {

                        return;

                    }


                    renderAddForm(
                        activeProfile.grade
                    );

                }
            );

        }


        // =====================================================
        // License Management
        // =====================================================

        const managementButton =
            document.getElementById(
                "tahouriLicenseManagementButton"
            );


        if (managementButton) {

            managementButton.addEventListener(
                "click",
                function () {

                    renderAddForm();

                }
            );

        }


        // =====================================================
        // Back
        // =====================================================

        const backButton =
            document.getElementById(
                "tahouriLicenseBackButton"
            );


        if (backButton) {

            backButton.addEventListener(
                "click",
                function () {

                    closeContainer();

                }
            );

        }

    }


    // =========================================================
    // No Profile
    // =========================================================

    function renderNoProfile() {

        if (!container) {

            return;

        }


        container.innerHTML = `

            <div class="tahouri-license-screen">

                <div class="tahouri-license-wrapper">


                    <div class="tahouri-license-header">

                        <h2>
                            🔑 مدیریت دسترسی
                        </h2>

                    </div>


                    <div class="tahouri-license-form">

                        <div
                            class="tahouri-license-empty"
                        >

                            <div>
                                هنوز پروفایلی انتخاب نشده است.
                            </div>


                            <button
                                id="tahouriLicenseCreateProfileButton"
                                type="button"
                                class="tahouri-license-button"
                            >
                                👤 ایجاد / انتخاب پروفایل
                            </button>


                            <button
                                id="tahouriLicenseNoProfileBackButton"
                                type="button"
                                class="tahouri-license-button secondary"
                            >
                                ↩️ بازگشت
                            </button>

                        </div>

                    </div>

                </div>

            </div>

        `;


        const createButton =
            document.getElementById(
                "tahouriLicenseCreateProfileButton"
            );


        if (createButton) {

            createButton.addEventListener(
                "click",
                function () {

                    /*
                     * در این حالت نمی‌خواهیم
                     * Gate دوباره باز شود.
                     */

                    closeForGradeEntry();


                    if (
                        window.ProfileScreen &&
                        typeof ProfileScreen.showProfiles ===
                            "function"
                    ) {

                        ProfileScreen.showProfiles();

                        return;

                    }


                    if (
                        window.Screen &&
                        typeof Screen.showProfile ===
                            "function"
                    ) {

                        Screen.showProfile();

                    }

                }
            );

        }


        const backButton =
            document.getElementById(
                "tahouriLicenseNoProfileBackButton"
            );


        if (backButton) {

            backButton.addEventListener(
                "click",
                function () {

                    closeContainer();

                }
            );

        }

    }


    // =========================================================
    // License Management
    // =========================================================

    function renderAddForm(
        preselectedGrade
    ) {

        if (!container) {

            return;

        }


        const grades =
            getGradeList();


        const availableGrades =
            grades.filter(
                function (grade) {

                    return Boolean(
                        grade &&
                        grade.id
                    );

                }
            );


        let gradeOptions = "";

        const renewalTargetGrade =
            availableGrades.find(function (grade) {
                return grade.id === nextGradeId;
            });

        const renewalCurrentGrade =
            availableGrades.find(function (grade) {
                return grade.id === currentGrade;
            });

        if (activated) {
            if (renewalTargetGrade) {
                gradeOptions += `
                    <option value="${renewalTargetGrade.id}" selected>
                        ${renewalTargetGrade.title || renewalTargetGrade.name || renewalTargetGrade.id} — پایه سال بعد
                    </option>
                `;
            }

            if (!renewalTargetGrade) {
                gradeOptions += `
                    <option value="" selected disabled>
                        پایه بعدی در پلتفرم موجود نیست
                    </option>
                `;
            }

            if (renewalCurrentGrade) {
                gradeOptions += `
                    <option value="${renewalCurrentGrade.id}" disabled>
                        ${renewalCurrentGrade.title || renewalCurrentGrade.name || renewalCurrentGrade.id} — تکرار پایه
                    </option>
                `;
            }
        } else {
            availableGrades.forEach(function (grade) {
                const selected =
                    preselectedGrade && grade.id === preselectedGrade
                        ? "selected"
                        : "";

                gradeOptions += `
                    <option value="${grade.id}" ${selected}>
                        ${grade.title || grade.name || grade.id}
                    </option>
                `;
            });
        }

        const hasAvailableGrades =
            availableGrades.length > 0;


        container.innerHTML = `

            <div class="tahouri-license-screen">

                <div class="tahouri-license-wrapper">


                    <div class="tahouri-license-header">

                        <h2>
                            🔑 مدیریت مجوزها
                        </h2>

                        <p>
                            افزودن یا فعال‌سازی مجوز پایه
                        </p>

                    </div>


                    <div class="tahouri-license-form">


                        ${
                            hasAvailableGrades

                            ?

                            `

                                <div
                                    class="tahouri-license-management-title"
                                    id="tahouriLicenseManagementTitle"
                                >
                                    فعال‌سازی یا تمدید مجوز
                                </div>


                                <div
                                    class="tahouri-license-management-text"
                                    id="tahouriLicenseManagementText"
                                >
                                    ${
                                        activated
                                            ? (
                                                (renewalTargetGrade
                                                    ? "برای سال تحصیلی بعد، پایه بعدی به‌صورت خودکار انتخاب شده است."
                                                    : "پایه بعدی هنوز در پلتفرم موجود نیست؛ فقط در صورت مردودی می‌توانید تکرار پایه را انتخاب کنید.")
                                                +
                                                (activated && renewalCurrentGrade
                                                    ? `
                                                        <label
                                                            class="tahouri-license-repeat"
                                                            style="display:flex;align-items:center;gap:8px;margin:10px 0 14px;line-height:1.8;"
                                                        >
                                                            <input
                                                                id="tahouriLicenseRepeatGrade"
                                                                type="checkbox"
                                                            />
                                                            <span>تکرار همین پایه (فقط در صورت مردودی)</span>
                                                        </label>
                                                    `
                                                    : "")
                                            )
                                            : "پایه موردنظر را انتخاب کرده و کد مجوز آن را وارد کنید."
                                    }
                                </div>


                                <label
                                    class="tahouri-license-label"
                                >
                                    پایه
                                </label>


                                <select
                                    id="tahouriLicenseGradeSelect"
                                    class="tahouri-license-select"
                                >

                                    ${gradeOptions}

                                </select>


                                <label
                                    class="tahouri-license-label"
                                >
                                    کد مجوز
                                </label>


                                <input
                                    id="tahouriActivationCode"
                                    class="tahouri-license-input"
                                    type="text"
                                    placeholder="کد مجوز را وارد کنید"
                                    autocomplete="off"
                                />


                                <div
                                    id="tahouriLicenseActivationError"
                                    style="
                                        display:none;
                                        margin-bottom:12px;
                                        padding:10px;
                                        border-radius:10px;
                                        background:#fef2f2;
                                        border:1px solid #fecaca;
                                        color:#b91c1c;
                                        text-align:center;
                                        line-height:1.8;
                                        font-size:13px;
                                    "
                                ></div>


                                <button
                                    id="tahouriActivationButton"
                                    type="button"
                                    class="tahouri-license-button"
                                >
                                    ✅ فعال‌سازی / تمدید مجوز
                                </button>

                            `

                            :

                            `

                                <div
                                    class="tahouri-license-status active"
                                >
                                    ✅ تمام پایه‌های موجود دارای
                                    مجوز فعال هستند.
                                </div>

                            `
                        }


                        <button
                            id="tahouriActivationBackButton"
                            type="button"
                            class="tahouri-license-button secondary tahouri-license-back"
                        >
                            ↩️ بازگشت
                        </button>


                    </div>

                </div>

            </div>

        `;


        // =====================================================
        // Activation
        // =====================================================

        const activationButton =
            document.getElementById(
                "tahouriActivationButton"
            );


        if (activationButton) {

            activationButton.addEventListener(
                "click",
                async function () {

                    await activateLicense();

                }
            );

        }


        const codeInput =
            document.getElementById(
                "tahouriActivationCode"
            );


        if (codeInput) {

            codeInput.addEventListener(
                "keydown",
                async function (event) {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        await activateLicense();

                    }

                }
            );


            setTimeout(
                function () {

                    codeInput.focus();

                },
                100
            );

        }


        const backButton =
            document.getElementById(
                "tahouriActivationBackButton"
            );


        if (backButton) {

            backButton.addEventListener(
                "click",
                function () {

                    renderList();

                }
            );

        }

    }


    // =========================================================
    // Show Management Error
    // =========================================================

    function showManagementError(
        message
    ) {

        const element =
            document.getElementById(
                "tahouriLicenseActivationError"
            );


        if (!element) {

            alert(
                message ||
                "خطایی رخ داد."
            );

            return;

        }


        element.textContent =
            message ||
            "خطایی رخ داد.";


        element.style.display =
            "block";

    }


    // =========================================================
    // Show Management Success
    // =========================================================

    function showManagementSuccess(
        message
    ) {

        const element =
            document.getElementById(
                "tahouriLicenseActivationError"
            );

        if (!element) {
            return;
        }

        element.textContent =
            message ||
            "عملیات با موفقیت انجام شد.";

        element.style.display =
            "block";

        element.style.background =
            "#e9f7ef";

        element.style.borderColor =
            "#bfe5ce";

        element.style.color =
            "#187744";

    }


    // =========================================================
    // Activate License
    // =========================================================

    async function activateLicense() {

        const gradeSelect =
            document.getElementById(
                "tahouriLicenseGradeSelect"
            );


        const codeInput =
            document.getElementById(
                "tahouriActivationCode"
            );


        if (
            !gradeSelect ||
            !codeInput
        ) {

            return;

        }


        const repeatCheckbox =
            document.getElementById("tahouriLicenseRepeatGrade");

        const selectedGrade =
            gradeSelect.value;

        const activeProfileForRenewal =
            getActiveProfile();

        const grade =
            repeatCheckbox && repeatCheckbox.checked && activeProfileForRenewal
                ? activeProfileForRenewal.grade
                : selectedGrade;

        const renewalMode =
            repeatCheckbox && repeatCheckbox.checked
                ? "repeat"
                : "promotion";

        const code =
            codeInput.value.trim();


        if (!grade) {

            showManagementError(
                "لطفاً پایه را انتخاب کنید."
            );

            return;

        }


        if (!code) {

            showManagementError(
                "لطفاً کد مجوز را وارد کنید."
            );

            return;

        }


        if (
            !window.LicenseManager
        ) {

            showManagementError(
                "مدیریت مجوز در دسترس نیست."
            );

            return;

        }


        const activeProfile =
            getActiveProfile();

        const hasActiveProfileLicense =
            Boolean(
                activeProfile &&
                activeProfile.grade &&
                isGradeActivated(activeProfile.grade)
            );

        const remoteProduction =
            Boolean(
                window.TahouriServiceConfig &&
                window.TahouriServiceConfig.mode === "production"
            );

        let result =
            null;


        try {

            if (
                remoteProduction ||
                hasActiveProfileLicense
            ) {

                if (!activeProfile || !activeProfile.studentId) {
                    showManagementError(
                        "شناسهٔ پروفایل فعال برای صدور مجوز پیدا نشد."
                    );
                    return;
                }

                if (
                    typeof LicenseManager.activateRemote !==
                    "function"
                ) {
                    showManagementError(
                        "سرویس فعال‌سازی آنلاین در دسترس نیست."
                    );
                    return;
                }

                result =
                    await LicenseManager.activateRemote(
                        code,
                        grade,
                        activeProfile.studentId,
                        renewalMode
                    );

            }
            else if (
                typeof LicenseManager.activate ===
                    "function"
            ) {

                result =
                    LicenseManager.activate(
                        code,
                        grade
                    );

            }
            else {

                showManagementError(
                    "مدیریت مجوز در دسترس نیست."
                );

                return;

            }

        }
        catch (error) {

            console.error(
                "License Screen: License activation failed.",
                error
            );


            showManagementError(
                "خطایی هنگام فعال‌سازی رخ داد."
            );


            return;

        }


        /*
         * ActivationGate v7.0 از result.valid استفاده می‌کند.
         *
         * success:true نیز برای سازگاری با نسخه‌های
         * قدیمی‌تر پذیرفته می‌شود.
         */

        const valid =
            result &&
            (
                result.valid === true ||
                result.success === true
            );


        if (!valid) {

            showManagementError(

                result &&
                result.message

                    ?

                    result.message

                    :

                    "کد مجوز معتبر نیست یا فعال‌سازی انجام نشد."

            );


            return;

        }


        console.log(
            result.renewalStored === true
                ? "License Screen: Renewal stored successfully."
                : "License Screen: License activated successfully.",
            result.license || result
        );

        if (result.renewalStored === true) {

            showManagementSuccess(
                "تمدید مجوز برای سال تحصیلی بعد با موفقیت ثبت شد."
            );

            setTimeout(
                function () {
                    renderList();
                },
                900
            );

            return;

        }


        /*
         * مهم:
         *
         * پس از فعال‌سازی ورود خودکار انجام نمی‌شود.
         *
         * ابتدا مسیر پروفایل و وضعیت جدید مجوز نمایش داده می‌شود.
         * سپس کاربر خودش دکمه «ورود» را فشار می‌دهد.
         */

        renderList();

    }


    // =========================================================
    // Public Open
    // =========================================================

    function open(
        target,
        options
    ) {

        options =
            options || {};


        returnToGate =
            options.returnToGate === true;


        injectStyles();


        if (
            target &&
            typeof target === "object"
        ) {

            container =
                getTargetContainer(
                    target
                );


            overlayMode =
                false;

        }
        else {

            container =
                createOverlayContainer();

        }


        renderList();

    }


    // =========================================================
    // Public API
    // =========================================================

    window.LicenseScreen = {

        open:
            open

    };


    // =========================================================
    // Ready
    // =========================================================

    console.log(
        "License Screen v4.2 Ready"
    );

})();