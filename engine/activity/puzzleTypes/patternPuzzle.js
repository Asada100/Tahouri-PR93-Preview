// =====================================
// Tahouri Edu Platform
// Pattern Puzzle
// Version 1.0
// =====================================

const PatternPuzzle = {

    start: function (engine, data) {
        const items = Array.isArray(data.items) ? [...data.items] : [];
        const mode = data.mode || "numeric";
        const missingIndex = Number.isInteger(data.missingIndex) ? data.missingIndex : -1;
        const relationMode = mode === "relation";

        if (!items.length || (!relationMode && missingIndex < 0) || missingIndex >= items.length) {
            console.error("Pattern Puzzle: Invalid Items or Missing Index");
            return null;
        }

        if (data.answer === undefined || data.answer === null) {
            console.error("Pattern Puzzle: Answer Missing");
            return null;
        }

        engine.puzzle = {
            type: "pattern",
            mode: mode,
            dataType: data.dataType || engine.detectDataType(items.filter(function (v) { return v !== null; })),
            source: data.source || "file",
            instruction: data.instruction || "الگو را پیدا کن و جای خالی را کامل کن.",
            items: [...items],
            missingIndex: missingIndex,
            answer: data.answer,
            options: Array.isArray(data.options) ? [...data.options] : []
        };

        engine.items = [...items];
        engine.userAnswer = null;
        engine.emitStarted();
        return engine.getState();
    },

    setAnswer: function (engine, value) {
        if (!engine.puzzle || engine.puzzle.type !== "pattern") return false;
        const answer = engine.puzzle.dataType === "number" && value !== "" && value !== null
            ? Number(value)
            : value;
        if (engine.puzzle.dataType === "number" && !Number.isFinite(answer)) return false;
        engine.userAnswer = answer;
        if (engine.puzzle.mode !== "relation" && engine.puzzle.missingIndex >= 0) {
            engine.items[engine.puzzle.missingIndex] = answer;
        }
        engine.moves++;
        return engine.emitChanged();
    },

    check: function (engine) {
        const value = engine.userAnswer !== null && engine.userAnswer !== undefined
            ? engine.userAnswer
            : engine.items[engine.puzzle.missingIndex];

        if (engine.valuesEqual(value, engine.puzzle.answer)) {
            engine.finish();
            return true;
        }

        engine.emitWrong();
        return false;
    }
};

window.PatternPuzzle = PatternPuzzle;

PuzzleTypeRegistry.register("pattern", PatternPuzzle);

console.log("Pattern Puzzle v1.0 Ready");
