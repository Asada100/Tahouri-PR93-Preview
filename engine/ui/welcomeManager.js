// =====================================
// Tahouri Edu Platform
// Welcome Manager v4.0
//
// Exact Home placement:
// "سلام [نام] عزیز" immediately BEFORE
// the daily-message icon (for example 💪).
// No separate card. No dashboard movement.
// =====================================

const WelcomeManager = {

    VERSION: "4.0",

    getActiveProfileName: function () {
        try {
            if (
                typeof ProfileManager !== "undefined" &&
                typeof ProfileManager.get === "function"
            ) {
                const profile = ProfileManager.get();
                if (
                    profile &&
                    typeof profile.name === "string" &&
                    profile.name.trim()
                ) {
                    return profile.name.trim();
                }
            }
        }
        catch (error) {
            console.error("WelcomeManager: Profile read failed", error);
        }
        return "دانش‌آموز";
    },

    personalizeHome: function () {
        const message = document.querySelector(".daily-message-home");
        const icon = message
            ? message.querySelector(".daily-message-home-icon")
            : null;

        if (!message || !icon) {
            return;
        }

        let greeting =
            message.querySelector(".welcome-daily-greeting");

        if (!greeting) {
            greeting = document.createElement("div");
            greeting.className = "welcome-daily-greeting";
            message.insertBefore(greeting, icon);
        }

        const greetingText =
            `سلام ${this.getActiveProfileName()} عزیز 🌷`;

        // Avoid writing the same text repeatedly.
        // #app is observed by MutationObserver, so unnecessary writes
        // can create a mutation loop and freeze the application.
        if (greeting.textContent !== greetingText) {
            greeting.textContent = greetingText;
        }

        const profileButton =
            document.getElementById("profileBtn");

        if (
            profileButton &&
            profileButton.textContent !== "👤 پروفایل من"
        ) {
            profileButton.textContent = "👤 پروفایل من";
        }
    },

    styles: function () {
        const styleId = "tahouriWelcomeManagerV4Styles";

        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            .daily-message-home {
                display: flex;
                align-items: center;
                gap: 14px;
            }

            .daily-message-home .welcome-daily-greeting {
                flex: 0 0 auto;
                font-weight: 700;
                white-space: nowrap;
            }

            .daily-message-home .daily-message-home-icon {
                flex: 0 0 auto;
            }

            @media (max-width: 700px) {
                .daily-message-home {
                    flex-wrap: wrap;
                }

                .daily-message-home .welcome-daily-greeting {
                    width: 100%;
                    order: -1;
                    white-space: normal;
                }
            }
        `;

        document.head.appendChild(style);
    },

    observe: function () {
        const app = document.getElementById("app");

        if (!app || this.observer) {
            return;
        }

        this.styles();

        const process = function () {
            WelcomeManager.personalizeHome();
        };

        this.observer = new MutationObserver(function () {
            process();
        });

        this.observer.observe(app, {
            childList: true,
            subtree: true
        });

        process();
    },

    init: function () {
        this.observe();
        console.log("WelcomeManager v4.0 Ready");
    }
};

WelcomeManager.init();
