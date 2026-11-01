// =====================================
// Tahouri Edu Platform
// Puzzle Feedback Model
// Version 1.0
//
// Purpose:
// - Shared feedback vocabulary for next-generation Puzzles
// - Separate outcome from explanation and hint
// - Keep feedback useful for learning
// =====================================

const PuzzleFeedback = {

    VERSION: "1.0",

    statuses: {
        neutral: "neutral",
        correct: "correct",
        incorrect: "incorrect",
        hint: "hint",
        complete: "complete"
    },

    create: function (data) {
        const source = data || {};

        return {
            status: source.status || "neutral",
            message: source.message || "",
            explanation: source.explanation || "",
            hint: source.hint || "",
            canRetry: source.canRetry !== false
        };
    },

    correct: function (message, explanation) {
        return this.create({
            status: "correct",
            message: message || "درست است",
            explanation: explanation || ""
        });
    },

    incorrect: function (message, explanation, hint) {
        return this.create({
            status: "incorrect",
            message: message || "هنوز درست نیست",
            explanation: explanation || "",
            hint: hint || ""
        });
    },

    hint: function (message) {
        return this.create({
            status: "hint",
            message: message || "یک سرنخ برایت داریم"
        });
    },

    complete: function (message) {
        return this.create({
            status: "complete",
            message: message || "پازل را حل کردی!"
        });
    }
};

window.PuzzleFeedback = PuzzleFeedback;

console.log("Puzzle Feedback Model v1.0 Ready");
