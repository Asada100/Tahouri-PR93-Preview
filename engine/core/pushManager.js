// =====================================
// Tahouri Edu Platform
// Push Manager
// Version 1.3
// Lazy / Optional Initialization
// =====================================

const TahouriPushManager = {

    SW_PATH: "service-worker.js",
    _registration: null,
    _initializing: null,

    isSupported: function () {
        return (
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window
        );
    },

    getPermission: function () {
        if (!("Notification" in window)) return "unsupported";
        return Notification.permission;
    },

    initialize: async function () {
        if (!this.isSupported()) {
            console.warn("TahouriPushManager: Push Not Supported");
            return false;
        }

        if (this._registration) return true;
        if (this._initializing) return this._initializing;

        this._initializing = (async function () {
            try {
                this._registration = await navigator.serviceWorker.register(
                    this.SW_PATH,
                    { scope: "./" }
                );
                await navigator.serviceWorker.ready;
                console.log("TahouriPushManager: Service Worker Ready");
                return true;
            } catch (error) {
                console.error("TahouriPushManager: Service Worker Registration Failed", error);
                return false;
            } finally {
                this._initializing = null;
            }
        }.call(this));

        return this._initializing;
    },

    requestPermission: async function () {
        if (!("Notification" in window)) return "unsupported";
        if (Notification.permission === "granted") return "granted";
        if (Notification.permission === "denied") return "denied";

        try {
            return await Notification.requestPermission();
        } catch (error) {
            console.error("TahouriPushManager: Permission Request Failed", error);
            return "denied";
        }
    },

    getSubscription: async function () {
        if (!this._registration) {
            const initialized = await this.initialize();
            if (!initialized) return null;
        }

        try {
            return await this._registration.pushManager.getSubscription();
        } catch (error) {
            console.error("TahouriPushManager: Get Subscription Failed", error);
            return null;
        }
    },

    subscribe: async function (applicationServerKey) {
        const permission = await this.requestPermission();
        if (permission !== "granted") return null;

        if (!applicationServerKey) {
            console.warn("TahouriPushManager: No VAPID public key configured. Remote Push is not activated yet.");
            return null;
        }

        if (!this._registration) {
            const initialized = await this.initialize();
            if (!initialized) return null;
        }

        try {
            const existing = await this._registration.pushManager.getSubscription();
            if (existing) return existing;

            const subscription = await this._registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            console.log("TahouriPushManager: Subscription Created");
            return subscription;
        } catch (error) {
            console.error("TahouriPushManager: Subscribe Failed", error);
            return null;
        }
    },

    unsubscribe: async function () {
        const subscription = await this.getSubscription();
        if (!subscription) return true;

        try {
            const result = await subscription.unsubscribe();
            console.log("TahouriPushManager: Subscription Removed", result);
            return result;
        } catch (error) {
            console.error("TahouriPushManager: Unsubscribe Failed", error);
            return false;
        }
    },

    getStatus: async function () {
        const supported = this.isSupported();
        const permission = this.getPermission();
        const subscription = supported ? await this.getSubscription() : null;

        return {
            supported: supported,
            permission: permission,
            subscribed: !!subscription,
            ready: !!this._registration
        };
    }
};

window.TahouriPushManager = TahouriPushManager;

// Push is an optional capability. It must never initialize automatically
// during application startup. Call initialize()/subscribe() from an
// explicit push-settings or opt-in flow instead.
console.log("Tahouri Push Manager v1.3 Ready (lazy initialization)");
