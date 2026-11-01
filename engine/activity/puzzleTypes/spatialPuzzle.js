// =====================================
// Tahouri Edu Platform
// Spatial Puzzle
// Version 2.0
// Modes: legacy, place, symmetry
// =====================================

const SpatialPuzzle = {

    randomInt: function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    shuffle: function (items) {
        const result = [...items];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },

    gradeNumber: function (value) {
        const match = String(value || "").match(/(\d+)/);
        return match ? Number(match[1]) : 6;
    },

    validateCoordinatePlaneData: function (data) {
        if (!data || data.type !== "spatial" || data.mode !== "coordinatePlane") {
            return { valid: false, reason: "invalid-activity-mode" };
        }

        const system = data.coordinateSystem;
        if (!system || typeof system !== "object") {
            return { valid: false, reason: "missing-coordinate-system" };
        }

        const values = [system.xMin, system.xMax, system.yMin, system.yMax, system.unitStep];
        if (!values.every(function (value) {
            return typeof value === "number" && Number.isFinite(value);
        })) {
            return { valid: false, reason: "non-finite-coordinate-system" };
        }

        if (system.xMin >= system.xMax || system.yMin >= system.yMax || system.unitStep <= 0) {
            return { valid: false, reason: "invalid-coordinate-range" };
        }

        const stepFits = function (min, max, step) {
            const intervals = (max - min) / step;
            return Math.abs(intervals - Math.round(intervals)) <= 1e-9;
        };
        if (!stepFits(system.xMin, system.xMax, system.unitStep) ||
            !stepFits(system.yMin, system.yMax, system.unitStep)) {
            return { valid: false, reason: "incompatible-unit-step" };
        }

        const isCoordinate = function (point) {
            return !!point && typeof point.x === "number" && Number.isFinite(point.x) &&
                typeof point.y === "number" && Number.isFinite(point.y) &&
                point.x >= system.xMin && point.x <= system.xMax &&
                point.y >= system.yMin && point.y <= system.yMax;
        };
        const task = data.task;
        if (!task || !["readPoint", "placePoint", "identifyPoint"].includes(task.kind)) {
            return { valid: false, reason: "unknown-task-kind" };
        }

        if (task.kind === "readPoint" || task.kind === "placePoint") {
            if (!isCoordinate(task.target)) {
                return { valid: false, reason: "invalid-target-coordinate" };
            }
        }

        if (task.kind === "identifyPoint") {
            if (!Array.isArray(task.points) || task.points.length === 0) {
                return { valid: false, reason: "missing-identify-points" };
            }
            const ids = new Set();
            for (const point of task.points) {
                if (!point || (typeof point.id !== "string" && typeof point.id !== "number") ||
                    String(point.id).trim() === "" || ids.has(String(point.id)) || !isCoordinate(point)) {
                    return { valid: false, reason: "invalid-identify-point" };
                }
                ids.add(String(point.id));
            }
            if (task.answerId === undefined || task.answerId === null || String(task.answerId).trim() === "") {
                return { valid: false, reason: "missing-identify-answer" };
            }
            if (!ids.has(String(task.answerId))) {
                return { valid: false, reason: "unknown-identify-answer" };
            }
        }

        return { valid: true, reason: null };
    },

    mathToPixel: function (point, coordinateSystem, viewport) {
        if (!point || !coordinateSystem || !viewport ||
            ![point.x, point.y, coordinateSystem.xMin, coordinateSystem.xMax,
                coordinateSystem.yMin, coordinateSystem.yMax, viewport.left,
                viewport.right, viewport.top, viewport.bottom].every(Number.isFinite) ||
            coordinateSystem.xMin >= coordinateSystem.xMax ||
            coordinateSystem.yMin >= coordinateSystem.yMax ||
            viewport.left >= viewport.right || viewport.top >= viewport.bottom ||
            point.x < coordinateSystem.xMin || point.x > coordinateSystem.xMax ||
            point.y < coordinateSystem.yMin || point.y > coordinateSystem.yMax) {
            return null;
        }

        return {
            x: viewport.left + ((point.x - coordinateSystem.xMin) /
                (coordinateSystem.xMax - coordinateSystem.xMin)) * (viewport.right - viewport.left),
            y: viewport.bottom - ((point.y - coordinateSystem.yMin) /
                (coordinateSystem.yMax - coordinateSystem.yMin)) * (viewport.bottom - viewport.top)
        };
    },

    pixelToMath: function (pixel, coordinateSystem, viewport) {
        if (!pixel || !coordinateSystem || !viewport ||
            ![pixel.x, pixel.y, coordinateSystem.xMin, coordinateSystem.xMax,
                coordinateSystem.yMin, coordinateSystem.yMax, viewport.left,
                viewport.right, viewport.top, viewport.bottom].every(Number.isFinite) ||
            coordinateSystem.xMin >= coordinateSystem.xMax ||
            coordinateSystem.yMin >= coordinateSystem.yMax ||
            viewport.left >= viewport.right || viewport.top >= viewport.bottom ||
            pixel.x < viewport.left || pixel.x > viewport.right ||
            pixel.y < viewport.top || pixel.y > viewport.bottom) {
            return null;
        }

        return {
            x: coordinateSystem.xMin + ((pixel.x - viewport.left) /
                (viewport.right - viewport.left)) * (coordinateSystem.xMax - coordinateSystem.xMin),
            y: coordinateSystem.yMin + ((viewport.bottom - pixel.y) /
                (viewport.bottom - viewport.top)) * (coordinateSystem.yMax - coordinateSystem.yMin)
        };
    },

    snapCoordinatePoint: function (point, coordinateSystem) {
        if (!point || !coordinateSystem ||
            ![point.x, point.y, coordinateSystem.xMin, coordinateSystem.xMax,
                coordinateSystem.yMin, coordinateSystem.yMax, coordinateSystem.unitStep].every(Number.isFinite) ||
            coordinateSystem.xMin >= coordinateSystem.xMax ||
            coordinateSystem.yMin >= coordinateSystem.yMax ||
            coordinateSystem.unitStep <= 0 ||
            point.x < coordinateSystem.xMin || point.x > coordinateSystem.xMax ||
            point.y < coordinateSystem.yMin || point.y > coordinateSystem.yMax) {
            return null;
        }

        const snap = function (value, min, max, step) {
            const candidate = min + Math.round((value - min) / step) * step;
            if (candidate < min - 1e-9 || candidate > max + 1e-9) return null;
            return Math.min(max, Math.max(min, Number(candidate.toFixed(10))));
        };

        const x = snap(point.x, coordinateSystem.xMin, coordinateSystem.xMax, coordinateSystem.unitStep);
        const y = snap(point.y, coordinateSystem.yMin, coordinateSystem.yMax, coordinateSystem.unitStep);
        return x === null || y === null ? null : { x: x, y: y };
    },

    buildDifficultyConfig: function (grade, difficulty, generator) {
        const profiles = {
            1: { easy: [4, 6], medium: [6, 9], hard: [9, 12], shapes: { easy: [2, 3], medium: [3, 4], hard: [4, 5] } },
            2: { easy: [6, 9], medium: [9, 12], hard: [12, 16], shapes: { easy: [3, 4], medium: [4, 5], hard: [5, 6] } },
            3: { easy: [9, 12], medium: [12, 16], hard: [16, 20], shapes: { easy: [3, 5], medium: [5, 6], hard: [6, 7] } },
            4: { easy: [12, 16], medium: [16, 20], hard: [20, 25], shapes: { easy: [4, 6], medium: [6, 7], hard: [7, 8] } },
            5: { easy: [16, 20], medium: [20, 25], hard: [25, 30], shapes: { easy: [5, 7], medium: [7, 9], hard: [8, 10] } },
            6: { easy: [9, 12], medium: [16, 20], hard: [25, 30], shapes: { easy: [4, 5], medium: [6, 8], hard: [8, 10] } }
        };

        const profile = profiles[Math.min(6, Math.max(1, grade))] || profiles[6];
        const level = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium";
        const override = generator || {};

        return {
            level: level,
            cells: Array.isArray(override.cells) && override.cells.length === 2
                ? [Number(override.cells[0]), Number(override.cells[1])]
                : profile[level],
            shapes: Array.isArray(override.shapes) && override.shapes.length === 2
                ? [Number(override.shapes[0]), Number(override.shapes[1])]
                : profile.shapes[level]
        };
    },

    chooseGrid: function (cellCount, axis) {
        const candidates = [];

        for (let rows = 2; rows <= 6; rows++) {
            for (let cols = 2; cols <= 7; cols++) {
                const total = rows * cols;
                if (total === cellCount || Math.abs(total - cellCount) <= 1) {
                    candidates.push({ rows: rows, cols: cols });
                }
            }
        }

        if (!candidates.length) {
            const side = Math.max(2, Math.round(Math.sqrt(cellCount)));
            return { rows: side, cols: Math.max(2, Math.ceil(cellCount / side)) };
        }

        const preferred = candidates.filter(function (grid) {
            return axis === "vertical" ? grid.cols >= grid.rows : grid.rows >= grid.cols;
        });

        const pool = preferred.length ? preferred : candidates;
        return pool[Math.floor(Math.random() * pool.length)];
    },

    generateSymmetry: function (data) {
        const grade = this.gradeNumber(data.grade);
        const generator = data.generator || {};
        const difficulty = generator.difficulty || data.difficulty || "medium";
        const config = this.buildDifficultyConfig(grade, difficulty, generator);

        const axis = generator.axis === "random" || !generator.axis
            ? (Math.random() < 0.5 ? "vertical" : "horizontal")
            : generator.axis;

        const requestedCells = this.randomInt(Number(config.cells[0]), Number(config.cells[1]));
        let grid = this.chooseGrid(requestedCells, axis);

        if (axis === "vertical" && grid.cols < 4) {
            grid = { rows: grid.rows, cols: 4 };
        }

        if (axis === "horizontal" && grid.rows < 4) {
            grid = { rows: 4, cols: grid.cols };
        }

        const maxShapesBySide = axis === "vertical"
            ? Math.floor(grid.rows * Math.floor(grid.cols / 2) * 0.7)
            : Math.floor(Math.floor(grid.rows / 2) * grid.cols * 0.7);

        const shapeCount = Math.min(
            this.randomInt(Number(config.shapes[0]), Number(config.shapes[1])),
            Math.max(2, maxShapesBySide)
        );

        const labels = this.shuffle(["●", "■", "▲", "◆", "★", "⬟", "✦", "⬢"]);
        const candidates = [];

        for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
                if (axis === "vertical") {
                    if (col >= Math.floor(grid.cols / 2)) continue;
                } else {
                    if (row >= Math.floor(grid.rows / 2)) continue;
                }
                candidates.push({ row: row, col: col });
            }
        }

        const sourceCells = this.shuffle(candidates).slice(0, shapeCount);

        const pieces = sourceCells.map(function (cell, index) {
            let targetRow = cell.row;
            let targetCol = cell.col;

            if (axis === "vertical") {
                targetCol = grid.cols - 1 - cell.col;
            } else {
                targetRow = grid.rows - 1 - cell.row;
            }

            return {
                id: "symmetryPiece" + (index + 1),
                label: labels[index % labels.length],
                source: { row: cell.row, col: cell.col },
                target: { row: targetRow, col: targetCol }
            };
        });

        return {
            type: "spatial",
            mode: "symmetry",
            source: "generated",
            instruction: "شکل‌ها را در جای قرینه قرار بده.",
            grid: grid,
            axis: axis,
            pieces: this.shuffle(pieces)
        };
    },

    start: function (engine, data) {
        data = data || {};
        const mode = data.mode ? String(data.mode) : "legacy";
        const grid = data.grid;

        if (mode === "symmetry" && data.generator) {
            return this.start(engine, this.generateSymmetry(data));
        }

        if (mode === "coordinatePlane") {
            const validation = this.validateCoordinatePlaneData(data);
            if (!validation.valid) {
                console.error("Spatial Puzzle: Invalid Coordinate Plane Data", validation.reason);
                return null;
            }

            const task = { ...data.task };
            let answer = null;
            if (task.kind === "readPoint" || task.kind === "placePoint") {
                answer = { x: Number(task.target.x), y: Number(task.target.y) };
            } else if (task.kind === "identifyPoint") {
                answer = task.answerId === undefined || task.answerId === null
                    ? null
                    : String(task.answerId);
                task.points = task.points.map(function (point) {
                    return { ...point, id: String(point.id), x: Number(point.x), y: Number(point.y) };
                });
            }

            if (answer === null) {
                console.error("Spatial Puzzle: Coordinate Plane Answer Missing");
                return null;
            }

            engine.puzzle = {
                type: "spatial",
                mode: "coordinatePlane",
                source: data.source || "file",
                instruction: data.instruction || (
                    task.kind === "readPoint" ? "مختصات نقطه را مشخص کن." :
                    task.kind === "placePoint" ? "نقطه خواسته‌شده را روی صفحه قرار بده." :
                    "مختصات نقطه مشخص‌شده را انتخاب کن."
                ),
                coordinateSystem: { ...data.coordinateSystem },
                task: task,
                answer: answer,
                hasUserMove: false
            };
            engine.items = [];
            engine.userAnswer = null;
            engine.emitStarted();
            return engine.getState();
        }

        const pieces = Array.isArray(data.pieces)
            ? [...data.pieces]
            : (Array.isArray(data.items) ? [...data.items] : []);

        const options = Array.isArray(data.options) ? [...data.options] : [];

        if (!grid || !Number.isInteger(Number(grid.rows)) || !Number.isInteger(Number(grid.cols))) {
            console.error("Spatial Puzzle: Invalid Grid");
            return null;
        }

        if (mode === "place" || mode === "symmetry") {
            if (!pieces.length) {
                console.error("Spatial Puzzle: Pieces Missing");
                return null;
            }

            const normalizedPieces = pieces.map(function (piece) {
                if (!piece || piece.id === undefined) return null;

                const normalized = { ...piece };

                if (mode === "symmetry") {
                    if (!piece.source) return null;

                    const sourceRow = Number(piece.source.row);
                    const sourceCol = Number(piece.source.col);
                    const axis = data.axis || "vertical";

                    if (!Number.isInteger(sourceRow) || !Number.isInteger(sourceCol)) return null;

                    let targetRow = sourceRow;
                    let targetCol = sourceCol;

                    if (axis === "vertical") {
                        targetCol = Number(grid.cols) - 1 - sourceCol;
                    } else if (axis === "horizontal") {
                        targetRow = Number(grid.rows) - 1 - sourceRow;
                    } else {
                        return null;
                    }

                    normalized.source = { row: sourceRow, col: sourceCol };
                    normalized.target = { row: targetRow, col: targetCol };
                }

                return normalized;
            }).filter(Boolean);

            const seenTargets = new Set();
            const seenIds = new Set();

            for (const piece of normalizedPieces) {
                const pieceId = String(piece.id);

                if (seenIds.has(pieceId)) {
                    console.error("Spatial Puzzle: Duplicate Piece ID");
                    return null;
                }
                seenIds.add(pieceId);

                const row = Number(piece.target && piece.target.row);
                const col = Number(piece.target && piece.target.col);

                if (!Number.isInteger(row) || !Number.isInteger(col) ||
                    row < 0 || row >= Number(grid.rows) ||
                    col < 0 || col >= Number(grid.cols)) {
                    return null;
                }

                const key = row + ":" + col;

                if (seenTargets.has(key)) {
                    console.error("Spatial Puzzle: Duplicate Target");
                    return null;
                }

                seenTargets.add(key);
            }

            engine.puzzle = {
                type: "spatial",
                mode: mode,
                source: data.source || "file",
                instruction: data.instruction || "شکل‌ها را در جای قرینه قرار بده.",
                grid: {
                    rows: Math.max(1, Number(grid.rows)),
                    cols: Math.max(1, Number(grid.cols))
                },
                axis: mode === "symmetry" ? (data.axis || "vertical") : null,
                items: normalizedPieces,
                pieces: normalizedPieces,
                placements: {},
                hasUserMove: false,
                options: [],
                answer: null,
                question: ""
            };

            engine.items = [...normalizedPieces];
            engine.userAnswer = {};
            engine.emitStarted();
            return engine.getState();
        }

        if (!pieces.length || !options.length || data.answer === undefined || data.answer === null) {
            console.error("Spatial Puzzle: Content Missing");
            return null;
        }

        engine.puzzle = {
            type: "spatial",
            mode: "legacy",
            source: data.source || "file",
            instruction: data.instruction || "جای اشیا را بررسی کن و پاسخ درست را انتخاب کن.",
            grid: {
                rows: Math.max(1, Number(grid.rows)),
                cols: Math.max(1, Number(grid.cols))
            },
            items: pieces,
            options: options,
            answer: data.answer,
            question: data.question || ""
        };

        engine.items = [...pieces];
        engine.userAnswer = null;
        engine.emitStarted();
        return engine.getState();
    },

    setAnswer: function (engine, value) {
        if (!engine.puzzle || engine.puzzle.type !== "spatial") return false;

        if (engine.puzzle.mode === "coordinatePlane") {
            if (!value || typeof value !== "object") return false;
            const system = engine.puzzle.coordinateSystem;
            if (engine.puzzle.task.kind === "identifyPoint") {
                const id = String(value.id === undefined ? "" : value.id);
                const point = (engine.puzzle.task.points || []).find(function (item) {
                    return item.id === id;
                });
                if (!point) return false;
                engine.userAnswer = id;
            } else {
                const snapped = this.snapCoordinatePoint(
                    { x: Number(value.x), y: Number(value.y) },
                    system
                );
                if (!snapped) return false;
                engine.userAnswer = snapped;
            }
            engine.puzzle.hasUserMove = true;
            engine.moves++;
            return engine.emitChanged();
        }

        if (engine.puzzle.mode === "place" || engine.puzzle.mode === "symmetry") {
            if (!value || value.pieceId === undefined) return false;

            const pieceId = String(value.pieceId);
            const piece = engine.puzzle.pieces.find(function (item) {
                return item && String(item.id) === pieceId;
            });

            if (!piece) return false;

            const row = Number(value.row);
            const col = Number(value.col);

            if (!Number.isInteger(row) || !Number.isInteger(col) ||
                row < 0 || row >= engine.puzzle.grid.rows ||
                col < 0 || col >= engine.puzzle.grid.cols) {
                return false;
            }

            const targetOwner = engine.puzzle.pieces.find(function (item) {
                return String(item.id) !== pieceId &&
                    engine.puzzle.placements[String(item.id)] &&
                    Number(engine.puzzle.placements[String(item.id)].row) === row &&
                    Number(engine.puzzle.placements[String(item.id)].col) === col;
            });

            const previous = engine.puzzle.placements[pieceId] || null;

            if (targetOwner) {
                engine.puzzle.placements[pieceId] = { row: row, col: col };

                if (previous) {
                    engine.puzzle.placements[String(targetOwner.id)] = previous;
                } else {
                    delete engine.puzzle.placements[String(targetOwner.id)];
                }
            } else {
                engine.puzzle.placements[pieceId] = { row: row, col: col };
            }

            engine.userAnswer = { ...engine.puzzle.placements };
            engine.puzzle.hasUserMove = true;
            engine.moves++;
            return engine.emitChanged();
            return true;
        }

        engine.userAnswer = value;
        engine.moves++;
        return engine.emitChanged();
        return true;
    },

    check: function (engine) {
        if (!engine.puzzle || engine.puzzle.type !== "spatial") return false;

        if (engine.puzzle.mode === "coordinatePlane") {
            if (engine.puzzle.hasUserMove !== true || !engine.userAnswer) {
                console.log("Spatial Puzzle: Coordinate Plane check blocked before user input.");
                return false;
            }

            let correct = false;
            if (engine.puzzle.task && engine.puzzle.task.kind === "identifyPoint") {
                correct = String(engine.userAnswer) === String(engine.puzzle.answer);
            } else {
                const userPoint = engine.userAnswer;
                const targetPoint = engine.puzzle.answer;
                correct = !!userPoint && !!targetPoint &&
                    Number(userPoint.x) === Number(targetPoint.x) &&
                    Number(userPoint.y) === Number(targetPoint.y);
            }

            if (correct) {
                engine.finish();
                return true;
            }
            engine.emitWrong();
            return false;
        }

        if (engine.puzzle.mode === "place" || engine.puzzle.mode === "symmetry") {
            if (engine.puzzle.hasUserMove !== true) {
                console.log("Spatial Puzzle: Check blocked before first user move.");
                return false;
            }

            const pieces = engine.puzzle.pieces || [];
            const placements = engine.puzzle.placements || {};

            if (Object.keys(placements).length !== pieces.length) {
                engine.emitWrong();
                return false;
            }

            const correct = pieces.every(function (piece) {
                const placement = placements[String(piece.id)];

                return placement &&
                    Number(placement.row) === Number(piece.target.row) &&
                    Number(placement.col) === Number(piece.target.col);
            });

            if (!correct) {
                engine.emitWrong();
                return false;
            }

            engine.finish();
            return true;
        }

        if (engine.valuesEqual(engine.userAnswer, engine.puzzle.answer)) {
            engine.finish();
            return true;
        }

        engine.emitWrong();
        return false;
    }
};

window.SpatialPuzzle = SpatialPuzzle;
PuzzleTypeRegistry.register("spatial", SpatialPuzzle);

console.log("Spatial Puzzle v2.0 Ready");
