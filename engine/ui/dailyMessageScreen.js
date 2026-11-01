/* ============================================
   Tahouri Edu Platform
   Daily Message Screen v1.0
   ============================================ */

class DailyMessageScreen {

    /* ============================================
       Show Daily Message
       ============================================ */

    static show() {

        const app = document.getElementById("app");

        if (!app) {
            console.error(
                "DailyMessageScreen: App container not found"
            );
            return;
        }

        if (typeof DailyMessageManager === "undefined") {
            console.error(
                "DailyMessageScreen: DailyMessageManager not found"
            );
            return;
        }

        const message =
            DailyMessageManager.getTodayMessage();

        if (!message) {
            console.warn(
                "DailyMessageScreen: No daily message available"
            );
            return;
        }

        app.innerHTML = `

            <section class="daily-message-container">

                <div class="daily-message-card">

                    <div class="daily-message-icon">
                        ${message.icon}
                    </div>

                    <div class="daily-message-content">

                        <div class="daily-message-title">
                            پیام امروز
                        </div>

                        <div class="daily-message-text">
                            ${message.text}
                        </div>

                    </div>

                    <button
                        type="button"
                        class="daily-message-close"
                        id="dailyMessageClose"
                    >
                        متوجه شدم
                    </button>

                </div>

            </section>

        `;

        this.bindEvents();

        console.log(
            "DailyMessageScreen: Daily message displayed"
        );
    }


    /* ============================================
       Bind Events
       ============================================ */

    static bindEvents() {

        const closeButton =
            document.getElementById(
                "dailyMessageClose"
            );

        if (!closeButton) {
            console.warn(
                "DailyMessageScreen: Close button not found"
            );
            return;
        }

        closeButton.addEventListener(
            "click",
            () => {

                DailyMessageManager.markAsViewed();

                console.log(
                    "DailyMessageScreen: Message viewed"
                );

                this.close();

            }
        );
    }


    /* ============================================
       Close
       ============================================ */

    static close() {

        if (
            typeof Screen !== "undefined" &&
            typeof Screen.showHome === "function"
        ) {

            Screen.showHome();

            return;
        }

        const app =
            document.getElementById("app");

        if (app) {

            app.innerHTML = `
                <div class="daily-message-closed">
                    پیام امروز مشاهده شد.
                </div>
            `;
        }
    }


    /* ============================================
       Test
       ============================================ */

    static test() {

        console.log(
            "DailyMessageScreen.test()"
        );

        this.show();

        return true;
    }
}


window.DailyMessageScreen =
    DailyMessageScreen;


console.log(
    "Daily Message Screen v1.0 Ready"
);
