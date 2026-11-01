/* ============================================
   Tahouri Edu Platform
   Daily Message Manager v1.1
   ============================================ */

class DailyMessageManager {

    static STORAGE_KEY = "tahouri_daily_message";

    static messages = [
        {
            id: "msg1",
            text: "هر روز یک قدم کوچک، تو را به موفقیت نزدیک‌تر می‌کند.",
            icon: "🌱"
        },
        {
            id: "msg2",
            text: "امروز فرصت خوبی برای یادگیری یک چیز تازه است.",
            icon: "📚"
        },
        {
            id: "msg3",
            text: "اشتباه کردن بخشی از مسیر یادگیری است؛ دوباره تلاش کن.",
            icon: "💪"
        },
        {
            id: "msg4",
            text: "با تمرکز و آرامش، می‌توانی مسئله‌های سخت را حل کنی.",
            icon: "🧠"
        },
        {
            id: "msg5",
            text: "یادگیری امروز، توانایی فردای تو را می‌سازد.",
            icon: "⭐"
        }
    ];


    /* ============================================
       Get Today Key
       ============================================ */

    static getTodayKey() {

        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    /* ============================================
       Get Active Profile ID
       ============================================ */

    static getActiveProfileId() {

        if (
            typeof ProfileManager !== "undefined" &&
            typeof ProfileManager.getStudentId === "function"
        ) {

            return ProfileManager.getStudentId();
        }

        if (
            typeof ProfileManager !== "undefined" &&
            typeof ProfileManager.get === "function"
        ) {

            const profile = ProfileManager.get();

            return profile && profile.studentId
                ? profile.studentId
                : null;
        }

        return null;
    }


    /* ============================================
       Get Stored Data
       ============================================ */

    static getStoredData() {

        try {

            const raw = localStorage.getItem(
                this.STORAGE_KEY
            );

            if (!raw) {
                return null;
            }

            return JSON.parse(raw);

        } catch (error) {

            console.error(
                "DailyMessageManager: Failed to read storage",
                error
            );

            return null;
        }
    }


    /* ============================================
       Save Data
       ============================================ */

    static saveData(data) {

        try {

            localStorage.setItem(
                this.STORAGE_KEY,
                JSON.stringify(data)
            );

            return true;

        } catch (error) {

            console.error(
                "DailyMessageManager: Failed to save data",
                error
            );

            return false;
        }
    }


    /* ============================================
       Select Message
       ============================================ */

    static selectMessage(dateKey) {

        if (!this.messages.length) {
            return null;
        }

        let hash = 0;

        for (let i = 0; i < dateKey.length; i++) {

            hash =
                ((hash << 5) - hash) +
                dateKey.charCodeAt(i);

            hash |= 0;
        }

        const index =
            Math.abs(hash) % this.messages.length;

        return this.messages[index];
    }


    /* ============================================
       Normalize Viewed Profiles
       ============================================ */

    static normalizeViewedBy(stored) {

        if (
            !stored ||
            typeof stored !== "object"
        ) {

            return {};
        }

        if (
            !stored.viewedBy ||
            typeof stored.viewedBy !== "object" ||
            Array.isArray(stored.viewedBy)
        ) {

            stored.viewedBy = {};
        }

        return stored.viewedBy;
    }


    /* ============================================
       Sync Home Button State
       ============================================
       The message remains visible for everyone.
       Only the active profile's button state
       is synchronized.
       ============================================ */

    static syncHomeButtonState() {

        const button =
            document.getElementById("dailyMessageHomeBtn");

        if (!button) {
            return;
        }

        if (this.isViewedToday()) {

            button.textContent = "✓ مشاهده شد";
            button.disabled = true;

        } else {

            button.textContent = "متوجه شدم";
            button.disabled = false;
        }
    }


    /* ============================================
       Get Today Message
       ============================================ */

    static getTodayMessage() {

        const today = this.getTodayKey();
        const stored = this.getStoredData();

        if (
            stored &&
            stored.date === today &&
            stored.message
        ) {

            // Home is rendered after this method returns.
            // Sync on the next tick so repeated returns to Home
            // cannot reactivate an already-used button.
            setTimeout(
                function () {
                    DailyMessageManager.syncHomeButtonState();
                },
                0
            );

            return stored.message;
        }

        const message = this.selectMessage(today);

        if (!message) {
            return null;
        }

        const data = {
            date: today,
            message: message,
            viewedBy: {}
        };

        this.saveData(data);

        console.log(
            "DailyMessageManager: Today's message selected",
            message
        );

        setTimeout(
            function () {
                DailyMessageManager.syncHomeButtonState();
            },
            0
        );

        return message;
    }


    /* ============================================
       Mark As Viewed
       ============================================
       Viewed state is per profile and per day.
       The message itself remains global.
       ============================================ */

    static markAsViewed() {

        const today = this.getTodayKey();
        const profileId = this.getActiveProfileId();

        if (!profileId) {

            console.warn(
                "DailyMessageManager: Cannot mark message without an active profile."
            );

            return false;
        }

        let stored = this.getStoredData();

        if (
            !stored ||
            stored.date !== today ||
            !stored.message
        ) {

            this.getTodayMessage();
            stored = this.getStoredData();
        }

        if (
            !stored ||
            stored.date !== today ||
            !stored.message
        ) {

            return false;
        }

        const viewedBy =
            this.normalizeViewedBy(stored);

        viewedBy[profileId] = {
            viewed: true,
            viewedAt: new Date().toISOString()
        };

        stored.viewedBy = viewedBy;

        const saved = this.saveData(stored);

        if (saved) {

            console.log(
                "DailyMessageManager: Message marked as viewed for profile",
                profileId
            );

            this.syncHomeButtonState();
        }

        return saved;
    }


    /* ============================================
       Check Viewed
       ============================================ */

    static isViewedToday() {

        const today = this.getTodayKey();
        const profileId = this.getActiveProfileId();
        const stored = this.getStoredData();

        if (
            !profileId ||
            !stored ||
            stored.date !== today
        ) {

            return false;
        }

        // Old storage format used one global boolean.
        // It is intentionally not treated as a profile-specific
        // confirmation because we cannot know which profile clicked it.
        if (!stored.viewedBy) {
            return false;
        }

        return !!(
            stored.viewedBy[profileId] &&
            stored.viewedBy[profileId].viewed === true
        );
    }


    /* ============================================
       Test
       ============================================ */

    static test() {

        const today = this.getTodayKey();
        const message = this.getTodayMessage();
        const viewed = this.isViewedToday();
        const profileId = this.getActiveProfileId();

        console.log(
            "DailyMessageManager.test()"
        );

        console.log(
            "Today:",
            today
        );

        console.log(
            "Active Profile:",
            profileId
        );

        console.log(
            "Message:",
            message
        );

        console.log(
            "Viewed Today By Active Profile:",
            viewed
        );

        return {
            date: today,
            profileId: profileId,
            message: message,
            viewed: viewed
        };
    }
}


window.DailyMessageManager = DailyMessageManager;

console.log(
    "Daily Message Manager v1.1 Ready"
);