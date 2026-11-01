// =====================================
// Tahouri Edu Platform
// Smart Question Selector v2.0
// Smart Content — Skill-Aware Adaptive Ordering
//
// Responsibilities:
// - Use question-level performance data
// - Use skill/concept-level performance data
// - Prioritize previously weak questions
// - Give unseen questions higher priority when their skill is weak
// - Keep all generated/bank questions; change order only
//
// Scope:
// - Quiz questions only
// - Does not modify QuizEngine
// - Does not modify Question Generator
// - Does not modify Memory / Puzzle
// - Does not modify Statistics / Progress
// =====================================

const SmartQuestionSelector = {

    VERSION: "2.0",

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
                "SmartQuestionSelector: QuestionProvider Not Available"
            );
            return;
        }

        if (
            typeof QuestionPerformanceManager === "undefined" ||
            typeof QuestionPerformanceManager.get !== "function"
        ) {
            console.error(
                "SmartQuestionSelector: QuestionPerformanceManager Not Available"
            );
            return;
        }

        const originalGetQuestions =
            QuestionProvider.getQuestions.bind(QuestionProvider);

        const selector = this;

        QuestionProvider.getQuestions = async function (activityData) {

            const questions =
                await originalGetQuestions(activityData);

            return selector.select(
                questions,
                activityData
            );
        };

        this.initialized = true;

        console.log(
            "Smart Question Selector v2.0 Ready"
        );
    },

    select: function (questions, activityData) {

        if (!Array.isArray(questions) || questions.length < 2) {
            return Array.isArray(questions) ? questions : [];
        }

        const activityId =
            activityData && activityData.id
                ? activityData.id
                : null;

        if (!activityId) {
            return questions;
        }

        const scored = questions.map((question, index) => ({
            question: question,
            index: index,
            score: this.getPriorityScore(
                question,
                activityId
            )
        }));

        const hasKnownPerformance = scored.some(
            item => item.score !== null
        );

        if (!hasKnownPerformance) {
            return questions;
        }

        scored.sort((a, b) => {

            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return a.index - b.index;
        });

        const result = scored.map(
            item => item.question
        );

        console.log(
            "Smart Content: Question Order Adapted",
            activityId
        );

        return result;
    },

    getPriorityScore: function (question, activityId) {

        if (!question) {
            return null;
        }

        let record = null;

        try {
            record = QuestionPerformanceManager.get(
                question,
                activityId
            );
        }
        catch (error) {
            console.warn(
                "SmartQuestionSelector: Performance lookup failed",
                error
            );
            return null;
        }

        const skill =
            typeof QuestionPerformanceManager.getSkill === "function"
                ? QuestionPerformanceManager.getSkill(
                    question,
                    activityId
                )
                : null;

        let skillPerformance = null;

        if (
            skill &&
            typeof QuestionPerformanceManager.getSkillPerformance === "function"
        ) {
            try {
                skillPerformance =
                    QuestionPerformanceManager.getSkillPerformance(skill);
            }
            catch (error) {
                console.warn(
                    "SmartQuestionSelector: Skill performance lookup failed",
                    error
                );
            }
        }

        // Unseen questions receive a stronger priority when the
        // student has demonstrated weakness in the same skill.
        if (!record) {

            if (skillPerformance) {

                const accuracy =
                    skillPerformance.accuracy;

                if (accuracy < 0.60) {
                    return 80;
                }

                if (accuracy < 0.80) {
                    return 65;
                }
            }

            return 50;
        }

        const attempts =
            Number(record.attempts) || 0;

        const correct =
            Number(record.correct) || 0;

        const wrong =
            Number(record.wrong) || 0;

        if (attempts <= 0) {
            return 50;
        }

        const accuracy =
            correct / attempts;

        // Priority range:
        // 100 = repeatedly wrong
        // 50  = neutral / unseen
        // 0   = fully mastered
        let priority =
            Math.round((1 - accuracy) * 100);

        if (record.lastAnswerCorrect === false) {
            priority += 15;
        }

        if (wrong >= 2) {
            priority += 10;
        }

        // Skill weakness gives previously attempted questions
        // an additional, bounded boost without changing content.
        if (skillPerformance) {

            if (skillPerformance.accuracy < 0.60) {
                priority += 10;
            }
            else if (skillPerformance.accuracy < 0.80) {
                priority += 5;
            }
        }

        return Math.min(
            125,
            Math.max(0, priority)
        );
    }
};

window.SmartQuestionSelector =
    SmartQuestionSelector;

SmartQuestionSelector.init();
