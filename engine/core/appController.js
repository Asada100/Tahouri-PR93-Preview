// =====================================
// Tahouri Edu Platform
// App Controller v5.4
// =====================================

const App = {

    grades: [],
    subjects: [],
    chapters: [],
    activities: [],

    init: async function () {

        console.log("App Controller Started");

        const loaded = await this.loadData();

        if (!loaded) {
            console.error("App startup stopped because required data could not be loaded.");
            return false;
        }

        if (
            typeof ContentLockManager !== "undefined" &&
            typeof ContentLockManager.waitUntilReady === "function"
        ) {
            const locksLoaded = await ContentLockManager.waitUntilReady();

            if (locksLoaded === false) {
                console.warn(
                    "App startup: Content lock file could not be loaded; safe default locks remain active."
                );
            }
        }

        Screen.showHome();
        return true;
    },

    loadData: async function () {

        try {
            this.grades = await DataManager.loadJSON("data/grades.json");
            this.subjects = await DataManager.loadJSON("data/subjects.json");
            this.chapters = await DataManager.loadJSON("data/chapters.json");

            // Activities are the live activity index. Use a cache-busting
            // query so a previously cached GitHub Pages response cannot
            // leave App.activities behind the current data file.
            this.activities = await DataManager.loadJSON(
                "data/activities.json?v=" + Date.now()
            );

            grades = this.grades;
            subjects = this.subjects;
            chapters = this.chapters;
            activities = this.activities;

            console.log("All Data Loaded");
            return true;
        }
        catch (error) {
            console.error("Loading Error", error);
            return false;
        }
    },

    showHome: function () {
        Screen.showHome();
    },

    showGrades: function () {
        Screen.showGrades();
    },

    showSubjects: function () {
        Screen.showSubjects(AppState.grade);
    },

    showChapters: function () {
        Screen.showChapters(AppState.grade, AppState.subject);
    },

    showActivities: function () {
        Screen.showActivities(
            AppState.grade,
            AppState.subject,
            AppState.chapter
        );
    },

    // Resolve a loaded activity by its stable activity id.
    // Session restore and dashboard resume use this resolver so they
    // can work from App.activities without duplicating data loading.
    resolveActivityById: function (activityId) {
        if (!activityId || !Array.isArray(this.activities)) return null;

        return this.activities.find(function (activity) {
            return activity && activity.id === activityId;
        }) || null;
    },

    startActivity: async function (activity, difficultyAlreadySelected) {

        if (!activity) {
            console.error("Activity Missing");
            return false;
        }

        // Only Jigsaw activities require the difficulty modal.
        // Activity index entries contain routing metadata, so inspect the
        // actual activity definition before deciding whether this is Jigsaw.
        let isJigsaw = false;

        if (
            String(activity.type || "").toLowerCase() === "puzzle" &&
            String(activity.engine || "").toLowerCase() === "puzzle" &&
            !difficultyAlreadySelected &&
            !(activity.settings && activity.settings.jigsawLevelSelected === true) &&
            activity.path &&
            typeof DataManager !== "undefined" &&
            typeof DataManager.loadJSON === "function"
        ) {
            try {
                const config = await DataManager.loadJSON(
                    activity.path + "/activity.json"
                );

                isJigsaw =
                    config &&
                    config.puzzle &&
                    String(config.puzzle.type || "").toLowerCase() === "jigsaw";
            }
            catch (error) {
                console.warn(
                    "App Controller: Could not inspect activity type before difficulty selection.",
                    error
                );
            }
        }

        if (isJigsaw && typeof DifficultyModal !== "undefined" && typeof DifficultyModal.open === "function") {
            DifficultyModal.open(activity, function (selectedActivity) {
                if (selectedActivity && selectedActivity.settings) {
                    selectedActivity.settings.jigsawLevelSelected = true;
                }
                App.startActivity(selectedActivity, true);
            });
            return true;
        }

        try {
            return await ActivityManager.load(activity);
        }
        catch (error) {
            console.error("Activity Start Error", error);
            return false;
        }
    }
};

window.App = App;
window.AppController = App;

console.log("App Controller v5.4 Ready");