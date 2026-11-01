// =====================================
// Tahouri Edu Platform
// Spelling Performance Store
// Version 1.1
// Profile-scoped persistent spelling history
// =====================================
(function (window) {
    "use strict";

    const BASE_KEY = "Tahouri_Spelling_Performance";
    const MAX_RECORDS = 2000;

    function storageKey() {
        if (window.ProfileContext && typeof window.ProfileContext.key === "function") {
            return window.ProfileContext.key(BASE_KEY);
        }
        return null;
    }

    function load() {
        const key = storageKey();
        if (!key || !window.SaveManager) return { answers: [], targetAnswers: [] };
        const data = window.SaveManager.load(key);
        return {
            answers: Array.isArray(data && data.answers) ? data.answers : [],
            targetAnswers: Array.isArray(data && data.targetAnswers) ? data.targetAnswers : []
        };
    }

    function save(data) {
        const key = storageKey();
        if (!key || !window.SaveManager) return false;
        return window.SaveManager.save(key, {
            version: "1.1",
            answers: data.answers.slice(-MAX_RECORDS),
            targetAnswers: data.targetAnswers.slice(-MAX_RECORDS)
        });
    }

    const SpellingPerformanceStore = {
        version: "1.0",

        load: function () {
            return load();
        },

        getPerformance: function () {
            return load();
        },

        recordSession: function (session) {
            if (!session || !session.activityId) return false;
            const current = load();
            const answers = Array.isArray(session.answers) ? session.answers : [];
            const targetAnswers = Array.isArray(session.targetAnswers) ? session.targetAnswers : [];

            const questionRecords = answers.map(function (record) {
                return {
                    activityId: session.activityId,
                    questionIndex: record.questionIndex,
                    target: record.target || "",
                    spellingRule: record.spellingRule || null,
                    completed: !!record.completed,
                    correct: !!record.correct,
                    characterErrors: Number(record.characterErrors) || 0,
                    recordedAt: new Date().toISOString()
                };
            });

            const targetRecords = targetAnswers.map(function (record) {
                return {
                    activityId: session.activityId,
                    questionIndex: record.questionIndex,
                    target: record.target || "",
                    spellingRule: record.spellingRule || null,
                    completed: !!record.completed,
                    correct: !!record.correct,
                    characterErrors: Number(record.characterErrors) || 0,
                    recordedAt: new Date().toISOString()
                };
            });

            return save({
                answers: current.answers.concat(questionRecords),
                targetAnswers: current.targetAnswers.concat(targetRecords)
            });
        },

        clear: function () {
            const key = storageKey();
            if (!key || !window.SaveManager) return false;
            return window.SaveManager.remove(key);
        }
    };

    window.SpellingPerformanceStore = SpellingPerformanceStore;

    if (window.EventManager && typeof window.EventManager.on === "function") {
        window.EventManager.on("activityFinished", function (result) {
            if (!window.DictationEngine || typeof window.DictationEngine.getSessionState !== "function") return;

            const activity = window.DictationEngine.activity;
            const state = window.DictationEngine.getSessionState();

            if (!activity || !activity.id || !state || !state.isFinished) return;

            // Only persist when the finished activity belongs to the DictationEngine.
            // This prevents stale spelling state from being recorded when another
            // activity emits the same generic lifecycle event.
            if (result && result.activityId && result.activityId !== activity.id) return;

            SpellingPerformanceStore.recordSession({
                activityId: activity.id,
                answers: state.answers,
                targetAnswers: state.targetAnswers
            });
        });
    }
})(window);

console.log("Spelling Performance Store v1.0 Ready");
