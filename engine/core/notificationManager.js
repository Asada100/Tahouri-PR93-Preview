// =====================================
// Tahouri Edu Platform
// Notification Manager
// Version 1.1
// =====================================

const NotificationManager = {

    isSupported: function () {
        return ("Notification" in window);
    },

    getPermission: function () {
        if (!this.isSupported()) return "unsupported";
        return Notification.permission;
    },

    requestPermission: async function () {
        if (!this.isSupported()) {
            console.warn("NotificationManager: Notifications Not Supported");
            return "unsupported";
        }

        if (Notification.permission === "granted") {
            console.log("NotificationManager: Permission Already Granted");
            return "granted";
        }

        if (Notification.permission === "denied") {
            console.warn("NotificationManager: Permission Denied");
            return "denied";
        }

        try {
            const permission = await Notification.requestPermission();
            console.log("NotificationManager: Permission:", permission);
            return permission;
        } catch (error) {
            console.error("NotificationManager: Permission Request Failed", error);
            return "denied";
        }
    },

    show: function (title, options) {
        if (!this.isSupported()) {
            console.warn("NotificationManager: Notifications Not Supported");
            return null;
        }

        if (Notification.permission !== "granted") {
            console.warn("NotificationManager: Permission Not Granted");
            return null;
        }

        const notificationOptions = options || {};

        try {
            const notification = new Notification(title, notificationOptions);

            if (
                typeof NotificationStore !== "undefined" &&
                typeof NotificationStore.add === "function"
            ) {
                NotificationStore.add({
                    title: title,
                    body: notificationOptions.body || "",
                    type: notificationOptions.type || "learning",
                    action: notificationOptions.action || null
                });
            }

            if (
                typeof HeaderManager !== "undefined" &&
                typeof HeaderManager.updateBell === "function"
            ) {
                HeaderManager.updateBell();
            }

            console.log("NotificationManager: Notification Shown", title);
            return notification;
        } catch (error) {
            console.error("NotificationManager: Show Failed", error);
            return null;
        }
    },

    test: async function () {
        const permission = await this.requestPermission();

        if (permission !== "granted") {
            console.warn("NotificationManager: Test Cancelled");
            return null;
        }

        return this.show(
            "یادآوری طهوری",
            {
                body: "این یک اعلان آزمایشی از پلتفرم طهوری است.",
                icon: "",
                tag: "tahouri-test-notification",
                type: "learning"
            }
        );
    }
};

window.NotificationManager = NotificationManager;

console.log("Notification Manager v1.1 Ready");
