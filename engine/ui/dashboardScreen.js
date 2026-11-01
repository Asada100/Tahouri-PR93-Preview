// =====================================
// Tahouri Edu Platform
// Dashboard Screen v11.2
// Lightweight Dashboard
// Persian Learning Calendar
// Single Continue Activity card
// Prominent Continue card near welcome area
// Cultural / historical ticker is provided by DashboardPolish
// =====================================

const DashboardScreen = {
    calendarState: null,

    dateKey: function (date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    },

    pparts: function (date) {
        try {
            const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date);
            const result = {};
            parts.forEach(function (part) {
                if (part.type === "year" || part.type === "month" || part.type === "day") result[part.type] = Number(part.value);
            });
            return result;
        } catch (error) {
            console.error("Persian Date Error:", error);
            return null;
        }
    },

    pmonth: function (month) {
        return ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"][month - 1] || "";
    },

    getState: function () {
        const parts = this.pparts(new Date());
        return parts ? { year: parts.year, month: parts.month } : { year: 1405, month: 6 };
    },

    findMonthStart: function (year, month) {
        const now = new Date();
        const current = this.pparts(now);
        if (!current) return null;
        const approximate = new Date(now);
        approximate.setDate(approximate.getDate() + ((year - current.year) * 365) + ((month - current.month) * 30) - (current.day - 1));
        for (let offset = -45; offset <= 45; offset++) {
            const candidate = new Date(approximate);
            candidate.setDate(candidate.getDate() + offset);
            const parts = this.pparts(candidate);
            if (parts && parts.year === year && parts.month === month && parts.day === 1) return candidate;
        }
        return null;
    },

    monthDays: function (year, month) {
        const start = this.findMonthStart(year, month);
        if (!start) return month <= 6 ? 31 : 30;
        const nextYear = month === 12 ? year + 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        const next = this.findMonthStart(nextYear, nextMonth);
        if (!next) return month <= 6 ? 31 : month <= 11 ? 30 : 29;
        return Math.round((next - start) / 86400000);
    },

    getDayData: function (key) {
        try {
            if (window.DailyLearningStreak && typeof window.DailyLearningStreak.getDay === "function") return window.DailyLearningStreak.getDay(key) || null;
        } catch (error) {
            console.error("Daily Learning Streak getDay Error:", error);
        }
        return null;
    },

    calendar: function () {
        const state = this.calendarState || this.getState();
        this.calendarState = state;
        const first = this.findMonthStart(state.year, state.month);
        const total = this.monthDays(state.year, state.month);
        if (!first) return '<div class="learning-calendar-error">خطا در نمایش تقویم</div>';

        let cells = "";
        const lead = (first.getDay() + 1) % 7;
        for (let i = 0; i < lead; i++) cells += '<div class="learning-calendar-cell empty-cell"></div>';

        const todayKey = this.dateKey(new Date());
        for (let dayNumber = 1; dayNumber <= total; dayNumber++) {
            const date = new Date(first);
            date.setDate(first.getDate() + dayNumber - 1);
            const key = this.dateKey(date);
            const day = this.getDayData(key);
            const status = day && day.status ? day.status : "empty";
            const today = key === todayKey;
            let icon = "";
            if (status === "completed") icon = "🔥";
            else if (status === "partial") icon = "📚";
            else if (status === "freeze") icon = "❄️";
            let classes = "learning-calendar-cell";
            if (status === "completed") classes += " calendar-completed";
            else if (status === "partial") classes += " calendar-partial";
            else if (status === "freeze") classes += " calendar-freeze";
            else classes += " calendar-empty";
            if (today) classes += " calendar-today";
            const activityCount = Number(day?.activityCount || 0);
            cells += `<div class="${classes}"><span class="calendar-day-number">${dayNumber}</span><span class="calendar-day-icon">${icon}</span>${activityCount > 0 ? `<span class="calendar-day-count">${activityCount}</span>` : ""}</div>`;
        }

        return `<div class="learning-calendar-header"><div id="learningCalendarPrev" class="calendar-month-arrow" role="button" tabindex="0">‹</div><div class="calendar-month-title">${this.pmonth(state.month)} <span>${state.year}</span></div><div id="learningCalendarNext" class="calendar-month-arrow" role="button" tabindex="0">›</div></div><div class="learning-calendar-weekdays"><span>ش</span><span>ی</span><span>د</span><span>س</span><span>چ</span><span>پ</span><span>ج</span></div><div class="learning-calendar-grid">${cells}</div><div class="learning-calendar-legend"><span>🔥 فعالیت کامل</span><span>📚 فعالیت ناقص</span><span>❄️ بدون فعالیت</span></div>`;
    },

    show: function (data) {
        const app = document.getElementById("app");
        if (!app) return console.error("App Container Not Found");
        data = data || {};
        const overall = data.overall || {};
        const continueLearning = data.continueLearning || {};
        const profile = window.ProfileManager && typeof window.ProfileManager.get === "function" ? window.ProfileManager.get() : {};
        const studentName = profile.name || "دانش‌آموز";
        const totalActivities = Number(data.totalGradeActivities ?? overall.totalActivities ?? 0);
        const completedCount = Number(data.completedCount || 0);
        const progressPercentage = Number(data.progressPercentage || 0);
        let streak = 0;
        try {
            if (window.DailyLearningStreak && typeof window.DailyLearningStreak.getCurrentStreak === "function") streak = Number(window.DailyLearningStreak.getCurrentStreak() || 0);
        } catch (error) {
            console.error("Streak Error:", error);
        }
        this.calendarState = null;

        const continueCard = continueLearning && continueLearning.activityId ? `<div class="dashboard-card dashboard-continue-card"><h2>🧭 ادامه مسیر من</h2><div class="dashboard-next-learning"><span>🎯</span><div><strong>${continueLearning.activityTitle || "فعالیت بعدی"}</strong>${continueLearning.subject ? `<small>${this.subjectTitle(continueLearning.subject)}</small>` : ""}</div></div><div id="dashboardContinueBtn" class="dashboard-small-action" role="button" tabindex="0">▶️ ${continueLearning.mode === "resume" ? "ادامه فعالیت" : "شروع فعالیت بعدی"}</div></div>` : `<div class="dashboard-card dashboard-continue-card"><h2>🧭 ادامه مسیر من</h2><div class="dashboard-empty">🎉 مسیر فعلی را کامل کردی!</div></div>`;

        app.innerHTML = `<div class="screen dashboard-screen"><div class="dashboard-welcome"><h1>👋 سلام ${studentName}</h1></div>${continueCard}<hr><div class="dashboard-card learning-calendar-card"><div class="learning-calendar-heading"><h2>📅 تقویم مسیر یادگیری</h2><div class="streak-badge">🔥 <strong>${streak}</strong><span>روز</span></div></div><div id="learningCalendarContainer">${this.calendar()}</div></div><div class="dashboard-card"><h2>💬 یک جمله برای تو</h2><div class="dashboard-message"><span aria-hidden="true">🚀</span><p>قدم‌به‌قدم داری جلو می‌ری. با همین تمرکز ادامه بده!</p></div></div><div class="dashboard-card"><h2>🏅 وضعیت من</h2><p class="dashboard-status-text">${completedCount} فعالیت از ${totalActivities} فعالیت کامل شده است — <strong>${progressPercentage}%</strong></p></div></div>`;

        this.bind(continueLearning);
        this.styles();
        console.log("Dashboard Screen v11.2 Ready");
    },

    subjectTitle: function (subject) {
        const titles = { math: "ریاضی", science: "علوم", computer: "رایانه", persian: "فارسی", social: "مطالعات اجتماعی", arabic: "عربی", english: "زبان انگلیسی" };
        return titles[subject] || subject || "";
    },

    bind: function (continueLearning) {
        const calendar = document.getElementById("learningCalendarContainer");
        if (calendar) {
            calendar.onclick = function (event) {
                const previous = event.target.closest("#learningCalendarPrev");
                if (previous) return DashboardScreen.changeMonth(-1);
                const next = event.target.closest("#learningCalendarNext");
                if (next) DashboardScreen.changeMonth(1);
            };
            calendar.onkeydown = function (event) {
                if (event.key !== "Enter" && event.key !== " ") return;
                const target = event.target.closest("#learningCalendarPrev, #learningCalendarNext");
                if (!target) return;
                event.preventDefault();
                DashboardScreen.changeMonth(target.id === "learningCalendarPrev" ? -1 : 1);
            };
        }
        const continueButton = document.getElementById("dashboardContinueBtn");
        if (continueButton) {
            continueButton.onclick = function () {
                if (window.DashboardController && typeof window.DashboardController.continueLearning === "function") window.DashboardController.continueLearning(continueLearning);
            };
            continueButton.onkeydown = function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    continueButton.click();
                }
            };
        }
    },

    changeMonth: function (step) {
        const state = this.calendarState || this.getState();
        state.month += step;
        if (state.month < 1) { state.month = 12; state.year--; }
        else if (state.month > 12) { state.month = 1; state.year++; }
        this.calendarState = state;
        const container = document.getElementById("learningCalendarContainer");
        if (container) container.innerHTML = this.calendar();
    },

    styles: function () {
        const styleId = "tahouriDashboardV11Styles";
        const old = document.getElementById(styleId);
        if (old) old.remove();
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `.learning-calendar-card{overflow:hidden}.learning-calendar-heading{display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:nowrap;width:100%}.learning-calendar-heading h2{margin:0;line-height:1.5;white-space:nowrap}.streak-badge{display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:6px 10px;border-radius:12px;background:#fff3e0;font-size:13px;white-space:nowrap;flex:0 0 auto}.streak-badge strong{font-size:16px}.learning-calendar-heading .streak-badge span{white-space:nowrap}#learningCalendarContainer{width:100%;max-width:430px;margin:0 auto}.learning-calendar-header{display:grid;grid-template-columns:34px 1fr 34px;align-items:center;width:100%;margin:16px 0 10px}.calendar-month-title{text-align:center;font-weight:bold;font-size:17px}.calendar-month-title span{margin-right:5px}.calendar-month-arrow{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#f1f3f5;cursor:pointer;user-select:none;font-size:20px;line-height:1}.calendar-month-arrow:hover{background:#e4e7eb}.learning-calendar-weekdays,.learning-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;width:100%}.learning-calendar-weekdays{margin-bottom:5px;text-align:center;font-size:11px;opacity:.6}.learning-calendar-cell{position:relative;width:100%;height:48px;box-sizing:border-box;border:1px solid #e1e4e8;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;user-select:none;background:#fff}.empty-cell{border:0;background:transparent}.calendar-day-number{font-size:14px;font-weight:600;line-height:16px}.calendar-day-icon{height:17px;line-height:17px;font-size:14px}.calendar-day-count{position:absolute;top:3px;left:4px;min-width:13px;height:13px;display:flex;align-items:center;justify-content:center;font-size:8px;border-radius:50%;background:#eee}.calendar-completed{background:#fff8df;border-color:#e7c75c}.calendar-partial{background:#eef7ff;border-color:#9dccf5}.calendar-freeze{background:#f4f7f9;border-color:#d8dfe5}.calendar-empty{background:#fff}.calendar-today{box-shadow:inset 0 0 0 2px #7c4dff}.learning-calendar-legend{display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;width:100%;margin-top:10px;font-size:10px;opacity:.75}.learning-calendar-error{text-align:center;padding:20px;color:#b00020}.dashboard-next-learning{display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0}.dashboard-next-learning>span{font-size:24px}.dashboard-next-learning strong{display:block}.dashboard-next-learning small{display:block;margin-top:3px;opacity:.65}.dashboard-small-action{display:inline-flex;align-items:center;justify-content:center;padding:7px 12px;margin-top:8px;border-radius:8px;background:#f1f3f5;cursor:pointer;font-size:13px;user-select:none}.dashboard-small-action:hover{background:#e5e7ea}.dashboard-message{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;text-align:center}.dashboard-message span{flex:0 0 auto;font-size:25px;line-height:1}.dashboard-message p{margin:0;display:inline-block;line-height:1.9}.dashboard-status-text{margin:0;text-align:center;line-height:1.9}.dashboard-continue-card{margin-top:14px;margin-bottom:14px}.dashboard-continue-card .dashboard-small-action{min-width:190px;min-height:44px;padding:9px 18px;border-radius:12px;font-weight:700}.dashboard-continue-card .dashboard-next-learning{margin:8px 0}.dashboard-continue-card h2{margin-bottom:4px}@media(max-width:700px){.learning-calendar-heading{gap:10px}.learning-calendar-heading h2{font-size:16px}.streak-badge{padding:6px 8px;font-size:12px}.streak-badge strong{font-size:15px}#learningCalendarContainer{max-width:100%}.learning-calendar-cell{height:43px;border-radius:7px}.calendar-day-number,.calendar-day-icon{font-size:12px}.learning-calendar-weekdays{font-size:9px}.learning-calendar-legend{font-size:9px}.dashboard-message{gap:8px}.dashboard-message p{font-size:13px}.dashboard-continue-card{margin-top:10px;margin-bottom:12px}.dashboard-continue-card .dashboard-small-action{min-width:176px;min-height:44px}}@media(max-width:390px){.learning-calendar-heading{gap:6px}.learning-calendar-heading h2{font-size:14px}.streak-badge{padding:5px 7px;font-size:11px}.streak-badge strong{font-size:14px}.dashboard-message{gap:6px}.dashboard-message p{font-size:12px}}`;
        document.head.appendChild(style);
    }
};

window.DashboardScreen = DashboardScreen;
console.log("Dashboard Screen v11.2 Ready");
