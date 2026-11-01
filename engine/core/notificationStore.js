// =====================================
// Tahouri Edu Platform
// Notification Store
// Version 1.1
// Profile Isolated
// =====================================

const NotificationStore = {

    STORAGE_PREFIX: "tahouri_notifications:",
    MAX_ITEMS: 50,

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

    getStorageKey: function () {
        return this.STORAGE_PREFIX + (this.getProfileId() || "anonymous");
    },

    get: function () {
        try {
            const raw = localStorage.getItem(this.getStorageKey());
            const items = raw ? JSON.parse(raw) : [];
            return Array.isArray(items) ? items : [];
        } catch (error) {
            console.error("NotificationStore: Load Failed", error);
            return [];
        }
    },

    save: function (items) {
        try {
            localStorage.setItem(this.getStorageKey(), JSON.stringify(items.slice(0, this.MAX_ITEMS)));
            return true;
        } catch (error) {
            console.error("NotificationStore: Save Failed", error);
            return false;
        }
    },

    add: function (notification) {
        const item = Object.assign({
            id: "notification-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
            createdAt: new Date().toISOString(),
            read: false,
            type: "info",
            title: "",
            body: "",
            action: null
        }, notification || {});

        const items = this.get();
        items.unshift(item);
        this.save(items);
        return item;
    },

    markRead: function (id) {
        const items = this.get();
        let changed = false;
        items.forEach(function (item) {
            if (item.id === id && !item.read) {
                item.read = true;
                changed = true;
            }
        });
        if (changed) this.save(items);
        return changed;
    },

    markAllRead: function () {
        const items = this.get();
        items.forEach(function (item) { item.read = true; });
        return this.save(items);
    },

    unreadCount: function () {
        return this.get().filter(function (item) { return !item.read; }).length;
    },

    clear: function () {
        localStorage.removeItem(this.getStorageKey());
    }
};

window.NotificationStore = NotificationStore;

console.log("Notification Store v1.1 Ready");
