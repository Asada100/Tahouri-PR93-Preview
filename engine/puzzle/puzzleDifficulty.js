// =====================================
// Tahouri Edu Platform
// Puzzle Difficulty Model
// Version 1.0
//
// Purpose:
// - Shared difficulty vocabulary for real Puzzles
// - Difficulty is based on cognitive challenge, not only numbers
// - No automatic difficulty changes to existing activities
// =====================================

const PuzzleDifficulty = {

    VERSION: "1.0",

    levels: {
        1: "آشنایی",
        2: "آسان",
        3: "متوسط",
        4: "چالشی",
        5: "پیشرفته"
    },

    dimensions: [
        "searchSpace",
        "clueCount",
        "ambiguity",
        "steps",
        "hiddenRelations",
        "helpReduction"
    ],

    normalize: function (difficulty) {
        const value = Number(difficulty);

        if (!Number.isFinite(value)) return 1;

        return Math.min(
            5,
            Math.max(1, Math.round(value))
        );
    },

    getLabel: function (difficulty) {
        return this.levels[this.normalize(difficulty)];
    },

    create: function (difficulty, dimensions) {
        return {
            level: this.normalize(difficulty),
            label: this.getLabel(difficulty),
            dimensions: {
                ...(dimensions || {})
            }
        };
    }
};

window.PuzzleDifficulty = PuzzleDifficulty;

console.log("Puzzle Difficulty Model v1.0 Ready");
