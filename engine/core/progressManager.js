// =====================================
// Tahouri Edu Platform
// Version 1.1
// Progress Manager
// Compatibility Facade
// ProgressTracker is the single source of truth
// =====================================

const ProgressManager = {

    progress: {
        currentGrade: null,
        currentSubject: null,
        currentChapter: null,
        currentActivity: null,
        completedActivities: [],
        unlockedActivities: []
    },


    sync: function () {

        if (
            typeof ProgressTracker === "undefined" ||
            typeof ProgressTracker.getAll !== "function"
        ) {
            return this.progress;
        }

        const tracked =
            ProgressTracker.getAll() || {};

        const completedActivities = [];

        Object.keys(tracked).forEach(
            function (activityId) {

                const item =
                    tracked[activityId];

                if (
                    item &&
                    item.completed === true
                ) {
                    completedActivities.push(activityId);
                }

            }
        );

        this.progress.completedActivities =
            completedActivities;

        return this.progress;

    },


    setCurrent: function (activity) {

        if (!activity) {
            return;
        }

        this.progress.currentGrade = activity.grade;
        this.progress.currentSubject = activity.subject;
        this.progress.currentChapter = activity.chapter;
        this.progress.currentActivity = activity.id;

    },


    complete: function (activityId) {

        if (!activityId) {
            return;
        }

        if (
            typeof ProgressTracker !== "undefined" &&
            typeof ProgressTracker.isCompleted === "function" &&
            ProgressTracker.isCompleted(activityId)
        ) {
            this.sync();
            return;
        }

        this.sync();

    },


    unlock: function (activityId) {

        if (!activityId) {
            return;
        }

        if (
            !this.progress.unlockedActivities.includes(
                activityId
            )
        ) {
            this.progress.unlockedActivities.push(
                activityId
            );
        }

    },


    isCompleted: function (activityId) {

        if (!activityId) {
            return false;
        }

        if (
            typeof ProgressTracker !== "undefined" &&
            typeof ProgressTracker.isCompleted === "function"
        ) {
            return ProgressTracker.isCompleted(
                activityId
            );
        }

        return false;

    },


    isUnlocked: function (activityId) {

        if (!activityId) {
            return false;
        }

        if (
            typeof ContentLockManager !== "undefined" &&
            typeof ContentLockManager.isLocked === "function"
        ) {
            return !ContentLockManager.isLocked(
                activityId
            );
        }

        return this.progress.unlockedActivities.includes(
            activityId
        );

    },


    get: function () {

        this.sync();

        return this.progress;

    },


    reset: function () {

        this.progress = {
            currentGrade: null,
            currentSubject: null,
            currentChapter: null,
            currentActivity: null,
            completedActivities: [],
            unlockedActivities: []
        };

    }

};


window.ProgressManager =
    ProgressManager;


console.log(
    "Progress Manager v1.1 Ready (Compatibility Facade)"
);