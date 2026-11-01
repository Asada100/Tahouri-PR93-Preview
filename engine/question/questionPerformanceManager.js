// =====================================
// Tahouri Edu Platform
// Question Performance Manager v2.1
// Smart Content — Question & Skill Data Layer
//
// Responsibilities:
// - Record question-level correct / wrong results
// - Derive and record the learning skill/concept
// - Aggregate performance by skill for adaptive content
// - Keep data isolated per active profile
//
// Spelling/dictation performance is handled separately by
// SpellingPerformanceStore and must not enter this generic layer.
// =====================================

const QuestionPerformanceManager = {

    VERSION: "2.2",

    STORAGE_KEY: "Tahouri_QuestionPerformance",

    currentActivityId: null,

    initialized: false,

    isSpellingActivity: function (activityId) {
        const id = String(activityId || "");
        return [
            "persianSpellingWords",
            "persianSpellingGuided",
            "persianSpellingContext",
            "persianSpellingGenerated",
            "persianSetayeshSpelling",
            "persianSetayeshSpellingErrorHunt"
        ].indexOf(id) !== -1;
    },

    init: function () {

        if (this.initialized) {
            return;
        }

        if (typeof EventManager === "undefined") {
            console.error("QuestionPerformanceManager: EventManager Not Available");
            return;
        }

        EventManager.on("activityStarted", (activity) => {
            this.currentActivityId =
                activity && activity.id
                    ? activity.id
                    : null;
        });

        EventManager.on("answer:correct", (question) => {
            if (this.isSpellingActivity(this.currentActivityId)) {
                return;
            }
            this.record(question, true);
        });

        EventManager.on("answer:wrong", (question) => {
            if (this.isSpellingActivity(this.currentActivityId)) {
                return;
            }
            this.record(question, false);
        });

        EventManager.on("activityFinished", () => {
            this.currentActivityId = null;
        });

        this.initialized = true;

        console.log("Question Performance Manager v2.1 Ready");
    },

    getStorageKey: function () {

        if (
            typeof ProfileContext !== "undefined" &&
            typeof ProfileContext.key === "function"
        ) {
            return ProfileContext.key(this.STORAGE_KEY);
        }

        return null;
    },

    load: function () {

        const key = this.getStorageKey();

        if (!key) {
            return {};
        }

        try {
            const raw = localStorage.getItem(key);

            if (!raw) {
                return {};
            }

            const data = JSON.parse(raw);

            return data && typeof data === "object"
                ? data
                : {};
        }
        catch (error) {
            console.error(
                "QuestionPerformanceManager: Load failed",
                error
            );
            return {};
        }
    },

    save: function (data) {

        const key = this.getStorageKey();

        if (!key) {
            return false;
        }

        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        }
        catch (error) {
            console.error(
                "QuestionPerformanceManager: Save failed",
                error
            );
            return false;
        }
    },

    getSkill: function (question, activityId) {

        if (!question && !activityId) {
            return null;
        }

        if (question && question.skill) {
            return String(question.skill);
        }

        if (question && question.concept) {
            return String(question.concept);
        }

        const resolvedActivityId =
            activityId ||
            this.currentActivityId ||
            null;

        const mode =
            question && question.mode
                ? String(question.mode)
                : "";

        if (mode === "divisibility") {
            const divisor =
                question && question.divisor !== undefined
                    ? String(question.divisor)
                    : "unknown";

            return "divisibility:" + divisor;
        }

        if (
            mode === "evenOdd" ||
            resolvedActivityId === "evenOdd"
        ) {
            return "evenOdd";
        }

        return resolvedActivityId
            ? "activity:" + String(resolvedActivityId)
            : null;
    },

    getQuestionKey: function (question, activityId) {

        if (!question) {
            return null;
        }

        const resolvedActivityId =
            activityId ||
            this.currentActivityId ||
            "unknown-activity";

        if (question.id !== undefined && question.id !== null) {
            return (
                String(resolvedActivityId) +
                "|id:" +
                String(question.id)
            );
        }

        const parts = [
            resolvedActivityId,
            question.type || "quiz",
            question.mode || "",
            question.number !== undefined ? question.number : "",
            question.divisor !== undefined ? question.divisor : "",
            question.text || ""
        ];

        return parts.join("|");
    },

    record: function (question, isCorrect) {

        const studentId =
            typeof ProfileContext !== "undefined" &&
            typeof ProfileContext.getStudentId === "function"
                ? ProfileContext.getStudentId()
                : null;

        if (!studentId || !question || this.isSpellingActivity(this.currentActivityId)) {
            return false;
        }

        const questionKey = this.getQuestionKey(question);

        if (!questionKey) {
            return false;
        }

        const data = this.load();
        const existing = data[questionKey] || {
            activityId: this.currentActivityId,
            attempts: 0,
            correct: 0,
            wrong: 0,
            lastAnswerCorrect: null,
            firstSeenAt: new Date().toISOString()
        };

        existing.activityId =
            existing.activityId || this.currentActivityId;

        existing.skill =
            existing.skill ||
            this.getSkill(question, existing.activityId);

        existing.attempts += 1;

        if (isCorrect) {
            existing.correct += 1;
        }
        else {
            existing.wrong += 1;
        }

        existing.lastAnswerCorrect = !!isCorrect;
        existing.lastSeenAt = new Date().toISOString();

        if (question.difficulty !== undefined) {
            existing.difficulty = question.difficulty;
        }

        if (question.concept !== undefined) {
            existing.concept = question.concept;
        }

        if (question.mode !== undefined) {
            existing.mode = question.mode;
        }

        if (question.number !== undefined) {
            existing.number = question.number;
        }

        if (question.divisor !== undefined) {
            existing.divisor = question.divisor;
        }

        data[questionKey] = existing;

        const saved = this.save(data);

        if (saved) {
            console.log(
                "Question Performance Recorded:",
                this.currentActivityId,
                questionKey,
                existing.skill,
                isCorrect ? "correct" : "wrong"
            );
        }

        return saved;
    },

    get: function (question, activityId) {

        if (!question) {
            return null;
        }

        const key = this.getQuestionKey(
            question,
            activityId
        );

        const data = this.load();

        return key ? (data[key] || null) : null;
    },

    getSkillPerformance: function (skill) {

        if (!skill) {
            return null;
        }

        const data = this.load();

        let attempts = 0;
        let correct = 0;
        let wrong = 0;
        let questionCount = 0;
        let lastAnswerCorrect = null;
        let lastSeenAt = null;

        Object.keys(data).forEach((key) => {

            const record = data[key];

            if (!record) {
                return;
            }

            const recordSkill =
                record.skill ||
                this.getSkill(record, record.activityId);

            if (recordSkill !== skill) {
                return;
            }

            questionCount += 1;
            attempts += Number(record.attempts) || 0;
            correct += Number(record.correct) || 0;
            wrong += Number(record.wrong) || 0;

            if (
                record.lastSeenAt &&
                (!lastSeenAt || record.lastSeenAt > lastSeenAt)
            ) {
                lastSeenAt = record.lastSeenAt;
                lastAnswerCorrect =
                    record.lastAnswerCorrect === undefined
                        ? null
                        : record.lastAnswerCorrect;
            }
        });

        if (attempts === 0) {
            return null;
        }

        return {
            skill: skill,
            attempts: attempts,
            correct: correct,
            wrong: wrong,
            accuracy: correct / attempts,
            questionCount: questionCount,
            lastAnswerCorrect: lastAnswerCorrect,
            lastSeenAt: lastSeenAt
        };
    },

    getAll: function () {
        return this.load();
    }
};

window.QuestionPerformanceManager = QuestionPerformanceManager;

QuestionPerformanceManager.init();
