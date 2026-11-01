// =====================================
// Tahouri Edu Platform
// Puzzle Definition Contract
// Version 1.0
//
// Purpose:
// - Common contract for next-generation Puzzles
// - Keep objective, rules, interaction and progression explicit
// - Do not replace existing Puzzle engines
// =====================================

const PuzzleDefinition = {

    VERSION: "1.0",

    required: [
        "type",
        "objective",
        "instruction",
        "difficulty",
        "content",
        "rules",
        "interaction",
        "feedback",
        "hints",
        "scoring",
        "progression"
    ],

    create: function (data) {
        const source = data || {};

        return {
            id: source.id || null,
            type: source.type || null,
            title: source.title || "",
            objective: source.objective || "",
            instruction: source.instruction || "",
            difficulty: source.difficulty || 1,
            content: source.content || {},
            rules: source.rules || {},
            interaction: source.interaction || {},
            feedback: source.feedback || {},
            hints: Array.isArray(source.hints) ? [...source.hints] : [],
            scoring: source.scoring || {},
            progression: source.progression || {}
        };
    },

    validate: function (definition) {
        if (!definition || typeof definition !== "object") {
            return {
                valid: false,
                missing: [...this.required]
            };
        }

        const missing = this.required.filter(function (key) {
            return definition[key] === undefined || definition[key] === null;
        });

        return {
            valid: missing.length === 0,
            missing: missing
        };
    }
};

window.PuzzleDefinition = PuzzleDefinition;

console.log("Puzzle Definition Contract v1.0 Ready");
