// =====================================
// Tahouri Edu Platform
// Push Subscription Manager
// Version 1.1
// Profile Isolated
// =====================================

const PushSubscriptionManager = {

    STORAGE_PREFIX: "tahouri_push_subscription:",

    getProfileId: function () {
        if (typeof ProfileManager !== "undefined" && typeof ProfileManager.getStudentId === "function") {
            return ProfileManager.getStudentId();
        }
        if (typeof ProfileManager !== "undefined" && typeof ProfileManager.get === "function") {
            const profile = ProfileManager.get();
            return profile && profile.studentId ? profile.studentId : null;
        }
        return null;
    },

    getKey: function () {
        return this.STORAGE_PREFIX + (this.getProfileId() || "anonymous");
    },

    save: function (subscription) {
        if (!subscription) return false;
        try {
            localStorage.setItem(this.getKey(), JSON.stringify({
                subscription: subscription,
                savedAt: new Date().toISOString()
            }));
            return true;
        } catch (error) {
            console.error("PushSubscriptionManager: Save Failed", error);
            return false;
        }
    },

    get: function () {
        try {
            const raw = localStorage.getItem(this.getKey());
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.error("PushSubscriptionManager: Load Failed", error);
            return null;
        }
    },

    clear: function () {
        localStorage.removeItem(this.getKey());
    },

    sync: async function (applicationServerKey) {
        if (typeof TahouriPushManager === "undefined") return null;

        const subscription =
            await TahouriPushManager.subscribe(applicationServerKey);

        if (!subscription) return null;

        this.save(subscription.toJSON ? subscription.toJSON() : subscription);
        return subscription;
    }
};

window.PushSubscriptionManager = PushSubscriptionManager;

console.log("Push Subscription Manager v1.1 Ready");
