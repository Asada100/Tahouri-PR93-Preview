// =====================================
// Tahouri Edu Platform
// Reminder Manager
// Version 3.1
// =====================================

const ReminderManager = {

    STORAGE_KEY: "tahouri_reminder_state",

    REMINDER_HOUR: 18,

    // =====================================
    // START
    // =====================================

    start: function () {

        console.log(
            "Reminder Manager Started"
        );

        this.checkToday();

        // بررسی دوره‌ای
        // تا اگر برنامه قبل از ساعت 18 باز باشد
        // در ساعت مناسب بررسی انجام شود.

        if (!this._timer) {

            this._timer = setInterval(
                () => {

                    this.checkToday();

                },
                60 * 1000
            );

        }

    },


    // =====================================
    // GET STATE
    // =====================================

    getState: function () {

        try {

            const raw =
                localStorage.getItem(
                    this.STORAGE_KEY
                );

            if (!raw) {

                return {

                    date: this.getTodayKey(),

                    activityDone: false,

                    reminderShown: false

                };

            }

            const state =
                JSON.parse(raw);

            if (
                !state ||
                state.date !== this.getTodayKey()
            ) {

                return {

                    date: this.getTodayKey(),

                    activityDone: false,

                    reminderShown: false

                };

            }

            return state;

        } catch (error) {

            console.error(
                "ReminderManager: State Load Error",
                error
            );

            return {

                date: this.getTodayKey(),

                activityDone: false,

                reminderShown: false

            };

        }

    },


    // =====================================
    // SAVE STATE
    // =====================================

    saveState: function (state) {

        try {

            localStorage.setItem(
                this.STORAGE_KEY,
                JSON.stringify(state)
            );

        } catch (error) {

            console.error(
                "ReminderManager: State Save Error",
                error
            );

        }

    },


    // =====================================
    // TODAY KEY
    // =====================================

    getTodayKey: function () {

        const now = new Date();

        return (
            now.getFullYear() +
            "-" +
            String(
                now.getMonth() + 1
            ).padStart(2, "0") +
            "-" +
            String(
                now.getDate()
            ).padStart(2, "0")
        );

    },


    // =====================================
    // CHECK TODAY ACTIVITY
    // =====================================

    hasActivityToday: function () {

        // ---------------------------------
        // Reminder State
        // ---------------------------------

        const state =
            this.getState();

        if (
            state &&
            state.date === this.getTodayKey() &&
            state.activityDone === true
        ) {

            return true;

        }


        // ---------------------------------
        // Statistics
        // ---------------------------------

        if (
            typeof StatisticsManager !== "undefined" &&
            typeof StatisticsManager.get === "function"
        ) {

            const statistics =
                StatisticsManager.get();

            if (
                statistics &&
                typeof statistics === "object"
            ) {

                if (
                    Array.isArray(
                        statistics.todayActivities
                    ) &&
                    statistics.todayActivities.length > 0
                ) {

                    return true;

                }

            }

        }


        // ---------------------------------
        // Activity History
        // ---------------------------------

        if (
            typeof ActivityHistory !== "undefined"
        ) {

            if (
                typeof ActivityHistory.hasActivityToday ===
                "function"
            ) {

                return !!ActivityHistory.hasActivityToday();

            }


            if (
                typeof ActivityHistory.getToday ===
                "function"
            ) {

                const today =
                    ActivityHistory.getToday();

                if (
                    Array.isArray(today) &&
                    today.length > 0
                ) {

                    return true;

                }

            }

        }


        return false;

    },


    // =====================================
    // ACTIVITY COMPLETED
    // =====================================

    markActivityCompleted: function (
        activityId
    ) {

        const today =
            this.getTodayKey();

        const state = {

            date: today,

            activityDone: true,

            reminderShown: false,

            lastActivity:
                activityId || null,

            completedAt:
                new Date().toISOString()

        };

        this.saveState(state);

        console.log(
            "ReminderManager: Today's activity completed",
            activityId
        );

    },


    // =====================================
    // SHOULD REMIND?
    // =====================================

    shouldRemind: function () {

        const now =
            new Date();

        const state =
            this.getState();

        // ---------------------------------
        // فعالیت انجام شده
        // ---------------------------------

        if (
            state.activityDone
        ) {

            return false;

        }


        // ---------------------------------
        // یادآوری قبلاً نمایش داده شده
        // ---------------------------------

        if (
            state.reminderShown
        ) {

            return false;

        }


        // ---------------------------------
        // فعالیت واقعی امروز
        // ---------------------------------

        if (
            this.hasActivityToday()
        ) {

            state.activityDone = true;

            this.saveState(state);

            return false;

        }


        // ---------------------------------
        // قبل از ساعت 18
        // ---------------------------------

        if (
            now.getHours() <
            this.REMINDER_HOUR
        ) {

            return false;

        }


        return true;

    },


    // =====================================
    // SHOW REMINDER
    // =====================================

    showReminder: function () {

        if (
            !this.shouldRemind()
        ) {

            return false;

        }


        // ---------------------------------
        // Notification Manager
        // ---------------------------------

        if (
            typeof NotificationManager !== "undefined" &&
            typeof NotificationManager.show === "function"
        ) {

            const notification =
                NotificationManager.show(
                    "یادآوری طهوری",
                    {
                        body:
                            "امروز هنوز فعالیت آموزشی انجام نداده‌ای. وقت یادگیریه! 📚",
                        tag:
                            "tahouri-daily-reminder"
                    }
                );

            // فقط در صورت ساخته‌شدن واقعی Notification
            // یادآوری را به‌عنوان نمایش‌داده‌شده ثبت می‌کنیم.
            if (notification) {

                const state =
                    this.getState();

                state.reminderShown = true;

                this.saveState(state);

                console.log(
                    "ReminderManager: Reminder Sent"
                );

                return true;

            }

            console.warn(
                "ReminderManager: Reminder Failed - Notification was not created"
            );

            return false;

        }


        console.warn(
            "ReminderManager: NotificationManager.show Not Found"
        );

        return false;

    },


    // =====================================
    // DAILY CHECK
    // =====================================

    checkToday: function () {

        const state =
            this.getState();

        // ---------------------------------
        // اگر امروز فعالیت انجام شده
        // ---------------------------------

        if (
            state.activityDone
        ) {

            return;

        }


        // ---------------------------------
        // بررسی فعالیت واقعی
        // ---------------------------------

        if (
            this.hasActivityToday()
        ) {

            state.activityDone = true;

            this.saveState(state);

            console.log(
                "ReminderManager: Activity already done today"
            );

            return;

        }


        // ---------------------------------
        // بررسی زمان یادآوری
        // ---------------------------------

        if (
            this.shouldRemind()
        ) {

            this.showReminder();

        }

    },


    // =====================================
    // TEST
    // =====================================

    test: function () {

        console.log(
            "ReminderManager.test()"
        );

        console.log(
            "Today:",
            this.getTodayKey()
        );

        console.log(
            "Activity Today:",
            this.hasActivityToday()
        );

        console.log(
            "Should Remind:",
            this.shouldRemind()
        );

        return {

            date:
                this.getTodayKey(),

            activityToday:
                this.hasActivityToday(),

            shouldRemind:
                this.shouldRemind()

        };

    }

};


// =====================================
// GLOBAL ACCESS
// =====================================

window.ReminderManager =
    ReminderManager;


// =====================================
// READY
// =====================================

console.log(
    "Reminder Manager v3.1 Ready"
);
