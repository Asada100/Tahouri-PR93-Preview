// =====================================
// Tahouri Edu Platform
// Next-Generation Puzzle Interaction Contract
// Version 1.0
//
// Purpose:
// - Shared interaction vocabulary for next-generation Puzzles
// - Keep gameplay semantics separate from rendering
// - Define natural player actions without forcing one interaction model
// - Support Jigsaw, Sudoku, Maze, Logic, Sentence Builder, and future types
//
// This module is a contract/model only.
// It does not render UI and does not replace legacy Puzzle interactions.
// =====================================

const PuzzleInteraction = {

    VERSION: "1.0",

    MODES: {
        DRAG: "drag",
        SWAP: "swap",
        TAP: "tap",
        SELECT: "select",
        PLACE: "place",
        CONNECT: "connect",
        TRACE: "trace",
        ROTATE: "rotate",
        BUILD: "build"
    },

    FEEDBACK: {
        SNAP: "snap",
        TARGET: "target",
        PATH: "path",
        SELECTED: "selected",
        PROGRESS: "progress"
    },

    create: function (data) {

        const source = data || {};
        const mode = this.normalizeMode(source.mode);

        return {
            mode: mode,
            feedback: this.normalizeFeedback(source.feedback, mode),
            allowUndo: source.allowUndo !== false,
            allowReset: source.allowReset !== false,
            animation: source.animation !== false,
            touch: source.touch !== false,
            keyboard: source.keyboard !== false
        };
    },

    normalizeMode: function (mode) {

        const value = String(mode || "tap").trim().toLowerCase();
        return Object.values(this.MODES).includes(value)
            ? value
            : "tap";
    },

    normalizeFeedback: function (feedback, mode) {

        if (feedback && Object.values(this.FEEDBACK).includes(feedback)) {
            return feedback;
        }

        switch (mode) {
            case this.MODES.DRAG:
            case this.MODES.SWAP:
            case this.MODES.ROTATE:
                return this.FEEDBACK.SNAP;
            case this.MODES.CONNECT:
            case this.MODES.TRACE:
                return this.FEEDBACK.PATH;
            case this.MODES.PLACE:
            case this.MODES.BUILD:
                return this.FEEDBACK.TARGET;
            default:
                return this.FEEDBACK.SELECTED;
        }
    },

    validate: function (interaction) {

        if (!interaction || typeof interaction !== "object") {
            return { valid: false, missing: ["mode"] };
        }

        const mode = this.normalizeMode(interaction.mode);
        const known = Object.values(this.MODES).includes(mode);

        return {
            valid: known,
            missing: known ? [] : ["mode"]
        };
    },

    isDirectManipulation: function (mode) {

        return [
            this.MODES.DRAG,
            this.MODES.SWAP,
            this.MODES.ROTATE,
            this.MODES.BUILD
        ].includes(this.normalizeMode(mode));
    },

    isChoiceBased: function (mode) {

        return [
            this.MODES.TAP,
            this.MODES.SELECT,
            this.MODES.PLACE
        ].includes(this.normalizeMode(mode));
    },

    isPathBased: function (mode) {

        return [
            this.MODES.CONNECT,
            this.MODES.TRACE
        ].includes(this.normalizeMode(mode));
    }
};

window.PuzzleInteraction = PuzzleInteraction;

console.log("Puzzle Interaction Contract v1.0 Ready");
