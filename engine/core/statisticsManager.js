// =====================================
// Tahouri Edu Platform
// Statistics Manager
// Version 3.6
// Profile Scoped Statistics
// Safe Legacy Migration
// Consistent Overall + Subject + Chapter + Activity Statistics
// =====================================

const StatisticsManager = {

    STORAGE_KEY: "Tahouri_Statistics",
    LEGACY_MIGRATION_KEY: "Tahouri_Statistics_LegacyMigrated_v2",

    statistics: null,
    currentStorageKey: null,

    getDefaultStatistics: function () {
        return {
            overall: {
                totalActivities: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                totalCorrect: 0,
                totalWrong: 0
            },
            subjects: {},
            chapters: {},
            activities: {}
        };
    },

    getStorageKey: function () {
        if (
            typeof ProfileContext === "undefined" ||
            typeof ProfileContext.key !== "function"
        ) return null;

        return ProfileContext.key(this.STORAGE_KEY);
    },

    createActivityKey: function (activityId, subjectId, gradeId, chapterId) {
        return String(gradeId || "unknown") + ":" +
            String(subjectId || "unknown") + ":" +
            String(chapterId || "unknown") + ":" +
            String(activityId || "unknown");
    },

    createSubjectKey: function (subjectId, gradeId) {
        return String(gradeId || "unknown") + ":" +
            String(subjectId || "unknown");
    },

    createChapterKey: function (chapterId, subjectId, gradeId) {
        return String(gradeId || "unknown") + ":" +
            String(subjectId || "unknown") + ":" +
            String(chapterId || "unknown");
    },

    migrateLegacyStatistics: function (profileKey) {
        if (!profileKey) return;

        // The old unscoped key has no profile owner. It must therefore be
        // migrated at most once, to the active profile at migration time.
        // A per-profile migration flag would duplicate one student's old
        // history into every later profile.
        if (localStorage.getItem(this.LEGACY_MIGRATION_KEY) === "true") {
            return;
        }

        const legacy = localStorage.getItem(this.STORAGE_KEY);
        if (!legacy) return;

        // Never overwrite an existing profile dataset. Mark the legacy
        // source as handled so it cannot later leak into another profile.
        if (localStorage.getItem(profileKey) !== null) {
            localStorage.setItem(this.LEGACY_MIGRATION_KEY, "true");
            return;
        }

        try {
            const parsed = JSON.parse(legacy);

            if (
                parsed &&
                typeof parsed === "object" &&
                parsed.overall &&
                parsed.subjects &&
                parsed.activities
            ) {
                localStorage.setItem(profileKey, legacy);
                localStorage.setItem(this.LEGACY_MIGRATION_KEY, "true");
                console.log("Legacy Statistics Migrated To Active Profile");
            }
        }
        catch (error) {
            console.error("Legacy Statistics Migration Error", error);
        }
    },

    ensureProfileContext: function () {
        const key = this.getStorageKey();

        if (!key) {
            this.currentStorageKey = null;
            this.statistics = this.getDefaultStatistics();
            return false;
        }

        if (this.currentStorageKey !== key || !this.statistics) {
            this.loadForKey(key);
        }

        return true;
    },

    loadForKey: function (key) {
        this.currentStorageKey = key;
        this.statistics = this.getDefaultStatistics();

        this.migrateLegacyStatistics(key);

        try {
            const saved = SaveManager.load(key);

            if (saved && typeof saved === "object") {
                this.statistics = {
                    ...this.getDefaultStatistics(),
                    ...saved,
                    overall: {
                        ...this.getDefaultStatistics().overall,
                        ...(saved.overall || {})
                    },
                    subjects: saved.subjects && typeof saved.subjects === "object" ? saved.subjects : {},
                    chapters: saved.chapters && typeof saved.chapters === "object" ? saved.chapters : {},
                    activities: saved.activities && typeof saved.activities === "object" ? saved.activities : {}
                };
            }

            this.migrateCompositeBestScore();
            this.rebuildChapters();
            this.rebuildOverallFromActivities();
            this.save();
        }
        catch (error) {
            console.error("Statistics Load Error", error);
        }
    },

    init: function () {
        this.ensureProfileContext();
        console.log("Statistics Loaded", this.statistics);
    },

    addResult: function (activity, result) {
        if (!activity || !result) {
            console.error("Statistics Activity Or Result Missing");
            return false;
        }

        if (!this.ensureProfileContext()) {
            console.warn("Statistics Update Skipped: No Active Profile");
            return false;
        }

        const activityId = activity.id || result.activityId;
        const subjectId = activity.subject || activity.subjectId || "unknown";
        const gradeId = activity.grade || activity.gradeId || "unknown";
        const chapterId = activity.chapter || activity.chapterId || "unknown";

        if (!activityId) {
            console.error("Statistics Activity ID Missing", activity);
            return false;
        }

        const score = Number(result.score) || 0;
        const correct = Number(result.correctAnswers ?? result.correct) || 0;
        const wrong = Number(result.wrongAnswers ?? result.wrong) || 0;
        const percentage = Number(result.percentage) || 0;

        const data = {
            score: score,
            correct: correct,
            wrong: wrong,
            percentage: percentage
        };

        this.updateOverall(data);
        this.updateSubject(subjectId, gradeId, data);
        this.updateChapter(chapterId, subjectId, gradeId, data);
        this.updateActivity(activityId, subjectId, gradeId, chapterId, data);

        const saved = this.save();
        if (saved && typeof ContentLockManager !== "undefined" &&
            typeof ContentLockManager.recordProgressionResult === "function") {
            ContentLockManager.recordProgressionResult(activityId, percentage);
        }
        return saved;
    },

    updateOverall: function (data) {
        const overall = this.statistics.overall;

        overall.totalActivities++;
        overall.totalScore += Number(data.score) || 0;
        overall.totalCorrect += Number(data.correct) || 0;
        overall.totalWrong += Number(data.wrong) || 0;
        overall.bestScore = Math.max(overall.bestScore, Number(data.score) || 0);
        overall.averageScore = overall.totalActivities > 0
            ? Math.round(overall.totalScore / overall.totalActivities)
            : 0;
    },

    updateSubject: function (subjectId, gradeId, data) {
        const key = this.createSubjectKey(subjectId, gradeId);
        const subjects = this.statistics.subjects;

        if (!subjects[key]) {
            subjects[key] = {
                subjectId: subjectId,
                gradeId: gradeId,
                totalActivities: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                totalCorrect: 0,
                totalWrong: 0
            };
        }

        const subject = subjects[key];
        subject.totalActivities++;
        subject.totalScore += Number(data.score) || 0;
        subject.totalCorrect += Number(data.correct) || 0;
        subject.totalWrong += Number(data.wrong) || 0;
        subject.bestScore = Math.max(subject.bestScore, Number(data.score) || 0);
        subject.averageScore = subject.totalActivities > 0
            ? Math.round(subject.totalScore / subject.totalActivities)
            : 0;
    },

    updateChapter: function (chapterId, subjectId, gradeId, data) {
        const key = this.createChapterKey(chapterId, subjectId, gradeId);
        const chapters = this.statistics.chapters;

        if (!chapters[key]) {
            chapters[key] = {
                chapterId: chapterId,
                subjectId: subjectId,
                gradeId: gradeId,
                totalActivities: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                totalCorrect: 0,
                totalWrong: 0,
                bestPercentage: 0
            };
        }

        const chapter = chapters[key];
        chapter.totalActivities++;
        chapter.totalScore += Number(data.score) || 0;
        chapter.totalCorrect += Number(data.correct) || 0;
        chapter.totalWrong += Number(data.wrong) || 0;
        chapter.bestScore = Math.max(chapter.bestScore, Number(data.score) || 0);
        chapter.bestPercentage = Math.max(chapter.bestPercentage || 0, Number(data.percentage) || 0);
        chapter.averageScore = chapter.totalActivities > 0
            ? Math.round(chapter.totalScore / chapter.totalActivities)
            : 0;
    },

    updateActivity: function (activityId, subjectId, gradeId, chapterId, data) {
        const key = this.createActivityKey(activityId, subjectId, gradeId, chapterId);
        const activities = this.statistics.activities;

        if (!activities[key]) {
            const old = activities[activityId];
            if (
                old &&
                String(old.gradeId || old.grade || "") === String(gradeId) &&
                String(old.subjectId || old.subject || "") === String(subjectId) &&
                String(old.chapterId || old.chapter || "") === String(chapterId)
            ) {
                activities[key] = old;
                delete activities[activityId];
            }
        }

        if (!activities[key]) {
            activities[key] = {
                activityId: activityId,
                subjectId: subjectId,
                gradeId: gradeId,
                chapterId: chapterId,
                totalActivities: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                totalCorrect: 0,
                totalWrong: 0,
                bestPercentage: 0
            };
        }

        const activity = activities[key];
        activity.totalActivities++;
        activity.totalScore += Number(data.score) || 0;
        activity.totalCorrect += Number(data.correct) || 0;
        activity.totalWrong += Number(data.wrong) || 0;
        activity.bestScore = Math.max(activity.bestScore, Number(data.score) || 0);
        activity.bestPercentage = Math.max(activity.bestPercentage || 0, Number(data.percentage) || 0);
        activity.averageScore = activity.totalActivities > 0
            ? Math.round(activity.totalScore / activity.totalActivities)
            : 0;
    },

    // The animal composite changed from a 30-point legacy scale to 60 points.
    // Migrate only the historical best score when a stored perfect percentage
    // proves that the old best result was 100%. Aggregate totals are preserved:
    // per-attempt scores are not stored, so safely recalculating them is impossible.
    migrateCompositeBestScore: function () {
        const activities = this.statistics.activities || {};
        let migrated = false;

        Object.keys(activities).forEach(function (key) {
            const activity = activities[key];
            if (!activity || typeof activity !== "object") return;

            const activityId = activity.activityId || String(key).split(":").pop();
            if (activityId !== "compositeAnimalMediaDemo") return;
            if (Number(activity.bestPercentage) !== 100) return;
            if (Number(activity.bestScore) >= 60) return;

            activity.bestScore = 60;
            migrated = true;
        });

        if (migrated) {
            console.log("Statistics: Migrated legacy animal composite best score to 60-point scale");
        }
    },

    rebuildOverallFromActivities: function () {
        const activities = this.statistics.activities || {};
        const aggregate = {
            totalActivities: 0,
            totalScore: 0,
            averageScore: 0,
            bestScore: 0,
            totalCorrect: 0,
            totalWrong: 0
        };

        Object.keys(activities).forEach(function (key) {
            const activity = activities[key];
            if (!activity || typeof activity !== "object") return;

            aggregate.totalActivities += Number(activity.totalActivities) || 0;
            aggregate.totalScore += Number(activity.totalScore) || 0;
            aggregate.totalCorrect += Number(activity.totalCorrect) || 0;
            aggregate.totalWrong += Number(activity.totalWrong) || 0;
            aggregate.bestScore = Math.max(
                aggregate.bestScore,
                Number(activity.bestScore) || 0
            );
        });

        aggregate.averageScore = aggregate.totalActivities > 0
            ? Math.round(aggregate.totalScore / aggregate.totalActivities)
            : 0;

        if (aggregate.totalActivities > 0) {
            this.statistics.overall = aggregate;
        }
    },

    rebuildChapters: function () {
        const activities = this.statistics.activities || {};
        const chapters = {};

        Object.keys(activities).forEach(function (key) {
            const activity = activities[key];
            if (!activity || typeof activity !== "object") return;

            const chapterId = activity.chapterId || activity.chapter;
            if (!chapterId) return;

            const subjectId = activity.subjectId || activity.subject || "unknown";
            const gradeId = activity.gradeId || activity.grade || "unknown";
            const chapterKey = this.createChapterKey(chapterId, subjectId, gradeId);

            if (!chapters[chapterKey]) {
                chapters[chapterKey] = {
                    chapterId: chapterId,
                    subjectId: subjectId,
                    gradeId: gradeId,
                    totalActivities: 0,
                    totalScore: 0,
                    averageScore: 0,
                    bestScore: 0,
                    totalCorrect: 0,
                    totalWrong: 0,
                    bestPercentage: 0
                };
            }

            const chapter = chapters[chapterKey];
            chapter.totalActivities += Number(activity.totalActivities) || 0;
            chapter.totalScore += Number(activity.totalScore) || 0;
            chapter.totalCorrect += Number(activity.totalCorrect) || 0;
            chapter.totalWrong += Number(activity.totalWrong) || 0;
            chapter.bestScore = Math.max(chapter.bestScore, Number(activity.bestScore) || 0);
            chapter.bestPercentage = Math.max(
                chapter.bestPercentage,
                Number(activity.bestPercentage) || 0
            );
        }, this);

        Object.keys(chapters).forEach(function (key) {
            const chapter = chapters[key];
            chapter.averageScore = chapter.totalActivities > 0
                ? Math.round(chapter.totalScore / chapter.totalActivities)
                : 0;
        });

        this.statistics.chapters = chapters;
    },

    save: function () {
        if (!this.ensureProfileContext()) return false;
        return SaveManager.save(this.currentStorageKey, this.statistics);
    },

    load: function () {
        return this.ensureProfileContext();
    },

    get: function () {
        if (!this.ensureProfileContext()) {
            return { ...this.getDefaultStatistics().overall };
        }
        return { ...this.statistics.overall };
    },

    getSubject: function (subjectId) {
        this.ensureProfileContext();

        const gradeId =
            typeof ProfileContext !== "undefined" && typeof ProfileContext.getGrade === "function"
                ? ProfileContext.getGrade()
                : null;

        const key = this.createSubjectKey(subjectId, gradeId);
        const subject = this.statistics.subjects[key];

        if (!subject) {
            return {
                subjectId: subjectId,
                gradeId: gradeId,
                totalActivities: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                totalCorrect: 0,
                totalWrong: 0
            };
        }

        return { ...subject };
    },

    getSubjects: function () {
        this.ensureProfileContext();
        return { ...this.statistics.subjects };
    },

    getChapter: function (chapterId, subjectId) {
        this.ensureProfileContext();

        const gradeId =
            typeof ProfileContext !== "undefined" && typeof ProfileContext.getGrade === "function"
                ? ProfileContext.getGrade()
                : null;

        if (subjectId) {
            const exactKey = this.createChapterKey(chapterId, subjectId, gradeId);
            if (this.statistics.chapters[exactKey]) {
                return { ...this.statistics.chapters[exactKey] };
            }
        }

        const foundKey = Object.keys(this.statistics.chapters).find(function (key) {
            const item = this.statistics.chapters[key];
            return item &&
                String(item.chapterId) === String(chapterId) &&
                (!gradeId || String(item.gradeId) === String(gradeId)) &&
                (!subjectId || String(item.subjectId) === String(subjectId));
        });

        if (foundKey) return { ...this.statistics.chapters[foundKey] };

        return {
            chapterId: chapterId,
            subjectId: subjectId || null,
            gradeId: gradeId,
            totalActivities: 0,
            totalScore: 0,
            averageScore: 0,
            bestScore: 0,
            totalCorrect: 0,
            totalWrong: 0,
            bestPercentage: 0
        };
    },

    getChapters: function () {
        this.ensureProfileContext();
        return { ...this.statistics.chapters };
    },

    getActivity: function (activityId) {
        this.ensureProfileContext();

        if (this.statistics.activities[activityId]) {
            return { ...this.statistics.activities[activityId] };
        }

        const foundKey = Object.keys(this.statistics.activities).find(function (key) {
            const item = this.statistics.activities[key];
            return item && String(item.activityId) === String(activityId);
        });

        if (foundKey) return { ...this.statistics.activities[foundKey] };

        return {
            activityId: activityId,
            totalActivities: 0,
            totalScore: 0,
            averageScore: 0,
            bestScore: 0,
            totalCorrect: 0,
            totalWrong: 0,
            bestPercentage: 0
        };
    },

    getActivities: function () {
        this.ensureProfileContext();
        return { ...this.statistics.activities };
    },

    reset: function () {
        if (!this.ensureProfileContext()) return false;
        this.statistics = this.getDefaultStatistics();
        return this.save();
    },

    getAverage: function () { return this.get().averageScore; },
    getBestScore: function () { return this.get().bestScore; },
    getTotalActivities: function () { return this.get().totalActivities; },
    getTotalScore: function () { return this.get().totalScore; },
    getTotalCorrect: function () { return this.get().totalCorrect; },
    getTotalWrong: function () { return this.get().totalWrong; }
};

window.StatisticsManager = StatisticsManager;

StatisticsManager.init();

console.log("Statistics Manager Ready");