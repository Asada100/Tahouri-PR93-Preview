// =====================================
// Tahouri Edu Platform
// Dashboard UI Polish v2.2
// =====================================

const DashboardPolish = {

    init: function () {
        this.observeDashboard();
    },

    observeDashboard: function () {
        const app = document.getElementById("app");
        if (!app || this._observer) return;

        this._observer = new MutationObserver(function () {
            DashboardPolish.decorateDashboard();
        });

        this._observer.observe(app, {
            childList: true,
            subtree: false
        });

        this.decorateDashboard();
    },

    getTodayParts: function () {
        try {
            const parts = new Intl.DateTimeFormat(
                "en-US-u-ca-persian",
                { year: "numeric", month: "numeric", day: "numeric" }
            ).formatToParts(new Date());

            const result = {};
            parts.forEach(function (part) {
                if (["year", "month", "day"].includes(part.type)) {
                    result[part.type] = Number(part.value);
                }
            });
            return result;
        } catch (error) {
            return null;
        }
    },

    dailyEvents: {
        "1-1": "آغاز سال نو و نوروز؛ آغاز فصل تازه و امیدهای تازه.",
        "1-12": "روز جمهوری اسلامی ایران.",
        "1-13": "روز طبیعت؛ فرصتی برای احترام بیشتر به طبیعت و محیط زیست.",
        "2-25": "روز بزرگداشت فردوسی؛ یادآور میراث ارزشمند زبان و ادب فارسی.",
        "3-14": "روز قلم؛ گرامی‌داشت نویسندگی و اندیشه‌ورزی.",
        "3-20": "روز جهانی پناهندگان؛ یادآور اهمیت همدلی و انسان‌دوستی.",
        "3-31": "روز ملی اهدای عضو؛ یادآور ارزش زندگی و کمک به دیگران.",
        "4-7": "روز قلم‌کار؛ گرامی‌داشت هنرهای سنتی ایران.",
        "5-17": "روز خبرنگار؛ گرامی‌داشت تلاش برای آگاهی و اطلاع‌رسانی.",
        "6-8": "روز مبارزه با تروریسم؛ یادآور اهمیت صلح و امنیت برای همه.",
        "6-17": "امروز فرصتی است برای قدردانی از تلاش‌های روزانه در مسیر یادگیری.",
        "6-31": "آغاز هفته دفاع مقدس؛ یادآور ایستادگی و فداکاری مردم ایران.",
        "7-20": "روز بزرگداشت حافظ؛ گرامی‌داشت شاعر بزرگ و میراث ادبی ایران.",
        "8-13": "روز دانش‌آموز؛ این روز را به شما فراگیران عزیز تبریک می‌گوییم.",
        "9-16": "روز دانشجو؛ گرامی‌داشت دانش، پرسشگری و اندیشه‌ورزی.",
        "10-15": "روز هوای پاک؛ یادآور مسئولیت ما در مراقبت از محیط زیست.",
        "11-22": "سالروز پیروزی انقلاب اسلامی ایران.",
        "12-15": "روز درختکاری؛ فرصتی برای کاشتن و مراقبت از زندگی.",
        "12-22": "روز بزرگداشت پروین اعتصامی؛ گرامی‌داشت شعر و اندیشه فارسی."
    },

    getDailyMessage: function () {
        const parts = this.getTodayParts();
        if (!parts) return "امروز هم یک فرصت تازه برای یادگیری و رشد است.";

        const key = parts.month + "-" + parts.day;
        return this.dailyEvents[key] ||
            "امروز هم یک فرصت تازه برای یادگیری، تجربه و پیشرفت است.";
    },

    decorateDashboard: function () {
        const screen = document.querySelector("#app > .dashboard-screen");
        if (!screen) return;

        const calendarCard = screen.querySelector(".learning-calendar-card");
        if (!calendarCard) return;

        let ticker = screen.querySelector(".tahouri-daily-history");
        if (!ticker) {
            ticker = document.createElement("section");
            ticker.className = "tahouri-daily-history";
            ticker.setAttribute("aria-label", "امروز در تاریخ");
            ticker.innerHTML = `
                <div class="tahouri-daily-history-label">
                    <span aria-hidden="true">📜</span>
                    <span>امروز در تاریخ</span>
                </div>
                <div class="tahouri-daily-history-window">
                    <div class="tahouri-daily-history-track">
                        <span class="tahouri-daily-history-item">
                            <strong>امروز:</strong> ${this.getDailyMessage()}
                        </span>
                    </div>
                </div>
            `;
            calendarCard.parentNode.insertBefore(ticker, calendarCard);
        }

        const item = ticker.querySelector(".tahouri-daily-history-item");
        if (item) {
            item.innerHTML = `<strong>امروز:</strong> ${this.getDailyMessage()}`;
        }
    }
};

window.DashboardPolish = DashboardPolish;
DashboardPolish.init();

console.log("Dashboard UI Polish v2.2 Ready");
