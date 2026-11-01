// =====================================
// Tahouri Edu Platform
// Bottom Navigation Manager
// Version 1.4
// Fixed app-level navigation shell
// =====================================

const BottomNavigation = {

    initialized: false,

    init: function () {
        const existingNav = document.getElementById("tahouri-bottom-navigation");
        if (existingNav) {
            this.initialized = true;
            this.updateActive();
            return;
        }

        const nav = document.createElement("nav");
        nav.id = "tahouri-bottom-navigation";
        nav.className = "tahouri-bottom-navigation";
        nav.setAttribute("aria-label", "ناوبری اصلی برنامه");

        nav.innerHTML = `
            <button type="button" class="tahouri-bottom-nav-item" data-nav="home" aria-label="خانه">
                <span class="tahouri-bottom-nav-icon" aria-hidden="true">⌂</span>
                <span class="tahouri-bottom-nav-label">خانه</span>
            </button>
            <button type="button" class="tahouri-bottom-nav-item" data-nav="learning" aria-label="یادگیری">
                <span class="tahouri-bottom-nav-icon" aria-hidden="true">📚</span>
                <span class="tahouri-bottom-nav-label">یادگیری</span>
            </button>
            <button type="button" class="tahouri-bottom-nav-item" data-nav="games" aria-label="بازی">
                <span class="tahouri-bottom-nav-icon" aria-hidden="true">🎮</span>
                <span class="tahouri-bottom-nav-label">بازی</span>
            </button>
            <button type="button" class="tahouri-bottom-nav-item" data-nav="interaction" aria-label="تعامل">
                <span class="tahouri-bottom-nav-icon" aria-hidden="true">👥</span>
                <span class="tahouri-bottom-nav-label">تعامل</span>
            </button>
            <button type="button" class="tahouri-bottom-nav-item" data-nav="reports" aria-label="گزارش">
                <span class="tahouri-bottom-nav-icon" aria-hidden="true">📊</span>
                <span class="tahouri-bottom-nav-label">گزارش</span>
            </button>
        `;

        document.body.appendChild(nav);
        this.bind(nav);
        this.observe();
        this.initialized = true;
        this.updateActive();

        console.log("Bottom Navigation v1.4 Ready");
    },

    bind: function (nav) {
        nav.querySelectorAll("[data-nav]").forEach(function (button) {
            button.addEventListener("click", function () {
                BottomNavigation.navigate(this.dataset.nav);
            });
        });
    },

    navigate: function (destination) {
        switch (destination) {
            case "home":
                // ReportsScreen mounts its modal directly under body.
                // Screen.showHome() changes #app only, so close the modal first.
                const reportsModal = document.getElementById("reportsModal");
                if (reportsModal) {
                    reportsModal.remove();
                    console.log("Bottom Navigation: Reports modal closed before Home");
                }

                if (typeof Screen !== "undefined" && typeof Screen.showHome === "function") {
                    Screen.showHome();
                }
                break;

            case "learning":
                if (typeof Screen !== "undefined" && typeof Screen.showGrades === "function") {
                    Screen.showGrades();
                }
                break;

            case "reports":
                if (typeof ReportsController !== "undefined" && typeof ReportsController.open === "function") {
                    ReportsController.open();
                }
                break;

            case "games":
            case "interaction":
                if (typeof ToastManager !== "undefined" && typeof ToastManager.info === "function") {
                    ToastManager.info(
                        destination === "games"
                            ? "بخش بازی‌ها در حال آماده‌سازی است."
                            : "بخش تعامل در حال آماده‌سازی است."
                    );
                }
                break;
        }
    },

    observe: function () {
        const app = document.getElementById("app");
        if (!app || this._observer) return;

        this._observer = new MutationObserver(function () {
            BottomNavigation.updateActive();
        });

        this._observer.observe(app, {
            childList: true,
            subtree: false
        });
    },

    updateActive: function () {
        const nav = document.getElementById("tahouri-bottom-navigation");
        const app = document.getElementById("app");
        if (!nav || !app) return;

        let active = null;
        const screen = app.querySelector(":scope > .screen");

        if (screen) {
            if (screen.classList.contains("dashboard-screen")) {
                active = null;
            } else if (
                screen.querySelector("#gradesBtn") &&
                screen.querySelector("#profileBtn")
            ) {
                active = "home";
            } else if (
                screen.querySelector(".report") ||
                screen.querySelector("[class*='report']") ||
                screen.querySelector("[id*='report']")
            ) {
                active = "reports";
            } else if (
                screen.querySelector("#gradesContainer") ||
                screen.querySelector("#subjectsContainer") ||
                screen.querySelector("#chaptersContainer") ||
                screen.querySelector("#activityList") ||
                screen.querySelector("[id*='quiz']") ||
                screen.querySelector("[id*='memory']") ||
                screen.querySelector("[id*='puzzle']") ||
                screen.querySelector("[id*='activity']")
            ) {
                active = "learning";
            }
        }

        nav.querySelectorAll("[data-nav]").forEach(function (button) {
            const isActive = active !== null && button.dataset.nav === active;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-current", isActive ? "page" : "false");
        });
    }
};

window.BottomNavigation = BottomNavigation;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
        BottomNavigation.init();
    });
} else {
    BottomNavigation.init();
}
