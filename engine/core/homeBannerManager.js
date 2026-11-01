// =====================================
// Tahouri Edu Platform
// Home Banner Manager
// Version 1.0
// =====================================

const HomeBannerManager = {

    STORAGE_KEY: "tahouri_home_banner_dismissed",

    getDefault: function () {
        return {
            id: "welcome-learning",
            icon: "🌱",
            title: "هر روز یک قدم کوچک",
            text: "یادگیری امروزت را از دست نده.",
            actionText: "شروع یادگیری",
            action: "learning"
        };
    },

    get: function () {
        return this.getDefault();
    },

    isDismissed: function (id) {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === id;
        } catch (error) {
            return false;
        }
    },

    dismiss: function (id) {
        try {
            localStorage.setItem(this.STORAGE_KEY, id);
            return true;
        } catch (error) {
            console.error("HomeBannerManager: Dismiss Failed", error);
            return false;
        }
    }
};

window.HomeBannerManager = HomeBannerManager;

console.log("Home Banner Manager v1.0 Ready");
