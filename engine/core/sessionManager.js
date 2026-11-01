// =====================================
// Tahouri Edu Platform
// Version 3.1
// Session Manager
// Profile Scoped Session
// =====================================

const SessionManager = {

    STORAGE_KEY: "Tahouri_Session",

    currentStorageKey: null,

    session: {

        startTime: null,

        endTime: null,

        duration: 0,

        totalScore: 0,

        totalActivities: 0,

        completedActivities: 0

    },


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


    ensureProfileContext: function () {

        const key =
            this.getStorageKey();

        if (key !== this.currentStorageKey) {

            this.currentStorageKey = key;

            if (key) {

                this.load();

            }
            else {

                this.session = {
                    startTime: null,
                    endTime: null,
                    duration: 0,
                    totalScore: 0,
                    totalActivities: 0,
                    completedActivities: 0
                };

            }

        }

        return !!key;

    },


    start: function () {

        const key =
            this.getStorageKey();

        this.currentStorageKey = key;

        if (!key) {

            console.warn(
                "Session Manager: No Active Profile"
            );

            this.session = {
                startTime: null,
                endTime: null,
                duration: 0,
                totalScore: 0,
                totalActivities: 0,
                completedActivities: 0
            };

            return;

        }

        const saved =
            SaveManager.load(key);

        if (saved) {

            this.session = saved;

            console.log(
                "Session Loaded",
                this.session
            );

            return;
        }

        this.reset();

        console.log(
            "Session Started"
        );

    },


    addActivity: function (score) {

        if (!this.ensureProfileContext()) {
            return;
        }

        this.session.totalActivities++;

        this.session.completedActivities++;

        this.session.totalScore += score;

        this.save();

        console.log(
            "Session Updated",
            this.session
        );

    },


    finish: function () {

        if (!this.ensureProfileContext()) {
            return;
        }

        this.session.endTime = Date.now();

        if (this.session.startTime) {

            this.session.duration = Math.floor(
                (
                    this.session.endTime -
                    this.session.startTime
                ) / 1000
            );

        }

        this.save();

        console.log(
            "Session Finished",
            this.session
        );

    },


    save: function () {

        const key =
            this.getStorageKey();

        if (!key) {

            console.warn(
                "Session Manager: Save skipped, no active profile"
            );

            return false;
        }

        this.currentStorageKey = key;

        SaveManager.save(
            key,
            this.session
        );

        return true;

    },


    load: function () {

        const key =
            this.getStorageKey();

        this.currentStorageKey = key;

        if (!key) {
            return;
        }

        const data =
            SaveManager.load(key);

        if (data) {

            this.session = data;

        }
        else {

            this.session = {
                startTime: null,
                endTime: null,
                duration: 0,
                totalScore: 0,
                totalActivities: 0,
                completedActivities: 0
            };

        }

    },


    reset: function () {

        this.session = {

            startTime: Date.now(),

            endTime: null,

            duration: 0,

            totalScore: 0,

            totalActivities: 0,

            completedActivities: 0

        };

        this.save();

        console.log(
            "Session Reset"
        );

    },


    get: function () {

        this.ensureProfileContext();

        return this.session;

    }

};


console.log(
    "Session Manager v3.1 Ready"
);