// =====================================
// Tahouri Edu Platform
// Adaptive Question Generator v1.0
// Smart Content — Skill-Aware Generation
//
// Responsibilities:
// - Read the student's skill performance
// - Adapt supported Quiz difficulty before generation
// - Keep QuizProvider / Question Generator unchanged
// - Preserve the requested question count
//
// Scope:
// - Quiz only
// - Difficulty-aware activities only
// - Currently supports divisibility generation
// - No changes to Memory / Puzzle / Statistics / Progress
// =====================================

const AdaptiveQuestionGenerator = {

    VERSION: "1.0",

    initialized: false,

    init: function () {

        if (this.initialized) {
            return;
        }

        if (
            typeof QuestionProvider === "undefined" ||
            typeof QuestionProvider.getQuestions !== "function"
        ) {
            console.error(
                "AdaptiveQuestionGenerator: QuestionProvider Not Available"
            );
            return;
        }

        if (
            typeof QuestionPerformanceManager === "undefined" ||
            typeof QuestionPerformanceManager.getSkillPerformance !== "function"
        ) {
            console.error(
                "AdaptiveQuestionGenerator: QuestionPerformanceManager Not Available"
            );
            return;
        }

        const originalGetQuestions =
            QuestionProvider.getQuestions.bind(QuestionProvider);

        const generator = this;

        QuestionProvider.getQuestions = async function (activityData) {

            const adaptiveActivity =
                generator.adaptActivity(activityData);

            const questions =
                await originalGetQuestions(adaptiveActivity);

            generator.logAdaptation(
                activityData,
                adaptiveActivity
            );

            return questions;
        };

        this.initialized = true;

        console.log(
            "Adaptive Question Generator v1.0 Ready"
        );
    },

    adaptActivity: function (activityData) {

        if (!activityData || !activityData.settings) {
            return activityData;
        }

        const settings = activityData.settings;
        const engine = activityData.engine || activityData.type || "";
        const mode = settings.mode || "";

        if (
            engine !== "quiz" &&
            engine !== "QuizEngine"
        ) {
            return activityData;
        }

        if (
            settings.smartContent === false ||
            !this.supportsDifficulty(mode)
        ) {
            return activityData;
        }

        const skill =
            typeof QuestionPerformanceManager.getSkill === "function"
                ? QuestionPerformanceManager.getSkill(
                    { mode: mode, divisor: settings.divisor },
                    activityData.id
                )
                : null;

        if (!skill) {
            return activityData;
        }

        const performance =
            QuestionPerformanceManager.getSkillPerformance(skill);

        if (!performance) {
            return activityData;
        }

        const currentDifficulty =
            this.normalizeDifficulty(settings.difficulty || "medium");

        const targetDifficulty =
            this.getTargetDifficulty(
                currentDifficulty,
                performance.accuracy
            );

        if (targetDifficulty === currentDifficulty) {
            return activityData;
        }

        return {
            ...activityData,
            settings: {
                ...settings,
                difficulty: targetDifficulty
            }
        };
    },

    supportsDifficulty: function (mode) {
        return mode === "divisibility";
    },

    normalizeDifficulty: function (difficulty) {
        if (
            difficulty === "easy" ||
            difficulty === "medium" ||
            difficulty === "hard"
        ) {
            return difficulty;
        }

        return "medium";
    },

    getTargetDifficulty: function (currentDifficulty, accuracy) {

        if (accuracy < 0.60) {
            return this.stepDown(currentDifficulty);
        }

        if (accuracy >= 0.80) {
            return this.stepUp(currentDifficulty);
        }

        return currentDifficulty;
    },

    stepDown: function (difficulty) {

        if (difficulty === "hard") {
            return "medium";
        }

        if (difficulty === "medium") {
            return "easy";
        }

        return "easy";
    },

    stepUp: function (difficulty) {

        if (difficulty === "easy") {
            return "medium";
        }

        if (difficulty === "medium") {
            return "hard";
        }

        return "hard";
    },

    logAdaptation: function (originalActivity, adaptedActivity) {

        if (
            !originalActivity ||
            !adaptedActivity ||
            !originalActivity.settings ||
            !adaptedActivity.settings
        ) {
            return;
        }

        const before =
            originalActivity.settings.difficulty || "medium";

        const after =
            adaptedActivity.settings.difficulty || "medium";

        if (before !== after) {
            console.log(
                "Smart Content: Difficulty Adapted",
                originalActivity.id,
                before + " → " + after
            );
        }
    }
};

window.AdaptiveQuestionGenerator =
    AdaptiveQuestionGenerator;

AdaptiveQuestionGenerator.init();
