// =====================================
// Tahouri Edu Platform
// Version 4.4
// Reports Controller
// Independent Performance Reports
// Report ViewModel Adapter
// Overall Fallback From Activity Statistics
// =====================================

const ReportsController = {

    open: function () {

        console.log("Reports Controller Opening");

        if (typeof StatisticsManager === "undefined") {
            console.error("StatisticsManager Not Found");
            return;
        }

        const statistics =
            typeof StatisticsManager.get === "function"
                ? (StatisticsManager.get() || {})
                : {};

        const rawSubjects =
            typeof StatisticsManager.getSubjects === "function"
                ? (StatisticsManager.getSubjects() || {})
                : (statistics.subjects || {});

        const rawActivities =
            typeof StatisticsManager.getActivities === "function"
                ? (StatisticsManager.getActivities() || {})
                : (statistics.activities || {});

        const rawChapters =
            typeof StatisticsManager.getChapters === "function"
                ? (StatisticsManager.getChapters() || {})
                : (statistics.chapters || {});

        // فقط آمار پایه فعال باید در گزارش این پروفایل نمایش داده شود.
        let activeGrade = null;

        if (
            typeof ProfileManager !== "undefined" &&
            typeof ProfileManager.getGrade === "function"
        ) {
            activeGrade = ProfileManager.getGrade();
        }

        const subjectTitles = {
            math: "ریاضی",
            mathematics: "ریاضی",
            persian: "فارسی",
            farsi: "فارسی",
            science: "علوم",
            computer: "رایانه",
            computerScience: "رایانه"
        };

        const chapterTitles = {
            chapter1: "فصل اول",
            chapter2: "فصل دوم",
            chapter3: "فصل سوم",
            chapter4: "فصل چهارم",
            chapter5: "فصل پنجم",
            chapter6: "فصل ششم",
            chapter7: "فصل هفتم",
            chapter8: "فصل هشتم"
        };

        const activityTitles = {
            evenOdd: "اعداد زوج و فرد",
            divisibleBy2: "بخش‌پذیری بر ۲",
            divisibleBy3: "بخش‌پذیری بر ۳",
            divisibleBy5: "بخش‌پذیری بر ۵",
            divisibleBy6: "بخش‌پذیری بر ۶",
            divisibleBy9: "بخش‌پذیری بر ۹",
            divisibleBy10: "بخش‌پذیری بر ۱۰",
            divisibleBy100: "بخش‌پذیری بر ۱۰۰",
            memoryDemo: "بازی حافظه"
        };

        function entries(value) {
            if (Array.isArray(value)) {
                return value.map(function (item, index) {
                    return [
                        item && (
                            item.id ||
                            item.subjectId ||
                            item.chapterId ||
                            item.activityId ||
                            String(index)
                        ),
                        item || {}
                    ];
                });
            }

            if (value && typeof value === "object") {
                return Object.keys(value).map(function (key) {
                    return [key, value[key] || {}];
                });
            }

            return [];
        }

        function belongsToActiveGrade(item) {
            if (!activeGrade) return true;

            const grade = item && (
                item.gradeId ||
                item.grade
            );

            // داده‌های قدیمی ممکن است grade نداشته باشند.
            return !grade || grade === activeGrade;
        }

        function extractId(key, item, field) {
            if (item && item[field]) {
                return item[field];
            }

            const parts = String(key).split(":");
            return parts[parts.length - 1];
        }

        // =================================
        // Subjects
        // =================================

        const subjects = [];
        const subjectSeen = {};

        entries(rawSubjects).forEach(function (entry) {
            const key = entry[0];
            const item = entry[1] || {};

            if (!belongsToActiveGrade(item)) return;

            const subjectId = extractId(key, item, "subjectId");
            if (!subjectId || subjectSeen[subjectId]) return;

            subjectSeen[subjectId] = true;

            subjects.push({
                ...item,
                subjectId: subjectId,
                gradeId: item.gradeId || item.grade || activeGrade || "unknown",
                title: subjectTitles[subjectId] || item.title || subjectId
            });
        });

        // =================================
        // Chapters
        // =================================

        const chapters = [];
        const chapterSeen = {};

        entries(rawChapters).forEach(function (entry) {
            const key = entry[0];
            const item = entry[1] || {};

            if (!belongsToActiveGrade(item)) return;

            const chapterId = extractId(key, item, "chapterId");
            const subjectId =
                item.subjectId ||
                item.subject ||
                null;

            if (!chapterId) return;

            const uniqueKey =
                String(item.gradeId || item.grade || activeGrade || "unknown") + ":" +
                String(subjectId || "unknown") + ":" +
                String(chapterId);

            if (chapterSeen[uniqueKey]) return;
            chapterSeen[uniqueKey] = true;

            chapters.push({
                ...item,
                chapterId: chapterId,
                subjectId: subjectId || "unknown",
                gradeId: item.gradeId || item.grade || activeGrade || "unknown",
                title: chapterTitles[chapterId] || item.title || chapterId
            });
        });

        // =================================
        // Activities
        // =================================

        const activities = [];
        const activitySeen = {};

        entries(rawActivities).forEach(function (entry) {
            const key = entry[0];
            const item = entry[1] || {};

            if (!belongsToActiveGrade(item)) return;

            const activityId = extractId(key, item, "activityId");
            if (!activityId) return;

            const subjectId =
                item.subjectId ||
                item.subject ||
                "unknown";

            const chapterId =
                item.chapterId ||
                item.chapter ||
                "unknown";

            const gradeId =
                item.gradeId ||
                item.grade ||
                activeGrade ||
                "unknown";

            const uniqueKey =
                String(gradeId) + ":" +
                String(subjectId) + ":" +
                String(chapterId) + ":" +
                String(activityId);

            if (activitySeen[uniqueKey]) return;
            activitySeen[uniqueKey] = true;

            activities.push({
                ...item,
                activityId: activityId,
                subjectId: subjectId,
                chapterId: chapterId,
                gradeId: gradeId,
                title: activityTitles[activityId] || item.title || activityId
            });
        });

        // =================================
        // Overall Fallback
        // =================================
        //
        // در نسخه‌های قدیمی ممکن است statistics.overall
        // با آمار جزئی فعالیت‌ها همگام نشده باشد.
        // در این حالت، عملکرد کلی را از activity statistics
        // همان پایه بازسازی می‌کنیم؛ بدون حذف یا تغییر سوابق.
        //
        const storedOverall = statistics.overall || {};
        const activityOverall = {
            totalActivities: 0,
            totalScore: 0,
            averageScore: 0,
            bestScore: 0,
            totalCorrect: 0,
            totalWrong: 0
        };

        activities.forEach(function (activity) {
            activityOverall.totalActivities += Number(
                activity.totalActivities || 0
            );
            activityOverall.totalScore += Number(
                activity.totalScore || 0
            );
            activityOverall.totalCorrect += Number(
                activity.totalCorrect || 0
            );
            activityOverall.totalWrong += Number(
                activity.totalWrong || 0
            );
            activityOverall.bestScore = Math.max(
                activityOverall.bestScore,
                Number(activity.bestScore || 0)
            );
        });

        activityOverall.averageScore =
            activityOverall.totalActivities > 0
                ? Math.round(
                    activityOverall.totalScore /
                    activityOverall.totalActivities
                )
                : 0;

        // اگر activity statistics داده معتبر داشته باشد،
        // همان داده برای گزارش کلی اولویت دارد.
        const hasActivityStatistics =
            activityOverall.totalActivities > 0;

        const overall = hasActivityStatistics
            ? {
                ...storedOverall,
                totalActivities: activityOverall.totalActivities,
                totalScore: activityOverall.totalScore,
                averageScore: activityOverall.averageScore,
                bestScore: activityOverall.bestScore,
                totalCorrect: activityOverall.totalCorrect,
                totalWrong: activityOverall.totalWrong
            }
            : {
                ...storedOverall
            };

        const reportData = {
            overall: overall,
            subjects: subjects,
            chapters: chapters,
            activities: activities
        };

        if (typeof ReportsScreen === "undefined") {
            console.error("ReportsScreen Not Found");
            return;
        }

        if (typeof ReportsScreen.show !== "function") {
            console.error("ReportsScreen.show Not Found");
            return;
        }

        ReportsScreen.show(reportData);

        // =====================================
        // REPORT CLOSE -> HOME
        // =====================================
        // Reports are used both from Home and automatically after an activity
        // finishes. In both cases, closing the report must return to Home,
        // never expose the finished activity screen again.
        const reportsModal = document.getElementById("reportsModal");

        if (reportsModal && typeof MutationObserver !== "undefined") {
            const observer = new MutationObserver(function () {
                if (!document.getElementById("reportsModal")) {
                    observer.disconnect();

                    if (
                        typeof Screen !== "undefined" &&
                        typeof Screen.showHome === "function"
                    ) {
                        Screen.showHome();
                    }

                    console.log("Reports Controller: Report closed -> Home");
                }
            });

            observer.observe(document.body, {
                childList: true
            });
        }

        console.log("Reports Controller Ready", reportData);
    }
};

window.ReportsController = ReportsController;

console.log("Reports Controller Ready");
