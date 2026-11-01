// =====================================
// Tahouri Edu Platform
// Version 5.4
// Screen Manager
//
// Profile Integrated
//
// Responsibilities:
// - Home
// - Daily Message
// - Active Grade
// - Subjects
// - Chapters
// - Activity List Bridge
// - Dashboard Bridge
// - Reports Bridge
// - Finish Bridge
// - Profile Bridge
//
// No CSS
// No class syntax
// =====================================


const Screen = {

    // =====================================
    // PROFILE HELPERS
    // =====================================

    getActiveProfile: function () {

        if (
            typeof ProfileManager !==
            "undefined"
            &&
            typeof ProfileManager.get ===
            "function"
        ) {

            return ProfileManager.get();

        }

        return null;

    },


    getProfileGrade: function () {

        const profile =
            Screen.getActiveProfile();


        if (
            !profile ||
            !profile.grade
        ) {

            return null;

        }


        return profile.grade;

    },


    // =====================================
    // HOME SCREEN
    // =====================================

    showHome: function () {

        console.trace(
            "Screen.showHome CALL STACK",
            {
                resultModalPresent:
                    !!document.getElementById("resultModal")
            }
        );

        // A finished activity must remain on the result modal until
        // the user explicitly chooses a result action.
        // ResultModal's own Home button closes the modal before calling Home.
        const resultModal = document.getElementById("resultModal");
        if (resultModal) {
            console.warn("Screen.showHome: Home navigation blocked while result modal is open.");
            return false;
        }

        const app =
            document.getElementById("app");


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        // =====================================
        // DAILY MESSAGE
        // =====================================

        let dailyMessage = null;


        if (
            typeof DailyMessageManager !==
            "undefined" &&

            typeof DailyMessageManager.getTodayMessage ===
            "function"
        ) {

            dailyMessage =
                DailyMessageManager.getTodayMessage();

        }


        // =====================================
        // DAILY MESSAGE HTML
        // =====================================

        let dailyMessageHTML = "";


        if (dailyMessage) {

            dailyMessageHTML = `

                <div class="daily-message-home">

                    <div class="daily-message-home-icon">
                        ${dailyMessage.icon || "💡"}
                    </div>

                    <div class="daily-message-home-content">

                        <h2>
                            💬 پیام امروز
                        </h2>

                        <p>
                            ${dailyMessage.text}
                        </p>

                    </div>

                    <button
                        id="dailyMessageHomeBtn"
                        type="button">

                        متوجه شدم

                    </button>

                </div>

            `;

        }


        // =====================================
        // HOME HTML
        // =====================================

        app.innerHTML = `

            <div class="screen">

                <h1>
                    پلتفرم آموزشی طهوری
                </h1>


                <p>
                    به مرکز کنترل پلتفرم خوش آمدید
                </p>


                <hr>


                ${dailyMessageHTML}


                ${
                    dailyMessageHTML
                        ? "<hr>"
                        : ""
                }


                <div class="home-buttons">

                    <button
                        id="gradesBtn"
                        type="button">

                        🎓 انتخاب پایه

                    </button>


                    <button
                        id="profileBtn"
                        type="button">

                        👤 پروفایل من

                    </button>


                    <button
                        id="dashboardBtn"
                        type="button">

                        📊 داشبورد

                    </button>


                    <button
                        id="reportsBtn"
                        type="button">

                        📈 گزارش‌ها

                    </button>

                </div>

            </div>

        `;


        // =====================================
        // DAILY MESSAGE BUTTON
        // =====================================

        const dailyMessageButton =
            document.getElementById(
                "dailyMessageHomeBtn"
            );


        if (dailyMessageButton) {

            dailyMessageButton.onclick =
                function () {

                    if (
                        typeof DailyMessageManager !==
                        "undefined" &&

                        typeof DailyMessageManager.markAsViewed ===
                        "function"
                    ) {

                        DailyMessageManager.markAsViewed();

                    }


                    dailyMessageButton.textContent =
                        "✓ مشاهده شد";


                    dailyMessageButton.disabled =
                        true;


                    console.log(
                        "Screen: Daily Message Viewed"
                    );

                };

        }


        // =====================================
        // GRADES
        // =====================================

        const gradesButton =
            document.getElementById(
                "gradesBtn"
            );


        if (gradesButton) {

            gradesButton.onclick =
                function () {

                    Screen.showGrades();

                };

        }


        // =====================================
        // PROFILE
        // =====================================

        const profileButton =
            document.getElementById(
                "profileBtn"
            );


        if (profileButton) {

            profileButton.onclick =
                function () {

                    Screen.showProfile();

                };

        }


        // =====================================
        // DASHBOARD
        // =====================================

        const dashboardButton =
            document.getElementById(
                "dashboardBtn"
            );


        if (dashboardButton) {

            dashboardButton.onclick =
                function () {

                    if (
                        typeof Navigation !==
                        "undefined"
                    ) {

                        Navigation.openDashboard();

                    }
                    else {

                        console.error(
                            "Navigation Not Available"
                        );

                    }

                };

        }


        // =====================================
        // REPORTS
        // =====================================

        const reportsButton =
            document.getElementById(
                "reportsBtn"
            );


        if (reportsButton) {

            reportsButton.onclick =
                function () {

                    if (
                        typeof ReportsController !==
                        "undefined"

                        &&

                        typeof ReportsController.open ===
                        "function"
                    ) {

                        ReportsController.open();

                    }
                    else {

                        console.error(
                            "ReportsController Not Available"
                        );

                    }

                };

        }


        console.log(
            "Home Screen Displayed"
        );


        console.log(
            "Home Daily Message:",
            dailyMessage
        );


        // =====================================
        // OPTIONAL UPDATE NOTICE
        // =====================================
        // Never blocks Home or offline use.
        if (
            typeof TahouriUpdateManager !== "undefined" &&
            typeof TahouriUpdateManager.checkHome === "function"
        ) {
            TahouriUpdateManager.checkHome();
        }

    },


    // =====================================
    // PROFILE SCREEN
    // =====================================

    showProfile: function () {

        if (
            typeof ProfileScreen ===
            "undefined"
        ) {

            console.error(
                "ProfileScreen Not Found"
            );

            return;

        }


        if (
            typeof ProfileScreen.show !==
            "function"
        ) {

            console.error(
                "ProfileScreen.show Not Available"
            );

            return;

        }


        ProfileScreen.show();


        console.log(
            "Profile Screen Opened"
        );

    },


    // =====================================
    // GRADES SCREEN
    // =====================================

    showGrades: function () {

        const app =
            document.getElementById("app");


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        // =====================================
        // Profile Check
        // =====================================

        const profile =
            Screen.getActiveProfile();


        const profileGrade =
            Screen.getProfileGrade();


        if (
            !profile ||
            !profileGrade
        ) {

            app.innerHTML = `

                <div class="screen">

                    <h1>
                        پلتفرم آموزشی طهوری
                    </h1>

                    <h2>
                        پروفایل دانش‌آموز
                    </h2>

                    <p>
                        پروفایل دانش‌آموز مشخص نیست.
                    </p>

                    <p>
                        ابتدا یک پروفایل ایجاد یا انتخاب کنید.
                    </p>

                    <br>

                    <button
                        id="profileFromGradesBtn">

                        👤 پروفایل

                    </button>

                    <button
                        id="backHomeBtn">

                        🏠 بازگشت به خانه

                    </button>

                </div>

            `;


            const profileButton =
                document.getElementById(
                    "profileFromGradesBtn"
                );


            if (profileButton) {

                profileButton.onclick =
                    function () {

                        Screen.showProfile();

                    };

            }


            const backButton =
                document.getElementById(
                    "backHomeBtn"
                );


            if (backButton) {

                backButton.onclick =
                    function () {

                        Screen.showHome();

                    };

            }


            console.warn(
                "Screen: No Active Student Profile."
            );

            return;

        }


        // =====================================
        // Check License Manager
        // =====================================

        if (
            typeof LicenseManager ===
            "undefined"
        ) {

            console.error(
                "LicenseManager Not Available"
            );

            return;

        }


        // =====================================
        // Profile Grade License
        // =====================================

        const profileGradeActivated =
            LicenseManager.isGradeActivated(
                profileGrade
            );


        // =====================================
        // Grade Title
        // =====================================

        const allGrades =
            LicenseManager.getGrades();


        const profileGradeTitle =
            allGrades[profileGrade] ||
            profileGrade;


        // =====================================
        // NOT ACTIVATED
        // =====================================

        if (!profileGradeActivated) {

            app.innerHTML = `

                <div class="screen">

                    <h1>
                        پلتفرم آموزشی طهوری
                    </h1>

                    <h2>
                        پایه دانش‌آموز
                    </h2>

                    <p>
                        پروفایل فعال:
                        <strong>
                            ${profile.name || "دانش‌آموز"}
                        </strong>
                    </p>

                    <p>
                        پایه:
                        <strong>
                            ${profileGradeTitle}
                        </strong>
                    </p>

                    <p>
                        مجوز استفاده از این پایه
                        برای سال تحصیلی جاری فعال نیست.
                    </p>

                    <br>

                    <button
                        id="activateProfileGradeBtn">

                        🔐 فعال‌سازی ${profileGradeTitle}

                    </button>

                    <button
                        id="backHomeBtn">

                        🏠 بازگشت به خانه

                    </button>

                </div>

            `;


            const activateButton =
                document.getElementById(
                    "activateProfileGradeBtn"
                );


            if (activateButton) {

                activateButton.onclick =
                    function () {

                        if (
                            typeof ActivationGate !==
                            "undefined"
                            &&
                            typeof ActivationGate.openGrade ===
                            "function"
                        ) {

                            ActivationGate.openGrade(
                                profileGrade
                            );

                        }
                        else {

                            console.error(
                                "ActivationGate.openGrade Not Available"
                            );

                        }

                    };

            }


            const backButton =
                document.getElementById(
                    "backHomeBtn"
                );


            if (backButton) {

                backButton.onclick =
                    function () {

                        Screen.showHome();

                    };

            }


            console.log(
                "Profile Grade Not Activated:",
                profileGrade
            );

            return;

        }


        // =====================================
        // ONLY PROFILE GRADE
        // =====================================

        app.innerHTML = `

            <div class="screen">

                <h1>
                    پلتفرم آموزشی طهوری
                </h1>


                <h2>
                    پایه دانش‌آموز
                </h2>


                <p>
                    پروفایل فعال:
                    <strong>
                        ${profile.name || "دانش‌آموز"}
                    </strong>
                </p>


                <div id="gradesContainer">

                    <button
                        class="gradeBtn"
                        data-id="${profileGrade}">

                        🎓 ${profileGradeTitle}

                    </button>

                </div>


                <p
                    style="
                        margin-top:15px;
                        color:#666;
                    "
                >
                    پایه تحصیلی از پروفایل دانش‌آموز
                    تعیین می‌شود.
                </p>


                <br>


                <button
                    id="backHomeBtn">

                    🏠 بازگشت به خانه

                </button>

            </div>

        `;


        // =====================================
        // Profile Grade Button
        // =====================================

        const gradeButton =
            document.querySelector(
                ".gradeBtn"
            );


        if (gradeButton) {

            gradeButton.onclick =
                function () {

                    const gradeId =
                        this.dataset.id;


                    // =================================
                    // Security Check 1
                    // =================================

                    if (
                        gradeId !==
                        Screen.getProfileGrade()
                    ) {

                        console.warn(
                            "Screen: Blocked grade outside active profile.",
                            {
                                requestedGrade:
                                    gradeId,

                                profileGrade:
                                    Screen.getProfileGrade()
                            }
                        );

                        return;

                    }


                    // =================================
                    // Security Check 2
                    // =================================

                    if (
                        !LicenseManager.isGradeActivated(
                            gradeId
                        )
                    ) {

                        alert(
                            "مجوز این پایه فعال نیست."
                        );

                        return;

                    }


                    // =================================
                    // Navigation
                    // =================================

                    if (
                        typeof Navigation !==
                        "undefined"

                        &&

                        typeof Navigation.selectGrade ===
                        "function"
                    ) {

                        Navigation.selectGrade(
                            profileGrade
                        );

                    }


                    Screen.showSubjects(
                        profileGrade
                    );

                };

        }


        // =====================================
        // Back Home
        // =====================================

        const backHomeButton =
            document.getElementById(
                "backHomeBtn"
            );


        if (backHomeButton) {

            backHomeButton.onclick =
                function () {

                    Screen.showHome();

                };

        }


        console.log(
            "Active Profile Grade Displayed:",
            {
                studentId:
                    profile.studentId,

                name:
                    profile.name,

                grade:
                    profileGrade,

                activated:
                    profileGradeActivated
            }
        );

    },


    // =====================================
    // SUBJECTS SCREEN
    // =====================================

    showSubjects: function (
        gradeId
    ) {

        const app =
            document.getElementById("app");


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        // =====================================
        // Profile Grade Security
        // =====================================

        const profileGrade =
            Screen.getProfileGrade();


        if (
            !profileGrade
        ) {

            console.warn(
                "Screen: No active profile grade."
            );

            Screen.showProfile();

            return;

        }


        if (
            gradeId !== profileGrade
        ) {

            console.warn(
                "Screen: Blocked unauthorized grade.",
                {
                    requestedGrade:
                        gradeId,

                    profileGrade:
                        profileGrade
                }
            );

            Screen.showGrades();

            return;

        }


        // =====================================
        // License Check
        // =====================================

        if (
            typeof LicenseManager !==
            "undefined"
        ) {

            if (
                !LicenseManager.isGradeActivated(
                    profileGrade
                )
            ) {

                alert(
                    "مجوز این پایه فعال نیست."
                );

                Screen.showGrades();

                return;

            }

        }


        // =====================================
        // Check Subjects
        // =====================================

        if (
            typeof subjects ===
            "undefined"
        ) {

            console.error(
                "Subjects Data Not Available"
            );

            return;

        }


        const gradeSubjects =
            subjects.filter(
                function (subject) {

                    return (
                        Array.isArray(
                            subject.grades
                        )

                        &&

                        subject.grades.includes(
                            profileGrade
                        )
                    );

                }
            );


        // =====================================
        // Render
        // =====================================

        app.innerHTML = `

            <div class="screen">

                <h1>
                    انتخاب درس
                </h1>


                <div id="subjectsContainer">

                    ${
                        gradeSubjects
                            .map(
                                function (subject) {

                                    return `

                                        <button
                                            class="subjectBtn"
                                            data-id="${subject.id}">

                                            ${subject.title}

                                        </button>

                                    `;

                                }
                            )
                            .join("")
                    }

                </div>


                <br>


                <button
                    id="backGradesBtn">

                    ⬅ بازگشت به پایه

                </button>

            </div>

        `;


        // =====================================
        // Subject Buttons
        // =====================================

        document
            .querySelectorAll(".subjectBtn")
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            const subjectId =
                                this.dataset.id;


                            if (
                                typeof Navigation !==
                                "undefined"

                                &&

                                typeof Navigation.selectSubject ===
                                "function"
                            ) {

                                Navigation.selectSubject(
                                    subjectId
                                );

                            }


                            Screen.showChapters(
                                profileGrade,
                                subjectId
                            );

                        };

                }
            );


        // =====================================
        // Back
        // =====================================

        const backButton =
            document.getElementById(
                "backGradesBtn"
            );


        if (backButton) {

            backButton.onclick =
                function () {

                    Screen.showGrades();

                };

        }


        console.log(
            "Subjects Displayed:",
            gradeSubjects.length
        );

    },


    // =====================================
    // CHAPTERS SCREEN
    // =====================================

    showChapters: function (
        gradeId,
        subjectId
    ) {

        const app =
            document.getElementById("app");


        if (!app) {

            console.error(
                "App Container Not Found"
            );

            return;

        }


        // =====================================
        // Profile Grade Security
        // =====================================

        const profileGrade =
            Screen.getProfileGrade();


        if (
            !profileGrade
        ) {

            console.warn(
                "Screen: No active profile grade."
            );

            Screen.showProfile();

            return;

        }


        if (
            gradeId !== profileGrade
        ) {

            console.warn(
                "Screen: Blocked unauthorized chapter grade.",
                {
                    requestedGrade:
                        gradeId,

                    profileGrade:
                        profileGrade
                }
            );

            Screen.showGrades();

            return;

        }


        // =====================================
        // License Check
        // =====================================

        if (
            typeof LicenseManager !==
            "undefined"
        ) {

            if (
                !LicenseManager.isGradeActivated(
                    profileGrade
                )
            ) {

                alert(
                    "مجوز این پایه فعال نیست."
                );

                Screen.showGrades();

                return;

            }

        }


        // =====================================
        // Check Chapters
        // =====================================

        if (
            typeof chapters ===
            "undefined"
        ) {

            console.error(
                "Chapters Data Not Available"
            );

            return;

        }


        const subjectChapters =
            chapters.filter(
                function (chapter) {

                    return (

                        chapter.grade ===
                        profileGrade

                        &&

                        chapter.subject ===
                        subjectId

                    );

                }
            );


        // =====================================
        // Render
        // =====================================

        app.innerHTML = `

            <div class="screen">

                <h1>
                    انتخاب فصل
                </h1>


                <div id="chaptersContainer">

                    ${
                        subjectChapters
                            .map(
                                function (chapter) {

                                    return `

                                        <button
                                            class="chapterBtn"
                                            data-id="${chapter.id}">

                                            ${chapter.title}

                                        </button>

                                    `;

                                }
                            )
                            .join("")
                    }

                </div>


                <br>


                <button
                    id="backSubjectsBtn">

                    ⬅ بازگشت به درس‌ها

                </button>

            </div>

        `;


        // =====================================
        // Chapter Buttons
        // =====================================

        document
            .querySelectorAll(".chapterBtn")
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            const chapterId =
                                this.dataset.id;


                            if (
                                typeof Navigation !==
                                "undefined"

                                &&

                                typeof Navigation.selectChapter ===
                                "function"
                            ) {

                                Navigation.selectChapter(
                                    chapterId
                                );

                            }


                            Screen.showActivities(
                                profileGrade,
                                subjectId,
                                chapterId
                            );

                        };

                }
            );


        // =====================================
        // Back
        // =====================================

        const backButton =
            document.getElementById(
                "backSubjectsBtn"
            );


        if (backButton) {

            backButton.onclick =
                function () {

                    Screen.showSubjects(
                        profileGrade
                    );

                };

        }


        console.log(
            "Chapters Displayed:",
            subjectChapters.length
        );

    },


    // =====================================
    // ACTIVITIES SCREEN
    // =====================================

    showActivities: function (
        gradeId,
        subjectId,
        chapterId
    ) {

        // =====================================
        // Profile Grade Security
        // =====================================

        const profileGrade =
            Screen.getProfileGrade();


        if (
            !profileGrade
        ) {

            console.warn(
                "Screen: No active profile grade."
            );

            Screen.showProfile();

            return;

        }


        if (
            gradeId !== profileGrade
        ) {

            console.warn(
                "Screen: Blocked unauthorized activity grade.",
                {
                    requestedGrade:
                        gradeId,

                    profileGrade:
                        profileGrade
                }
            );

            Screen.showGrades();

            return;

        }


        // =====================================
        // License Check
        // =====================================

        if (
            typeof LicenseManager !==
            "undefined"
        ) {

            if (
                !LicenseManager.isGradeActivated(
                    profileGrade
                )
            ) {

                alert(
                    "مجوز این پایه فعال نیست."
                );

                Screen.showGrades();

                return;

            }

        }


        // =====================================
        // ActivityScreen Check
        // =====================================

        if (
            typeof ActivityScreen ===
            "undefined"
        ) {

            console.error(
                "ActivityScreen Not Available"
            );

            return;

        }


        // =====================================
        // Activities Data
        // =====================================

        if (
            typeof activities ===
            "undefined"
        ) {

            console.error(
                "Activities Data Not Available"
            );

            return;

        }


        // App.activities is the authoritative activity index loaded at startup.
        // Prefer it over the legacy global alias, which may be stale in an already-open session.
        const allActivities =
            typeof App !== "undefined" && Array.isArray(App.activities)
                ? App.activities
                : activities;

        const chapterActivities =
            allActivities.filter(
                function (activity) {

                    return (

                        activity.grade ===
                        profileGrade

                        &&

                        activity.subject ===
                        subjectId

                        &&

                        activity.chapter ===
                        chapterId

                    );

                }
            );


        console.log(
            "Screen Activity Bridge:",
            {
                grade:
                    profileGrade,

                subject:
                    subjectId,

                chapter:
                    chapterId,

                count:
                    chapterActivities.length
            }
        );


        // =====================================
        // ALLOW NEW ACTIVITY FROM LEARNING PATH
        // =====================================
        // Entering the activity list is an explicit navigation boundary.
        // Clear the post-finish guard left by a previously completed activity.
        if (
            typeof ActivityManager !== "undefined" &&
            typeof ActivityManager.allowNewActivityStart === "function"
        ) {
            ActivityManager.allowNewActivityStart();
        }


        // =====================================
        // IMPORTANT
        // =====================================
        // بازی‌های فصل توسط ActivityScreen
        // نمایش داده می‌شوند.
        // اینجا مستقیماً بازی را اجرا نمی‌کنیم.

        ActivityScreen.show(
            chapterActivities
        );

    },


    // =====================================
    // DASHBOARD BRIDGE
    // =====================================

    showDashboard: function () {

        if (
            typeof Navigation !==
            "undefined"

            &&

            typeof Navigation.openDashboard ===
            "function"
        ) {

            Navigation.openDashboard();

        }
        else {

            console.error(
                "Navigation.openDashboard Not Available"
            );

        }

    },


    // =====================================
    // REPORTS BRIDGE
    // =====================================

    showReports: function () {

        if (
            typeof ReportsController !==
            "undefined"

            &&

            typeof ReportsController.open ===
            "function"
        ) {

            ReportsController.open();

        }
        else {

            console.error(
                "ReportsController Not Available"
            );

        }

    },


    // =====================================
    // FINISH BRIDGE
    // =====================================

    showFinish: function (
        result
    ) {

        console.log(
            "SHOW FINISH",
            result
        );


        if (
            typeof ResultModal !==
            "undefined"

            &&

            typeof ResultModal.show ===
            "function"
        ) {

            ResultModal.show(
                result
            );

        }
        else {

            console.error(
                "ResultModal Not Available"
            );

        }

    }

};


// =====================================
// GLOBAL ACCESS
// =====================================

window.Screen =
    Screen;


// =====================================
// READY
// =====================================

console.log(
    "Screen Manager v5.4 Ready"
);