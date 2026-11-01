// =====================================
// Tahouri Edu Platform
// Cross Math Puzzle
// Version 2.1
//
// Purpose:
// - Cross Grid / Cross Math
// - Horizontal and vertical paths
// - Multiple operations
// - Missing numeric cells
// - Path-driven validation
//
// Architecture:
// PuzzleEngine
//      ↓
// CrossGridPuzzle
//      ↓
// PuzzleScreen
// =====================================

const CrossGridPuzzle = {

    start: function (engine, data) {
        if (!data) {
            console.error("Cross Math Puzzle: Data Missing");
            return null;
        }

        const rows = Math.max(1, Number(data.rows) || 1);
        const cols = Math.max(1, Number(data.cols) || 1);
        const expectedCells = rows * cols;

        const rawCells = Array.isArray(data.cells) ? [...data.cells] : [];

        if (rawCells.length !== expectedCells) {
            console.error("Cross Math Puzzle: Invalid Cell Count", {
                expected: expectedCells,
                actual: rawCells.length
            });
            return null;
        }

        const cells = rawCells.map(function (cell) {
            if (cell !== null && typeof cell === "object") {
                return {
                    type: cell.type || "value",
                    value: cell.value !== undefined ? cell.value : null,
                    operator: cell.operator || null,
                    label: cell.label || null
                };
            }

            return {
                type: "value",
                value: cell,
                operator: null,
                label: null
            };
        });

        const missingIndices = [];

        cells.forEach(function (cell, index) {
            if (
                cell.type === "value" &&
                (cell.value === null || cell.value === undefined || cell.value === "")
            ) {
                missingIndices.push(index);
            }
        });

        if (missingIndices.length === 0) {
            console.error("Cross Math Puzzle: No Missing Cell");
            return null;
        }

        const horizontalPaths = this.normalizePaths(data.horizontalPaths, "horizontal");
        const verticalPaths = this.normalizePaths(data.verticalPaths, "vertical");
        const paths = this.normalizePaths(data.paths, null);
        const allPaths = [...horizontalPaths, ...verticalPaths, ...paths];

        // A Cross Grid without a path has no Cross Grid rule.
        if (allPaths.length === 0) {
            console.error(
                "Cross Math Puzzle: At Least One Path Is Required"
            );
            return null;
        }

        const pathValidation = this.validatePathDefinitions(
            allPaths,
            rows,
            cols
        );

        if (!pathValidation.valid) {
            console.error(
                "Cross Math Puzzle: Invalid Path Definition",
                pathValidation.reason
            );
            return null;
        }

        let answers = Array.isArray(data.answers) ? [...data.answers] : [];

        if (answers.length === 0 && data.answer !== undefined) {
            answers = [data.answer];
        }

        // Answers remain supported for legacy content, but are not required
        // when paths provide the authoritative rule.
        if (answers.length > 0 && answers.length !== missingIndices.length) {
            console.error("Cross Math Puzzle: Answer Count Must Match Missing Cells", {
                missing: missingIndices.length,
                answers: answers.length
            });
            return null;
        }

        engine.puzzle = {
            type: "crossGrid",
            dataType: data.dataType || "number",
            source: data.source || "file",
            instruction: data.instruction ||
                "از مسیرهای افقی و عمودی استفاده کن و خانه‌های خالی را کامل کن.",
            rows: rows,
            cols: cols,
            cells: cells,
            missingIndices: [...missingIndices],
            horizontalPaths: horizontalPaths,
            verticalPaths: verticalPaths,
            paths: paths,
            allPaths: allPaths,
            rules: Array.isArray(data.rules) ? [...data.rules] : [],
            answers: answers,
            answer: answers.length === 1 ? answers[0] : null,
            pathRule: true
        };

        engine.items = cells.map(function (cell) {
            return cell.value;
        });

        engine.emitStarted();

        console.log("Cross Math Puzzle Started");
        console.log("Cross Math Grid:", rows, "x", cols);
        console.log("Cross Math Paths:", allPaths.length);
        console.log("Cross Math Missing Cells:", missingIndices);
        console.log("Cross Math Path Rule: true");

        return engine.getState();
    },

    check: function (engine) {
        if (!engine.puzzle) {
            return false;
        }

        const missingIndices = engine.puzzle.missingIndices;
        const answers = engine.puzzle.answers;

        const allFilled = missingIndices.every(function (index) {
            const value = engine.items[index];
            return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
        });

        if (!allFilled) {
            console.log("Cross Math: Answer Not Complete");
            engine.emitWrong();
            return false;
        }

        // The path rule is authoritative whenever paths exist.
        const pathsValid = this.validateAllPaths(engine);

        if (!pathsValid) {
            console.log("Cross Math Wrong: Path Rule Does Not Match");
            engine.emitWrong();
            return false;
        }

        // Legacy answers are an additional compatibility check when supplied.
        if (answers.length > 0) {
            const answersValid = missingIndices.every(function (cellIndex, answerIndex) {
                return engine.valuesEqual(engine.items[cellIndex], answers[answerIndex]);
            });

            if (!answersValid) {
                console.log("Cross Math Wrong: Legacy Answer Does Not Match");
                engine.emitWrong();
                return false;
            }
        }

        console.log("Cross Math Correct");
        engine.finish();
        return true;
    },

    setAnswer: function (engine, index, value) {
        return this.setCell(engine, index, value);
    },

    setCell: function (engine, index, value) {
        if (!engine.puzzle) {
            console.error("Cross Math Puzzle: No Active Puzzle");
            return false;
        }

        const cellIndex = Number(index);

        if (!Number.isInteger(cellIndex)) {
            console.error("Cross Math Puzzle: Invalid Cell Index");
            return false;
        }

        if (!engine.puzzle.missingIndices.includes(cellIndex)) {
            console.error("Cross Math Puzzle: Cell Is Not Editable:", cellIndex);
            return false;
        }

        if (value === "" || value === null || value === undefined) {
            engine.items[cellIndex] = null;
            EventManager.emit("puzzleChanged", engine.getState());
            return true;
        }

        const numericValue = Number(value);

        if (!Number.isFinite(numericValue)) {
            console.error("Cross Math Puzzle: Invalid Number");
            return false;
        }

        engine.items[cellIndex] = numericValue;
        engine.moves++;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    },

    setAnswers: function (engine, values) {
        if (!Array.isArray(values)) {
            return false;
        }

        const missingIndices = engine.puzzle ? engine.puzzle.missingIndices : [];

        if (values.length !== missingIndices.length) {
            console.error("Cross Math Puzzle: Answer Count Mismatch");
            return false;
        }

        for (let i = 0; i < values.length; i++) {
            if (!this.setCell(engine, missingIndices[i], values[i])) {
                return false;
            }
        }

        return true;
    },

    validateAllPaths: function (engine) {
        const paths = engine.puzzle ? engine.puzzle.allPaths : [];

        if (!Array.isArray(paths) || paths.length === 0) {
            return false;
        }

        for (let i = 0; i < paths.length; i++) {
            if (!this.validatePath(engine, paths[i])) {
                return false;
            }
        }

        return true;
    },

    validatePath: function (engine, path) {
        if (!path || !Array.isArray(path.cells) || path.cells.length < 2) {
            return false;
        }

        let result = null;
        let operationIndex = 0;

        for (let i = 0; i < path.cells.length; i++) {
            const cellIndex = Number(path.cells[i]);

            if (!Number.isInteger(cellIndex)) {
                return false;
            }

            const cell = engine.puzzle.cells[cellIndex];

            if (!cell || cell.type !== "value") {
                return false;
            }

            const value = engine.items[cellIndex];

            if (
                value === null ||
                value === undefined ||
                value === "" ||
                !Number.isFinite(Number(value))
            ) {
                return false;
            }

            const numericValue = Number(value);

            if (result === null) {
                result = numericValue;
                continue;
            }

            const operation = this.getPathOperation(path, operationIndex);

            if (!operation) {
                console.error("Cross Math: Missing Operation", path.id);
                return false;
            }

            result = this.applyOperation(result, numericValue, operation);

            if (result === null || !Number.isFinite(result)) {
                return false;
            }

            operationIndex++;
        }

        if (path.target === undefined) {
            console.error("Cross Math: Path Target Missing", path.id);
            return false;
        }

        return engine.valuesEqual(result, path.target);
    },

    getPathOperation: function (path, index) {
        if (Array.isArray(path.operations)) {
            return path.operations[index] || null;
        }

        if (Array.isArray(path.operators)) {
            return path.operators[index] || null;
        }

        if (path.operation) {
            return path.operation;
        }

        return null;
    },

    applyOperation: function (left, right, operation) {
        switch (operation) {
            case "+":
            case "add":
                return left + right;

            case "-":
            case "subtract":
                return left - right;

            case "×":
            case "*":
            case "multiply":
                return left * right;

            case "÷":
            case "/":
            case "divide":
                if (right === 0) {
                    return null;
                }
                return left / right;

            default:
                console.warn("Cross Math: Unknown Operation:", operation);
                return null;
        }
    },

    validatePathDefinitions: function (paths, rows, cols) {
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];

            if (!Array.isArray(path.cells) || path.cells.length < 2) {
                return { valid: false, reason: "Path must contain at least two cells" };
            }

            for (let j = 0; j < path.cells.length; j++) {
                const index = Number(path.cells[j]);

                if (
                    !Number.isInteger(index) ||
                    index < 0 ||
                    index >= rows * cols
                ) {
                    return { valid: false, reason: "Path contains an invalid cell index" };
                }
            }

            const operationCount = path.operations.length > 0
                ? path.operations.length
                : path.operators.length > 0
                    ? path.operators.length
                    : path.operation
                        ? path.cells.length - 1
                        : 0;

            if (operationCount !== path.cells.length - 1) {
                return { valid: false, reason: "Operation count must equal cell count minus one" };
            }

            if (path.target === undefined) {
                return { valid: false, reason: "Every path must have a target" };
            }
        }

        return { valid: true };
    },

    normalizePaths: function (paths, defaultDirection) {
        if (!Array.isArray(paths)) {
            return [];
        }

        return paths
            .filter(function (path) {
                return path && Array.isArray(path.cells);
            })
            .map(function (path, index) {
                const operations = Array.isArray(path.operations)
                    ? [...path.operations]
                    : Array.isArray(path.operators)
                        ? [...path.operators]
                        : [];

                return {
                    id: path.id || ("path_" + index),
                    direction: path.direction || defaultDirection || "horizontal",
                    cells: [...path.cells],
                    operations: operations,
                    operators: Array.isArray(path.operators) ? [...path.operators] : [],
                    operation: path.operation || null,
                    target: path.target !== undefined ? path.target : undefined,
                    label: path.label || null
                };
            });
    },

    getCell: function (engine, row, col) {
        if (!engine.puzzle) {
            return null;
        }

        const index = this.getIndex(engine, row, col);
        return index < 0 ? null : engine.items[index];
    },

    getIndex: function (engine, row, col) {
        if (!engine.puzzle) {
            return -1;
        }

        const r = Number(row);
        const c = Number(col);

        if (!Number.isInteger(r) || !Number.isInteger(c)) {
            return -1;
        }

        if (
            r < 0 ||
            r >= engine.puzzle.rows ||
            c < 0 ||
            c >= engine.puzzle.cols
        ) {
            return -1;
        }

        return (r * engine.puzzle.cols) + c;
    },

    resetCell: function (engine, index) {
        if (!engine.puzzle) {
            return false;
        }

        const cellIndex = Number(index);

        if (!engine.puzzle.missingIndices.includes(cellIndex)) {
            return false;
        }

        engine.items[cellIndex] = null;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    }
};

window.CrossGridPuzzle = CrossGridPuzzle;

PuzzleTypeRegistry.register(
    "crossGrid",
    CrossGridPuzzle
);

console.log("Cross Math Puzzle v2.1 Ready");