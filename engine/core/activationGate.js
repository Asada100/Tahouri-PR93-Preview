// Tahouri Edu Platform
// Activation Gate
// Version 8.2
// Profile + License Binding
// =====================================

(function () {

    "use strict";


    // =====================================
    // State
    // =====================================

    let gateElement = null;
    let selectedGradeId = null;
    let licenseStatusReason = null;


    // =====================================
    // Profile
    // =====================================

    function getActiveProfile() {

        try {

            if (
                window.ProfileManager &&
                typeof ProfileManager.get === "function"
            ) {

                return ProfileManager.get();

            }

        }
        catch (error) {

            console.error(
                "Activation Gate: Profile read failed.",
                error
            );

        }

        return null;

    }


    function getAllProfiles() {

        try {

            if (
                window.ProfileManager &&
                typeof ProfileManager.getAll === "function"
            ) {

                return ProfileManager.getAll() || [];

            }

        }
        catch (error) {

            console.error(
                "Activation Gate: Profile list failed.",
                error
            );

        }

        return [];

    }


    function getActiveStudentId() {

        const profile =
            getActiveProfile();


        if (
            !profile ||
            !profile.studentId
        ) {

            return null;

        }


        return String(
            profile.studentId
        ).trim();

    }


    function getProfileGrade() {

        const profile =
            getActiveProfile();


        if (
            !profile ||
            !profile.grade
        ) {

            return null;

        }


        return profile.grade;

    }


    function getProfileName() {

        const profile =
            getActiveProfile();


        if (
            profile &&
            profile.name
        ) {

            return profile.name;

        }


        return "دانش‌آموز";

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
                "Activation Gate: Profile switch failed.",
                error
            );

        }


        return false;

    }


    // =====================================
    // Academic Year
    // =====================================

    function getAcademicYear() {

        try {

            if (
                window.LicenseManager &&
                typeof LicenseManager.getAcademicYearText ===
                    "function"
            ) {

                return LicenseManager.getAcademicYearText();

            }

        }
        catch (error) {

            console.error(
                "Activation Gate: Academic year unavailable.",
                error
            );

        }


        return "نامشخص";

    }


    // =====================================
    // Grade Title
    // =====================================

    function getGradeTitle(
        gradeId
    ) {

        try {

            if (
                window.LicenseManager &&
                typeof LicenseManager.getGrades ===
                    "function"
            ) {

                const grades =
                    LicenseManager.getGrades();


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

            }

        }
        catch (error) {

            console.warn(
                "Activation Gate: Grade title unavailable.",
                error
            );

        }


        return gradeId;

    }


    // =====================================
    // Create Gate
    // =====================================

    function createGate() {

        const existing =
            document.getElementById(
                "tahouriActivationGate"
            );


        if (existing) {

            gateElement =
                existing;

            return gateElement;

        }


        gateElement =
            document.createElement("div");


        gateElement.id =
            "tahouriActivationGate";


        gateElement.style.position =
            "fixed";

        gateElement.style.top =
            "0";

        gateElement.style.left =
            "0";

        gateElement.style.width =
            "100%";

        gateElement.style.height =
            "100%";

        gateElement.style.background =
            "#f5f7fb";

        gateElement.style.zIndex =
            "999999";

        gateElement.style.overflow =
            "auto";


        document.body.appendChild(
            gateElement
        );


        return gateElement;

    }


    // =====================================
    // Open License Management
    // =====================================

    function openLicenseManagement() {

        close();


        if (
            window.LicenseScreen &&
            typeof LicenseScreen.open === "function"
        ) {

            LicenseScreen.open(
                null,
                {
                    returnToGate: true
                }
            );


            return;

        }


        console.warn(
            "Activation Gate: LicenseScreen unavailable."
        );

    }


    // =====================================
    // Profile Management
    // =====================================

    function openProfileManagement() {

        close();


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

            return;

        }


        console.warn(
            "Activation Gate: Profile screen unavailable."
        );

    }


    // =====================================
    // No Profile
    // =====================================

    function renderNoProfile() {

        const gate =
            createGate();


        gate.innerHTML = `

            <div style="
                min-height:100%;
                display:flex;
                align-items:center;
                justify-content:center;
                font-family:'B Yekan',Tahoma,sans-serif;
                box-sizing:border-box;
                padding:20px;
            ">

                <div style="
                    width:100%;
                    max-width:600px;
                    background:#ffffff;
                    border-radius:20px;
                    padding:32px 24px;
                    box-sizing:border-box;
                    text-align:center;
                    box-shadow:0 5px 25px rgba(0,0,0,0.08);
                ">

                    <div style="
                        font-size:48px;
                        margin-bottom:12px;
                    ">
                        👤
                    </div>

                    <h1 style="
                        margin:0 0 14px 0;
                        color:#222;
                        font-size:24px;
                    ">
                        پروفایل دانش‌آموز
                    </h1>

                    <p style="
                        color:#666;
                        line-height:2;
                        font-size:15px;
                        margin:0 0 22px 0;
                    ">
                        برای ورود به محیط آموزشی ابتدا
                        یک پروفایل دانش‌آموز ایجاد کنید.
                    </p>

                    <button
                        id="tahouriCreateProfileButton"
                        type="button"
                        style="
                            width:100%;
                            height:46px;
                            border:0;
                            border-radius:11px;
                            background:#2563eb;
                            color:#fff;
                            font-family:'B Yekan',Tahoma,sans-serif;
                            font-size:15px;
                            font-weight:bold;
                            cursor:pointer;
                        "
                    >
                        👤 ایجاد پروفایل
                    </button>

                </div>

            </div>

        `;


        const button =
            gate.querySelector(
                "#tahouriCreateProfileButton"
            );


        if (button) {

            button.addEventListener(
                "click",
                function () {

                    close();


                    if (
                        window.ProfileScreen &&
                        typeof ProfileScreen.showCreate ===
                            "function"
                    ) {

                        ProfileScreen.showCreate();

                    }
                    else if (
                        window.ProfileScreen &&
                        typeof ProfileScreen.showProfiles ===
                            "function"
                    ) {

                        ProfileScreen.showProfiles();

                    }

                }
            );

        }

    }


    // =====================================
    // Profile License Status
    // =====================================

    function isCurrentProfileActivated(
        gradeId
    ) {

        const studentId =
            getActiveStudentId();


        if (
            !studentId ||
            !gradeId
        ) {

            return false;

        }


        try {

            if (
                window.LicenseManager &&
                typeof LicenseManager.isProfileActivated ===
                    "function"
            ) {

                return LicenseManager.isProfileActivated(
                    studentId,
                    gradeId
                );

            }


            if (
                window.LicenseManager &&
                typeof LicenseManager.isGradeActivated ===
                    "function"
            ) {

                return LicenseManager.isGradeActivated(
                    gradeId,
                    studentId
                );

            }

        }
        catch (error) {

            console.error(
                "Activation Gate: Profile license status failed.",
                error
            );

        }


        return false;

    }


    // =====================================
    // Current Profile Licenses
    // =====================================

    function getCurrentProfileLicenses() {

        const studentId =
            getActiveStudentId();


        if (!studentId) {

            return [];

        }


        try {

            if (
                window.LicenseManager &&
                typeof LicenseManager.getProfileLicenses ===
                    "function"
            ) {

                return (
                    LicenseManager.getProfileLicenses(
                        studentId
                    ) || []
                );

            }

        }
        catch (error) {

            console.error(
                "Activation Gate: Profile licenses read failed.",
                error
            );

        }


        return [];

    }


    // =====================================
    // Render Gate
    // =====================================

    function renderGate() {

        const profile =
            getActiveProfile();


        const profileGrade =
            getProfileGrade();


        const studentId =
            getActiveStudentId();


        if (
            !profile ||
            !profileGrade ||
            !studentId
        ) {

            renderNoProfile();

            return;

        }


        const gate =
            createGate();


        const profileGradeTitle =
            getGradeTitle(
                profileGrade
            );


        let profileActivated =
            false;


        let profileLicenses =
            [];


        try {

            profileActivated =
                isCurrentProfileActivated(
                    profileGrade
                );


            profileLicenses =
                getCurrentProfileLicenses();

        }
        catch (error) {

            console.error(
                "Activation Gate: LicenseManager error.",
                error
            );

        }


        const activeLicenseCount =
            profileLicenses.length;

        let licenseNotice = "";
        if (licenseStatusReason === "expired") {
            licenseNotice = "مجوز آموزشی این پروفایل به پایان رسیده است. برای ادامه، مجوز را تمدید یا کد جدید را فعال کنید.";
        } else if (licenseStatusReason === "revoked") {
            licenseNotice = "مجوز آموزشی این پروفایل لغو شده است. برای ادامه، یک مجوز معتبر دریافت و فعال کنید.";
        } else if (licenseStatusReason === "not_found") {
            licenseNotice = "مجوز ثبت‌شده برای این پروفایل در سرور پیدا نشد. لطفاً مجوز را دوباره فعال کنید.";
        } else if (licenseStatusReason === "network_error") {
            licenseNotice = "ارتباط با سرور برقرار نشد؛ در حال حاضر اعتبار امضاشده محلی استفاده می‌شود.";
        }


        // =====================================
        // Profile Dropdown
        // =====================================

        const profiles =
            getAllProfiles();


        let profileOptions =
            "";


        profiles.forEach(
            function (item) {

                if (!item) {

                    return;

                }


                const selected =
                    item.studentId ===
                    profile.studentId
                        ? "selected"
                        : "";


                profileOptions += `

                    <option
                        value="${item.studentId || ""}"
                        ${selected}
                    >
                        ${
                            item.name ||
                            "دانش‌آموز"
                        }
                    </option>

                `;

            }
        );


        gate.innerHTML = `

            <div style="
                min-height:100%;
                font-family:'B Yekan',Tahoma,sans-serif;
                box-sizing:border-box;
                padding:25px 18px 40px 18px;
            ">

                <div style="
                    width:100%;
                    max-width:760px;
                    margin:0 auto;
                ">


                    <!-- Header -->

                    <div style="
                        text-align:center;
                        margin-bottom:22px;
                    ">

                        <div style="
                            font-size:42px;
                            margin-bottom:8px;
                        ">
                            🔐
                        </div>

                        <h1 style="
                            margin:0 0 8px 0;
                            color:#222;
                            font-size:24px;
                        ">
                            ورود به محیط آموزشی
                        </h1>

                        <div style="
                            color:#666;
                            font-size:14px;
                        ">
                            سال تحصیلی ${getAcademicYear()}
                        </div>

                        ${licenseNotice ? `
                            <div style="
                                margin-top:12px;
                                padding:11px 14px;
                                border-radius:11px;
                                background:#fff7ed;
                                color:#9a3412;
                                line-height:1.9;
                                font-size:13px;
                            ">
                                ${licenseNotice}
                            </div>
                        ` : ""}

                    </div>


                    <!-- Active Profile -->

                    <div style="
                        background:#fff;
                        border-radius:18px;
                        padding:20px;
                        margin-bottom:15px;
                        box-shadow:0 4px 18px rgba(0,0,0,0.06);
                        box-sizing:border-box;
                        text-align:center;
                    ">

                        <div style="
                            font-size:30px;
                            margin-bottom:6px;
                        ">
                            👤
                        </div>

                        <div style="
                            color:#777;
                            font-size:13px;
                            margin-bottom:7px;
                        ">
                            پروفایل فعال
                        </div>


                        <select
                            id="tahouriActiveProfileSelect"
                            style="
                                width:100%;
                                height:46px;
                                padding:0 12px;
                                border:1px solid #cbd5e1;
                                border-radius:11px;
                                background:#f8fafc;
                                color:#222;
                                font-family:'B Yekan',Tahoma,sans-serif;
                                font-size:16px;
                                font-weight:bold;
                                text-align:center;
                                cursor:pointer;
                                box-sizing:border-box;
                                outline:none;
                            "
                        >

                            ${profileOptions}

                        </select>


                        <div style="
                            color:#555;
                            font-size:14px;
                            margin-top:10px;
                        ">
                            ${profileGradeTitle}
                        </div>


                        <button
                            id="tahouriSwitchProfileButton"
                            type="button"
                            style="
                                width:100%;
                                height:43px;
                                margin-top:15px;
                                border:1px solid #dbe3ec;
                                border-radius:11px;
                                background:#f8fafc;
                                color:#334155;
                                font-family:'B Yekan',Tahoma,sans-serif;
                                font-size:14px;
                                font-weight:bold;
                                cursor:pointer;
                            "
                        >
                            👥 مدیریت پروفایل‌ها
                        </button>

                    </div>


                    <!-- Current License -->

                    <div style="
                        background:#fff;
                        border-radius:18px;
                        padding:20px;
                        margin-bottom:15px;
                        box-shadow:0 4px 18px rgba(0,0,0,0.06);
                        box-sizing:border-box;
                        text-align:center;
                    ">

                        <div style="
                            font-size:34px;
                            margin-bottom:7px;
                        ">
                            ${
                                profileActivated
                                    ? "🎓"
                                    : "🔑"
                            }
                        </div>

                        <h2 style="
                            margin:0 0 9px 0;
                            color:#222;
                            font-size:20px;
                        ">
                            ${profileGradeTitle}
                        </h2>

                        <p style="
                            margin:0;
                            color:#666;
                            line-height:1.9;
                            font-size:14px;
                        ">

                            ${
                                profileActivated
                                    ? "مجوز این پایه برای این پروفایل فعال است."
                                    : "برای این پروفایل هنوز مجوز این پایه فعال نشده است."
                            }

                        </p>


                        ${
                            profileActivated
                            ? `
                                <button
                                    id="tahouriEnterGradeButton"
                                    type="button"
                                    style="
                                        width:100%;
                                        height:46px;
                                        margin:18px auto 0 auto;
                                        display:block;
                                        border:0;
                                        border-radius:11px;
                                        background:#059669;
                                        color:#fff;
                                        font-family:'B Yekan',Tahoma,sans-serif;
                                        font-size:15px;
                                        font-weight:bold;
                                        cursor:pointer;
                                    "
                                >
                                    ▶️ ورود به ${profileGradeTitle}
                                </button>
                            `
                            : `
                                <button
                                    id="tahouriShowActivationButton"
                                    type="button"
                                    style="
                                        width:100%;
                                        height:46px;
                                        margin:18px auto 0 auto;
                                        display:block;
                                        border:0;
                                        border-radius:11px;
                                        background:#2563eb;
                                        color:#fff;
                                        font-family:'B Yekan',Tahoma,sans-serif;
                                        font-size:15px;
                                        font-weight:bold;
                                        cursor:pointer;
                                    "
                                >
                                    🔑 فعال‌سازی ${profileGradeTitle}
                                </button>
                            `
                        }

                    </div>


                    <!-- License Management -->

                    <div style="
                        background:#fff;
                        border-radius:18px;
                        padding:20px;
                        margin-bottom:15px;
                        box-shadow:0 4px 18px rgba(0,0,0,0.06);
                        box-sizing:border-box;
                        text-align:center;
                    ">

                        <div style="
                            font-size:30px;
                            margin-bottom:6px;
                        ">
                            📚
                        </div>

                        <h2 style="
                            margin:0 0 8px 0;
                            color:#222;
                            font-size:19px;
                        ">
                            مدیریت مجوزها
                        </h2>

                        <p style="
                            margin:0 0 15px 0;
                            color:#666;
                            line-height:1.9;
                            font-size:13px;
                        ">
                            ${
                                activeLicenseCount
                            }
                            مجوز برای این پروفایل فعال است.
                        </p>

                        <button
                            id="tahouriManageLicensesButton"
                            type="button"
                            style="
                                width:100%;
                                height:46px;
                                border:1px solid #7c3aed;
                                border-radius:11px;
                                background:#fff;
                                color:#7c3aed;
                                font-family:'B Yekan',Tahoma,sans-serif;
                                font-size:15px;
                                font-weight:bold;
                                cursor:pointer;
                            "
                        >
                            ⚙ مدیریت مجوزها
                        </button>

                    </div>


                    <div style="
                        background:#f8fafc;
                        border-radius:15px;
                        padding:15px;
                        color:#64748b;
                        font-size:12px;
                        line-height:2;
                        text-align:center;
                        box-sizing:border-box;
                    ">

                        هر پروفایل پایه آموزشی خودش را دارد.

                        <br>

                        هر مجوز فقط برای همان پروفایل معتبر است.

                    </div>


                </div>

            </div>

        `;


        // =====================================
        // Profile Dropdown Change
        // =====================================

        const profileSelect =
            gate.querySelector(
                "#tahouriActiveProfileSelect"
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


                    if (changed !== false) {

                        renderGate();

                    }

                }
            );

        }


        // =====================================
        // Profile Management
        // =====================================

        const switchButton =
            gate.querySelector(
                "#tahouriSwitchProfileButton"
            );


        if (switchButton) {

            switchButton.addEventListener(
                "click",
                openProfileManagement
            );

        }


        // =====================================
        // Enter Grade
        // =====================================

        const enterButton =
            gate.querySelector(
                "#tahouriEnterGradeButton"
            );


        if (enterButton) {

            enterButton.addEventListener(
                "click",
                function () {

                    enterGrade(
                        profileGrade
                    );

                }
            );

        }


        // =====================================
        // Activation
        // =====================================

        const activationButton =
            gate.querySelector(
                "#tahouriShowActivationButton"
            );


        if (activationButton) {

            activationButton.addEventListener(
                "click",
                function () {

                    showActivationForm(
                        profileGrade
                    );

                }
            );

        }


        // =====================================
        // License Management
        // =====================================

        const manageButton =
            gate.querySelector(
                "#tahouriManageLicensesButton"
            );


        if (manageButton) {

            manageButton.addEventListener(
                "click",
                openLicenseManagement
            );

        }

    }


    // =====================================
    // Activation Form
    // =====================================

    function showActivationForm(
        gradeId
    ) {

        const profileGrade =
            getProfileGrade();


        const studentId =
            getActiveStudentId();


        if (
            !profileGrade ||
            !studentId ||
            gradeId !== profileGrade
        ) {

            console.warn(
                "Activation Gate: Unauthorized activation request.",
                {
                    requestedGrade:
                        gradeId,

                    profileGrade:
                        profileGrade,

                    studentId:
                        studentId
                }
            );

            return;

        }


        selectedGradeId =
            gradeId;


        const gate =
            gateElement;


        if (!gate) {

            return;

        }


        const title =
            getGradeTitle(
                gradeId
            );


        gate.innerHTML = `

            <div style="
                min-height:100%;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:20px;
                box-sizing:border-box;
                font-family:'B Yekan',Tahoma,sans-serif;
            ">

                <div style="
                    width:100%;
                    max-width:500px;
                    background:#fff;
                    border-radius:18px;
                    padding:25px;
                    box-shadow:0 5px 20px rgba(0,0,0,0.08);
                    box-sizing:border-box;
                ">

                    <div style="
                        text-align:center;
                        font-size:38px;
                        margin-bottom:10px;
                    ">
                        🔑
                    </div>

                    <h2 style="
                        margin:0 0 10px 0;
                        text-align:center;
                        color:#222;
                        font-size:21px;
                    ">
                        فعال‌سازی ${title}
                    </h2>

                    <p style="
                        margin:0 0 18px 0;
                        text-align:center;
                        color:#666;
                        line-height:2;
                        font-size:14px;
                    ">
                        کد فعال‌سازی مربوط به
                        ${title}
                        و سال تحصیلی جاری را وارد کنید.
                    </p>

                    <input
                        id="tahouriActivationCode"
                        type="text"
                        autocomplete="off"
                        placeholder="کد فعال‌سازی"
                        style="
                            width:100%;
                            height:48px;
                            box-sizing:border-box;
                            padding:0 14px;
                            border:1px solid #cbd5e1;
                            border-radius:11px;
                            font-family:Tahoma,sans-serif;
                            font-size:15px;
                            text-align:center;
                            direction:ltr;
                            margin-bottom:12px;
                            outline:none;
                        "
                    />

                    <div
                        id="tahouriActivationError"
                        style="
                            display:none;
                            padding:10px;
                            border-radius:10px;
                            background:#fef2f2;
                            color:#b91c1c;
                            text-align:center;
                            margin-bottom:12px;
                            line-height:1.8;
                            font-size:13px;
                        "
                    ></div>

                    <button
                        id="tahouriActivationButton"
                        type="button"
                        style="
                            width:100%;
                            height:48px;
                            border:0;
                            border-radius:11px;
                            background:#2563eb;
                            color:#fff;
                            font-family:'B Yekan',Tahoma,sans-serif;
                            font-size:15px;
                            font-weight:bold;
                            cursor:pointer;
                            margin-bottom:10px;
                        "
                    >
                        🔓 فعال‌سازی
                    </button>

                    <button
                        id="tahouriActivationBackButton"
                        type="button"
                        style="
                            width:100%;
                            height:44px;
                            border:1px solid #dbe3ec;
                            border-radius:11px;
                            background:#f8fafc;
                            color:#475569;
                            font-family:'B Yekan',Tahoma,sans-serif;
                            font-size:14px;
                            font-weight:bold;
                            cursor:pointer;
                        "
                    >
                        ← بازگشت
                    </button>

                </div>

            </div>

        `;


        const codeInput =
            gate.querySelector(
                "#tahouriActivationCode"
            );


        const submitButton =
            gate.querySelector(
                "#tahouriActivationButton"
            );


        const backButton =
            gate.querySelector(
                "#tahouriActivationBackButton"
            );


        if (submitButton) {

            submitButton.addEventListener(
                "click",
                activateSelectedGrade
            );

        }


        if (backButton) {

            backButton.addEventListener(
                "click",
                renderGate
            );

        }


        if (codeInput) {

            codeInput.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        activateSelectedGrade();

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

    }


    // =====================================
    // Activate Selected Grade
    // =====================================

    async function activateSelectedGrade() {

        const profileGrade =
            getProfileGrade();


        const studentId =
            getActiveStudentId();


        if (
            !profileGrade ||
            !studentId ||
            selectedGradeId !== profileGrade
        ) {

            showError(
                "این پایه با پایه پروفایل فعال یکسان نیست."
            );

            return;

        }


        const codeInput =
            document.getElementById(
                "tahouriActivationCode"
            );


        if (!codeInput) {

            return;

        }


        const code =
            codeInput.value.trim();


        if (!code) {

            showError(
                "لطفاً کد فعال‌سازی را وارد کنید."
            );

            return;

        }


        let result = null;
        const serviceConfig = window.TahouriServiceConfig || {};
        const productionMode = serviceConfig.mode === "production";
        const managedCode = /^THR-GRADE[1-6]-\d{4}-[A-F0-9]{24}$/i.test(code);

        if (typeof LicenseManager.activateRemote === "function") {
            try {
                result = await LicenseManager.activateRemote(code, profileGrade, studentId);
            } catch (error) {
                console.warn("Activation Gate: Remote activation unavailable.", error);
            }
        }

        // Codes issued by the management API must never fall through to the
        // local demo-code validator. Otherwise a network/CORS failure is
        // incorrectly shown as "invalid code".
        if (!result && managedCode) {
            result = {
                valid: false,
                message: "اتصال به سرویس فعال‌سازی برقرار نشد. سرویس محلی را اجرا کنید و مبدأ مجاز API را بررسی کنید."
            };
        }

        if (!result && !productionMode && !managedCode) {
            try {
                result = LicenseManager.activate(code, profileGrade, studentId);
            } catch (error) {
                console.error("Activation Gate: Activation failed.", error);
                showError("خطایی هنگام فعال‌سازی رخ داد.");
                return;
            }
        }

        if (!result && productionMode) {
            result = {
                valid: false,
                message: "سرویس فعال‌سازی در دسترس نیست. برای فعال‌سازی دوباره بعداً تلاش کنید."
            };
        }

        if (!result || !result.valid) {
            showError(result && result.message ? result.message : "فعال‌سازی انجام نشد.");
            return;
        }


        console.log(
            "Tahouri Activation Successful:",
            result.license
        );


        selectedGradeId =
            null;


        renderGate();

    }


    // =====================================
    // Error
    // =====================================

    function showError(
        message
    ) {

        const errorElement =
            document.getElementById(
                "tahouriActivationError"
            );


        if (!errorElement) {

            return;

        }


        errorElement.textContent =
            message ||
            "خطایی رخ داد.";


        errorElement.style.display =
            "block";

    }


    // =====================================
    // Remote License Revalidation
    // =====================================

    async function revalidateCurrentLicense() {

        if (
            window.LicenseManager &&
            typeof LicenseManager.refreshRemoteLicenseStatus ===
                "function"
        ) {

            const result =
                await LicenseManager.refreshRemoteLicenseStatus();

            if (
                result &&
                result.valid === true
            ) {
                licenseStatusReason = null;
                return true;
            }

            // A network failure must not destroy the signed offline
            // entitlement; the local verifier remains the fallback.
            const serviceConfig = window.TahouriServiceConfig || {};

            if (
                serviceConfig.mode === "test" &&
                result &&
                result.reason === "no_remote_entitlement"
            ) {
                licenseStatusReason = null;
                return isCurrentProfileActivated(
                    getProfileGrade()
                );
            }

            if (
                result &&
                result.reason === "network_error"
            ) {
                licenseStatusReason = "network_error";
                return isCurrentProfileActivated(
                    getProfileGrade()
                );
            }

            licenseStatusReason = result && result.reason
                ? result.reason
                : "invalid";
            return false;

        }

        return isCurrentProfileActivated(
            getProfileGrade()
        );

    }


    // =====================================
    // Enter Grade
    // =====================================

    async function enterGrade(
        gradeId
    ) {

        const profile =
            getActiveProfile();


        const profileGrade =
            getProfileGrade();


        const studentId =
            getActiveStudentId();


        if (
            !profile ||
            !profileGrade ||
            !studentId ||
            gradeId !== profileGrade
        ) {

            console.warn(
                "Activation Gate: Unauthorized grade entry.",
                {
                    requestedGrade:
                        gradeId,

                    profileGrade:
                        profileGrade,

                    studentId:
                        studentId,

                    profile:
                        profile
                }
            );


            renderGate();


            return;

        }


        if (
            !await revalidateCurrentLicense()
        ) {

            renderGate();


            showActivationForm(
                profileGrade
            );


            return;

        }


        close();


        try {

            if (
                window.Navigation &&
                typeof Navigation.selectGrade ===
                    "function"
            ) {

                console.log(
                    "Navigation: Selected Grade From Active Profile:",
                    {
                        studentId:
                            studentId,

                        profileGrade:
                            profileGrade
                    }
                );


                Navigation.selectGrade(
                    profileGrade
                );


                // After a newly created profile is activated,
                // return to the normal Home screen.
                // On refresh/startup AppController already does this;
                // keep the first-run path consistent without changing
                // Navigation or any existing architecture.
                if (
                    window.Screen &&
                    typeof Screen.showHome ===
                        "function"
                ) {

                    Screen.showHome();

                }


                return;

            }


            if (
                window.Router &&
                typeof Router.goTo ===
                    "function"
            ) {

                Router.goTo(
                    "grade",
                    {
                        gradeId:
                            profileGrade
                    }
                );

            }

        }
        catch (error) {

            console.error(
                "Activation Gate: Navigation failed.",
                error
            );

        }

    }


    // =====================================
    // Initialize
    // =====================================

    async function initialize() {

        console.log(
            "Activation Gate: Initializing..."
        );

        if (
            window.LicenseManager &&
            typeof LicenseManager.initializeRemoteEntitlement === "function"
        ) {
            await LicenseManager.initializeRemoteEntitlement();
        }

        // Revalidate an already bound remote license at startup.
        // Network errors keep the signed local entitlement as fallback.
        if (
            getActiveStudentId() &&
            getProfileGrade() &&
            window.LicenseManager &&
            typeof LicenseManager.refreshRemoteLicenseStatus === "function"
        ) {
            await revalidateCurrentLicense();
        }

        renderGate();

    }


    // =====================================
    // Open
    // =====================================

    function open() {

        const licenseContainer =
            document.getElementById(
                "tahouriLicenseContainer"
            );


        if (licenseContainer) {

            licenseContainer.remove();

        }


        if (!gateElement) {

            createGate();

        }


        renderGate();

    }


    // =====================================
    // Close
    // =====================================

    function close() {

        const element =
            document.getElementById(
                "tahouriActivationGate"
            );


        if (element) {

            element.remove();

        }


        gateElement =
            null;


        selectedGradeId =
            null;

    }


    // =====================================
    // Is Activated
    // =====================================

    function isActivated() {

        const profileGrade =
            getProfileGrade();


        const studentId =
            getActiveStudentId();


        if (
            !profileGrade ||
            !studentId
        ) {

            return false;

        }


        return isCurrentProfileActivated(
            profileGrade
        );

    }


    // =====================================
    // Is Grade Activated
    // =====================================

    function isGradeActivated(
        gradeId
    ) {

        const profileGrade =
            getProfileGrade();


        const studentId =
            getActiveStudentId();


        if (
            !gradeId ||
            !profileGrade ||
            !studentId
        ) {

            return false;

        }


        if (
            gradeId !== profileGrade
        ) {

            return false;

        }


        return isCurrentProfileActivated(
            gradeId
        );

    }


    // =====================================
    // Open Grade
    // =====================================

    async function openGrade(
        gradeId
    ) {

        const profileGrade =
            getProfileGrade();


        const studentId =
            getActiveStudentId();


        if (
            !profileGrade ||
            !studentId
        ) {

            open();

            return false;

        }


        if (
            gradeId !== profileGrade
        ) {

            console.warn(
                "Activation Gate: openGrade blocked.",
                {
                    requestedGrade:
                        gradeId,

                    profileGrade:
                        profileGrade,

                    studentId:
                        studentId
                }
            );


            open();


            return false;

        }


        if (
            !isCurrentProfileActivated(
                profileGrade
            )
        ) {

            open();


            showActivationForm(
                profileGrade
            );


            return false;

        }


        await enterGrade(
            profileGrade
        );


        return true;

    }


    // =====================================
    // Public API
    // =====================================

    window.ActivationGate = {

        open:
            open,

        close:
            close,

        isActivated:
            isActivated,

        isGradeActivated:
            isGradeActivated,

        openGrade:
            openGrade,

        openLicenseManagement:
            openLicenseManagement,

        openProfileManagement:
            openProfileManagement

    };


    // =====================================
    // Initialize
    // =====================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    }
    else {

        initialize();

    }


    console.log(
        "Activation Gate v8.1 Ready"
    );

})();