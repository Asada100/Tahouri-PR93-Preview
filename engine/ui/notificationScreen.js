// =====================================
// Tahouri Edu Platform
// Notification Center Screen
// Version 1.0
// =====================================

const NotificationScreen = {

    open: function () {
        const app = document.getElementById("app");
        if (!app) return;

        const items = NotificationStore.get();

        app.innerHTML = `
            <div class="screen notification-center-screen">
                <div class="notification-center-header">
                    <button id="notificationBackBtn" type="button">← بازگشت</button>
                    <h1>🔔 اعلان‌ها</h1>
                    ${items.length ? '<button id="notificationReadAllBtn" type="button">خواندن همه</button>' : ''}
                </div>

                <div id="notificationList">
                    ${this.renderItems(items)}
                </div>
            </div>
        `;

        const back = document.getElementById("notificationBackBtn");
        if (back) {
            back.onclick = function () {
                if (typeof Screen !== "undefined" && typeof Screen.showHome === "function") {
                    Screen.showHome();
                }
            };
        }

        const readAll = document.getElementById("notificationReadAllBtn");
        if (readAll) {
            readAll.onclick = function () {
                NotificationStore.markAllRead();
                NotificationScreen.open();
            };
        }

        document.querySelectorAll("[data-notification-id]").forEach(function (button) {
            button.onclick = function () {
                const id = this.getAttribute("data-notification-id");
                NotificationStore.markRead(id);
                NotificationScreen.open();
            };
        });
    },

    renderItems: function (items) {
        if (!items.length) {
            return '<div class="notification-empty">اعلان جدیدی ندارید 🌱</div>';
        }

        return items.map(function (item) {
            const unreadClass = item.read ? "" : " notification-unread";
            const icon = item.type === "offer" ? "🎁" : item.type === "learning" ? "📚" : "ℹ️";
            const date = item.createdAt ? new Date(item.createdAt).toLocaleString("fa-IR") : "";

            return `
                <button class="notification-item${unreadClass}" data-notification-id="${item.id}" type="button">
                    <span class="notification-item-icon">${icon}</span>
                    <span class="notification-item-content">
                        <strong>${item.title || "اعلان طهوری"}</strong>
                        <span>${item.body || ""}</span>
                        <small>${date}</small>
                    </span>
                    ${item.read ? "" : '<span class="notification-dot" aria-label="خوانده نشده"></span>'}
                </button>
            `;
        }).join("");
    }

};

window.NotificationScreen = NotificationScreen;

console.log("Notification Screen v1.0 Ready");
