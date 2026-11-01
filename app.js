// =====================================
// Tahouri Edu Platform
// Version 5.1
// app.js
//
// Compatibility Shell
//
// Responsibilities:
// - Platform startup
// - Legacy navigation wrappers
//
// Main Application Controller:
// engine/core/appController.js
// =====================================


console.log(
    "Tahouri Edu Platform Started"
);


// =====================================
// APP CONTAINER
// =====================================

const app =
    document.getElementById(
        "app"
    );


// =====================================
// GLOBAL DATA
// =====================================
//
// These globals are still preserved because
// existing Screen / Activity code uses them.
//
// Real data loading remains in App.loadData().
// =====================================

let grades = [];

let subjects = [];

let chapters = [];

let activities = [];


// =====================================
// LEGACY NAVIGATION WRAPPERS
// =====================================

function showGrades() {

    Screen.showGrades();

}


function showSubjects(
    gradeId
) {

    Screen.showSubjects(
        gradeId
    );

}


function showChapters(
    gradeId,
    subjectId
) {

    Screen.showChapters(
        gradeId,
        subjectId
    );

}


function showActivities(
    gradeId,
    subjectId,
    chapterId
) {

    Screen.showActivities(
        gradeId,
        subjectId,
        chapterId
    );

}


// =====================================
// LEGACY ACTIVITY LOADER
// =====================================
//
// Kept temporarily for compatibility.
//
// New UI must use:
// App.startActivity(activity)
//
// This function is NOT the official
// Activity entry point anymore.
// =====================================

function loadActivity(
    activity
) {

    if (!activity) {

        console.error(
            "Activity Not Found"
        );

        return;

    }


    if (
        typeof App !==
        "undefined"
        &&
        typeof App.startActivity ===
        "function"
    ) {

        App.startActivity(
            activity
        );

        return;

    }


    console.error(
        "App.startActivity Not Available"
    );

}


// =====================================
// FIND ACTIVITY
// =====================================

function getActivityById(
    activityId
) {

    return activities.find(
        function (item) {

            return (
                item.id ===
                activityId
            );

        }
    );

}


// =====================================
// LEGACY START ACTIVITY
// =====================================
//
// Kept temporarily so old code does not
// break.
//
// Official path:
// App.startActivity(activity)
// =====================================

function startActivity(
    activityId
) {

    const activity =
        getActivityById(
            activityId
        );


    if (!activity) {

        console.error(
            "Activity Missing:",
            activityId
        );

        return;

    }


    Navigation.selectActivity(
        activityId
    );


    loadActivity(
        activity
    );

}


// =====================================
// RESTART ACTIVITY
// =====================================

function restartActivity() {

    if (
        typeof App !==
        "undefined"
        &&
        typeof App.restartActivity ===
        "function"
    ) {

        return App.restartActivity();

    }


    console.error(
        "App.restartActivity Not Available"
    );

}


// =====================================
// HOME
// =====================================

function goHome() {

    if (
        typeof App !==
        "undefined"
        &&
        typeof App.goHome ===
        "function"
    ) {

        App.goHome();

        return;

    }


    Screen.showHome();

}


// =====================================
// DASHBOARD
// =====================================

function openDashboard() {

    if (
        typeof App !==
        "undefined"
        &&
        typeof App.openDashboard ===
        "function"
    ) {

        App.openDashboard();

        return;

    }


    Navigation.openDashboard();

}


// =====================================
// REPORTS
// =====================================

function openReports() {

    if (
        typeof App !==
        "undefined"
        &&
        typeof App.openReports ===
        "function"
    ) {

        App.openReports();

        return;

    }


    Screen.showReports();

}


// =====================================
// READY
// =====================================

console.log(
    "App.js Compatibility Shell Ready"
);


// =====================================
// JIGSAW UI BRIDGE
// =====================================
//
// JigsawScreen is loaded before this compatibility
// shell. Its implementation exposes init(), but the
// file itself intentionally does not auto-initialize.
// Connect it here after all screen scripts are loaded.
// This keeps PuzzleScreen's existing handlers intact
// and lets the dedicated JigsawScreen own jigsaw UI.
// =====================================

if (
    typeof JigsawScreen !==
    "undefined"
    &&
    typeof JigsawScreen.init ===
    "function"
) {

    JigsawScreen.init();

    if (
        typeof EventManager !==
        "undefined"
    ) {

        EventManager.on(
            "activityResumed",
            function (
                session
            ) {

                if (
                    !session
                    ||
                    typeof PuzzleEngine ===
                    "undefined"
                    ||
                    !PuzzleEngine.puzzle
                    ||
                    PuzzleEngine.puzzle.type !==
                    "jigsaw"
                ) {

                    return;

                }


                JigsawScreen.render(
                    PuzzleEngine.getState()
                );

            }
        );

    }

}


// =====================================
// START APPLICATION
// =====================================

if (
    typeof App !==
    "undefined"
    &&
    typeof App.init ===
    "function"
) {

    App.init();

}
else {

    console.error(
        "App Controller Not Available"
    );

}