// =====================================
// Tahouri Edu Platform
// Grid Puzzle
// Version 2.2
//
// Purpose:
// - Numeric Grid Puzzle
// - Missing Cell(s)
// - Rule-aware validation
// - Single / Multiple answers
// - Engine Cell API compatibility
// =====================================

const GridPuzzle = {

    evaluateRule: function (values, rule, index, rows, cols) {
        if (!rule || typeof rule !== "object") return null;

        const operation = String(rule.operation || rule.type || "").toLowerCase();
        const previous = index > 0 ? values[index - 1] : null;
        const left = index % cols > 0 ? values[index - 1] : null;
        const above = index >= cols ? values[index - cols] : null;
        const step = Number(rule.step ?? rule.value ?? 0);
        const multiplier = Number(rule.multiplier ?? rule.factor ?? rule.value ?? 1);

        const finite = value => Number.isFinite(Number(value));
        const n = value => Number(value);

        if (operation === "add" || operation === "plus" || operation === "step") {
            if (!finite(previous)) return null;
            return n(previous) + step;
        }

        if (operation === "subtract" || operation === "minus") {
            if (!finite(previous)) return null;
            return n(previous) - step;
        }

        if (operation === "multiply" || operation === "times" || operation === "scale") {
            if (!finite(previous) || !Number.isFinite(multiplier)) return null;
            return n(previous) * multiplier;
        }

        if (operation === "multiplyadd" || operation === "scaleoffset") {
            if (!finite(previous) || !Number.isFinite(multiplier)) return null;
            return n(previous) * multiplier + step;
        }

        if (operation === "addmultiply") {
            if (!finite(previous) || !Number.isFinite(multiplier)) return null;
            return (n(previous) + step) * multiplier;
        }

        if (operation === "sameasabove" || operation === "above") {
            return finite(above) ? n(above) : null;
        }

        if (operation === "sameasleft" || operation === "left") {
            return finite(left) ? n(left) : null;
        }

        return null;
    },

    validateRule: function (values, missingIndices, rule, rows, cols, answers, valuesEqual) {
        if (!rule || typeof rule !== "object") return null;

        const working = [...values];
        const expected = [];

        for (const index of missingIndices) {
            const value = this.evaluateRule(working, rule, index, rows, cols);
            if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
            working[index] = value;
            expected.push(value);
        }

        if (Array.isArray(answers) && answers.length === expected.length) {
            if (!expected.every((value, i) => valuesEqual(value, answers[i]))) return null;
        }

        return expected;
    },

    start: function (engine, data) {
        if (!data) {
            console.error("Grid Puzzle: Data Missing");
            return null;
        }

        const rows = Math.max(1, Number(data.rows) || 1);
        const cols = Math.max(1, Number(data.cols) || 1);
        const expectedCells = rows * cols;
        const cells = Array.isArray(data.cells) ? [...data.cells] : [];

        if (cells.length !== expectedCells) {
            console.error("Grid Puzzle: Invalid Cell Count", { expected: expectedCells, actual: cells.length });
            return null;
        }

        const missingIndices = [];
        cells.forEach((value, index) => {
            if (value === null || value === undefined || value === "") missingIndices.push(index);
        });

        if (missingIndices.length === 0) {
            console.error("Grid Puzzle: No Missing Cell");
            return null;
        }

        let answers = Array.isArray(data.answers) ? [...data.answers] : [];
        if (answers.length === 0 && data.answer !== undefined) answers = [data.answer];

        if (answers.length !== 0 && answers.length !== missingIndices.length) {
            console.error("Grid Puzzle: Answer Count Must Match Missing Cells", {
                missing: missingIndices.length,
                answers: answers.length
            });
            return null;
        }

        const rules = Array.isArray(data.rules) ? [...data.rules] : [];
        let ruleExpected = null;

        if (rules.length > 0) {
            if (rules.length !== 1) {
                console.error("Grid Puzzle: Multiple Rules Are Not Yet Supported");
                return null;
            }

            ruleExpected = this.validateRule(
                cells,
                missingIndices,
                rules[0],
                rows,
                cols,
                answers,
                engine.valuesEqual.bind(engine)
            );

            if (!ruleExpected) {
                console.error("Grid Puzzle: Declared Rule Does Not Match Grid", { rule: rules[0] });
                return null;
            }

            console.log("Grid Rule Validated", { expected: ruleExpected });
        }

        engine.puzzle = {
            type: "grid",
            dataType: data.dataType || "number",
            source: data.source || "file",
            instruction: data.instruction || (rules.length > 0
                ? "قانون جدول را پیدا کن و خانه‌های خالی را کامل کن."
                : "خانه‌های خالی را کامل کن."),
            rows,
            cols,
            cells: [...cells],
            missingIndices: [...missingIndices],
            answers: [...answers],
            rules,
            ruleExpected,
            answer: answers.length === 1 ? answers[0] : null
        };

        engine.items = [...cells];
        engine.emitStarted();
        console.log("Grid Puzzle Started");
        console.log("Grid Size:", rows, "x", cols);
        console.log("Missing Cells:", missingIndices);
        console.log("Grid Rules:", engine.puzzle.rules);
        return engine.getState();
    },

    check: function (engine) {
        if (!engine.puzzle) return false;

        const missingIndices = engine.puzzle.missingIndices;
        const allFilled = missingIndices.every(index => {
            const value = engine.items[index];
            return value !== null && value !== undefined && value !== "";
        });

        if (!allFilled) {
            console.log("Grid Puzzle: Answer Not Complete");
            engine.emitWrong();
            return false;
        }

        let correct = false;

        if (Array.isArray(engine.puzzle.rules) && engine.puzzle.rules.length > 0) {
            const expected = this.validateRule(
                engine.items,
                missingIndices,
                engine.puzzle.rules[0],
                engine.puzzle.rows,
                engine.puzzle.cols,
                null,
                engine.valuesEqual.bind(engine)
            );

            correct = Array.isArray(expected) && expected.every((value, i) =>
                engine.valuesEqual(engine.items[missingIndices[i]], value)
            );
        } else {
            const answers = engine.puzzle.answers;
            correct = missingIndices.every((cellIndex, answerIndex) =>
                engine.valuesEqual(engine.items[cellIndex], answers[answerIndex])
            );
        }

        if (correct) {
            console.log("Grid Puzzle Correct");
            engine.finish();
            return true;
        }

        console.log("Grid Puzzle Wrong");
        engine.emitWrong();
        return false;
    },

    setAnswer: function (engine, index, value) {
        return this.setCell(engine, index, value);
    },

    setCell: function (engine, index, value) {
        if (!engine.puzzle) {
            console.error("Grid Puzzle: No Active Puzzle");
            return false;
        }

        const cellIndex = Number(index);
        if (!Number.isInteger(cellIndex)) {
            console.error("Grid Puzzle: Invalid Cell Index");
            return false;
        }

        if (!engine.puzzle.missingIndices.includes(cellIndex)) {
            console.error("Grid Puzzle: Cell Is Not Editable:", cellIndex);
            return false;
        }

        if (value === "" || value === null || value === undefined) {
            engine.items[cellIndex] = null;
            EventManager.emit("puzzleChanged", engine.getState());
            return true;
        }

        let normalizedValue = value;
        if (engine.puzzle.dataType === "number") {
            normalizedValue = Number(value);
            if (!Number.isFinite(normalizedValue)) {
                console.error("Grid Puzzle: Invalid Numeric Value");
                return false;
            }
        } else {
            normalizedValue = String(value).trim();
        }

        engine.items[cellIndex] = normalizedValue;
        engine.moves++;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    },

    setAnswers: function (engine, values) {
        if (!Array.isArray(values)) return false;
        const missingIndices = engine.puzzle ? engine.puzzle.missingIndices : [];
        if (values.length !== missingIndices.length) {
            console.error("Grid Puzzle: Answer Count Mismatch");
            return false;
        }
        for (let i = 0; i < values.length; i++) {
            if (!this.setCell(engine, missingIndices[i], values[i])) return false;
        }
        return true;
    },

    getCell: function (engine, row, col) {
        if (!engine.puzzle) return null;
        const index = this.getIndex(engine, row, col);
        return index < 0 ? null : engine.items[index];
    },

    getIndex: function (engine, row, col) {
        if (!engine.puzzle) return -1;
        const r = Number(row);
        const c = Number(col);
        if (!Number.isInteger(r) || !Number.isInteger(c)) return -1;
        if (r < 0 || r >= engine.puzzle.rows || c < 0 || c >= engine.puzzle.cols) return -1;
        return r * engine.puzzle.cols + c;
    },

    resetCell: function (engine, index) {
        if (!engine.puzzle) return false;
        const cellIndex = Number(index);
        if (!engine.puzzle.missingIndices.includes(cellIndex)) return false;
        engine.items[cellIndex] = null;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    }
};

window.GridPuzzle = GridPuzzle;
PuzzleTypeRegistry.register("grid", GridPuzzle);
console.log("Grid Puzzle v2.2 Ready");