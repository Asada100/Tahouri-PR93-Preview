// =====================================
// Tahouri Edu Platform
// Version 2.3
// Progress Tracker
// Profile Scoped Progress
// Legacy Progress Migration
// Quiz + Memory + Future Engines
// =====================================


const ProgressTracker = {

    progress: {},

    STORAGE_KEY: "Tahouri_Progress",

    MIGRATION_KEY: "Tahouri_Progress_ProfileMigration_v1",

    currentStorageKey: null,


    getStorageKey: function () {

        if (
            typeof ProfileContext === "undefined" ||
            typeof ProfileContext.key !== "function"
        ) {
            return null;
        }

        return ProfileContext.key(
            this.STORAGE_KEY
        );

    },


    getDefaultProgress: function () {
        return {};
    },


    init: function () {

        this.load();

        console.log(
            "Progress Tracker Ready"
        );

    },


    migrateLegacyProgress: function (profileKey) {

        if (!profileKey) {
            return;
        }

        if (
            localStorage.getItem(this.MIGRATION_KEY) === "true"
        ) {
            return;
        }

        const legacy =
            localStorage.getItem(this.STORAGE_KEY);

        if (!legacy) {
            return;
        }

        if (
            localStorage.getItem(profileKey) !== null
        ) {
            localStorage.setItem(
                this.MIGRATION_KEY,
                "true"
            );
            return;
        }

        try {

            JSON.parse(legacy);

            localStorage.setItem(
                profileKey,
                legacy
            );

            localStorage.setItem(
                this.MIGRATION_KEY,
                "true"
            );

            console.log(
                "Legacy Progress Migrated To Active Profile"
            );

        }
        catch (error) {

            console.error(
                "Legacy Progress Migration Error",
                error
            );

        }

    },


    load: function () {

        const key =
            this.getStorageKey();

        this.currentStorageKey = key;
        this.progress =
            this.getDefaultProgress();

        if (!key) {

            console.warn(
                "Progress Tracker: No Active Profile"
            );

            return;

        }

        this.migrateLegacyProgress(key);

        try {

            const data =
                localStorage.getItem(key);

            if (data) {

                const parsed =
                    JSON.parse(data);

                if (
                    parsed &&
                    typeof parsed === "object" &&
                    !Array.isArray(parsed)
                ) {
                    this.progress = parsed;
                }

            }

        }
        catch (error) {

            console.error(
                "Progress Load Error",
                error
            );

        }

    },


    ensureProfileContext: function () {

        const key =
            this.getStorageKey();

        if (key !== this.currentStorageKey) {
            this.load();
        }

        return !!key;

    },


    save: function () {

        if (!this.ensureProfileContext()) {

            console.warn(
                "Progress Tracker: Save skipped, no active profile"
            );

            return false;

        }

        try {

            localStorage.setItem(
                this.currentStorageKey,
                JSON.stringify(this.progress)
            );

            return true;

        }
        catch (error) {

            console.error(
                "Progress Save Error",
                error
            );

            return false;

        }

    },


    get: function (activityId) {

        if (!this.ensureProfileContext()) {
            return null;
        }

        if (!activityId) {
            return null;
        }

        if (!this.progress[activityId]) {

            this.progress[activityId] = {
                played: false,
                bestScore: 0,
                stars: 0,
                percentage: 0,
                bestPercentage: 0,
                bestStars: 0,
                completed: false,
                successful: false,
                lastPlayed: null
            };

        }

        return this.progress[activityId];

    },


    calculatePercentage: function (result) {

        result = result || {};

        if (result.percentage !== undefined) {
            return result.percentage;
        }

        if (
            result.pairs !== undefined &&
            result.totalPairs !== undefined
        ) {

            return Math.round(
                (result.pairs / result.totalPairs) * 100
            );

        }

        if (result.score !== undefined) {
            return Math.min(result.score, 100);
        }

        return 0;

    },


    update: function (activityId, result) {

        if (!activityId || !result) {
            return;
        }

        if (!this.ensureProfileContext()) {
            return;
        }

        const item =
            this.get(activityId);

        if (!item) {
            return;
        }

        const previousPercentage = Number(item.percentage) || 0;
        const previousStars = Number(item.stars) || 0;
        const percentage = Math.max(0, Math.min(100, Number(this.calculatePercentage(result)) || 0));
        const stars = Math.max(0, Math.min(5, Math.round(percentage / 20)));
        const score = Number(result.score) || 0;

        // Migrate the old three-stage animal game's perfect 30-point score
        // to the new six-unit scale (60 points) before comparing new attempts.
        if (activityId === "compositeAnimalMediaDemo" && typeof item.bestPercentage !== "number") {
            if (Number(item.bestScore) >= 30) {
                item.bestScore = Math.max(Number(item.bestScore) || 0, 60);
                item.bestPercentage = 100;
                item.bestStars = 5;
            }
        }

        if (typeof item.bestPercentage !== "number") {
            item.bestPercentage = previousPercentage;
        }
        if (typeof item.bestStars !== "number") {
            item.bestStars = previousStars;
        }

        item.played = true;
        item.completed = result.completed !== false;
        item.lastPlayed = Date.now();
        item.percentage = percentage;
        item.stars = stars;
        item.successful = item.completed && percentage >= 80;

        item.bestPercentage = Math.max(Number(item.bestPercentage) || 0, percentage);
        item.bestStars = Math.max(Number(item.bestStars) || 0, stars);
        item.bestScore = Math.max(Number(item.bestScore) || 0, score);

        this.save();

        console.log(
            "Progress Updated:",
            activityId,
            item
        );

    },


    getAll: function () {

        this.ensureProfileContext();
        return this.progress;

    },


    getStars: function (activityId) {

        const item = this.get(activityId);
        return item ? item.stars : 0;

    },


    getBestScore: function (activityId) {

        const item = this.get(activityId);
        return item ? item.bestScore : 0;

    },


    isCompleted: function (activityId) {

        const item = this.get(activityId);

        return !!(
            item &&
            item.completed
        );

    }

};


window.ProgressTracker =
    ProgressTracker;


ProgressTracker.init();