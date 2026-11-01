// =====================================
// Tahouri Edu Platform
// Version 2.1
// Save Manager
// Profile-safe storage operations
// =====================================

const SaveManager = {

    save: function (key, data) {
        if (!key) return false;

        try {
            localStorage.setItem(key, JSON.stringify(data));
            console.log("Saved:", key);
            return true;
        }
        catch (error) {
            console.error("Save Error:", error);
            return false;
        }
    },

    load: function (key) {
        if (!key) return null;

        try {
            const data = localStorage.getItem(key);
            if (data === null) return null;
            return JSON.parse(data);
        }
        catch (error) {
            console.error("Load Error:", error);
            return null;
        }
    },

    remove: function (key) {
        if (!key) return false;

        try {
            localStorage.removeItem(key);
            console.log("Removed:", key);
            return true;
        }
        catch (error) {
            console.error("Remove Error:", error);
            return false;
        }
    },

    exists: function (key) {
        if (!key) return false;

        try {
            return localStorage.getItem(key) !== null;
        }
        catch (error) {
            console.error("Exists Error:", error);
            return false;
        }
    },

    // Intentionally does NOT call localStorage.clear().
    // The application contains multiple independent persistent systems
    // (profiles, licenses, progress, locks, statistics, streaks, etc.).
    // A global clear could destroy unrelated user data.
    clear: function () {
        console.warn(
            "SaveManager.clear() is disabled to protect application data. Use remove(key) or a scoped reset method."
        );
        return false;
    },

    keys: function () {
        try {
            return Object.keys(localStorage);
        }
        catch (error) {
            console.error("Keys Error:", error);
            return [];
        }
    },

    init: function () {
        console.log("Save Manager Initialized");
    }

};

window.SaveManager = SaveManager;

SaveManager.init();

console.log("Save Manager Ready");