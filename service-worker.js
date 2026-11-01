// =====================================
// Tahouri Edu Platform
// Push Service Worker
// Version 1.0
// =====================================

self.addEventListener("install", function () {
    self.skipWaiting();
});

self.addEventListener("activate", function (event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch (error) {
        data = {
            title: "یادآوری طهوری",
            body: event.data ? event.data.text() : "وقت یادگیریه! 📚"
        };
    }

    const title = data.title || "پلتفرم آموزشی طهوری";
    const options = {
        body: data.body || "وقت یادگیریه! 📚",
        icon: data.icon || "",
        badge: data.badge || "",
        tag: data.tag || "tahouri-push",
        renotify: false,
        data: {
            url: data.url || "./"
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const targetUrl =
        event.notification.data &&
        event.notification.data.url
            ? event.notification.data.url
            : "./";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true })
            .then(function (clients) {
                for (const client of clients) {
                    if ("focus" in client) {
                        return client.focus();
                    }
                }

                if (self.clients.openWindow) {
                    return self.clients.openWindow(targetUrl);
                }

                return null;
            })
    );
});

console.log("Tahouri Push Service Worker v1.0 Ready");
