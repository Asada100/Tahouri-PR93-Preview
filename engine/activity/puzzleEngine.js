// =====================================
// Tahouri Edu Platform
// Puzzle Engine
// Version 3.4
// Multi-question lifecycle + aggregated result
// Explicit-check completion guard
// Supports file-defined question sequences with optional random order
// =====================================

const PuzzleEngine = {
    state: { started: false, isFinished: false },
    activity: null,
    puzzle: null,
    questions: [],
    currentQuestion: 0,
    items: [],
    userAnswer: null,
    moves: 0,
    transitioning: false,
    checking: false,
    finishAcceptedThisCheck: false,
    startRequestId: 0,
    transitionRequestId: 0,

    start: async function (activityData) {
        const requestId = ++this.startRequestId;
        this.transitionRequestId++;
        if (typeof ScoreManager !== "undefined" && typeof ScoreManager.reset === "function") ScoreManager.reset();
        if (!activityData) { console.error("Puzzle Engine: Activity Data Missing"); this.reset(); return null; }
        this.activity = activityData;
        this.state.started = true;
        this.state.isFinished = false;
        this.transitioning = false;
        this.checking = false;
        this.finishAcceptedThisCheck = false;
        this.puzzle = null;
        this.questions = [];
        this.currentQuestion = 0;
        this.items = [];
        this.userAnswer = null;
        this.moves = 0;
        if (typeof QuestionProvider === "undefined") { console.error("Puzzle Engine: QuestionProvider Not Available"); this.reset(); return null; }
        if (typeof PuzzleTypeRegistry === "undefined") { console.error("Puzzle Engine: PuzzleTypeRegistry Not Available"); this.reset(); return null; }

        const fileQuestions = this.getFileDefinedQuestions(activityData);
        let puzzleQuestions;

        if (fileQuestions) {
            puzzleQuestions = fileQuestions;
            console.log("Puzzle Engine: File-defined questions:", puzzleQuestions.length);
        } else {
            const providerActivity = this.prepareProviderActivity(activityData);
            try { puzzleQuestions = await QuestionProvider.getPuzzleQuestions(providerActivity); }
            catch (error) { if (requestId !== this.startRequestId) return null; console.error("Puzzle Engine: QuestionProvider Error:", error); this.reset(); return null; }
        }

        if (requestId !== this.startRequestId) return null;
        if (!Array.isArray(puzzleQuestions) || puzzleQuestions.length === 0) { console.error("Puzzle Engine: No Puzzle Content Available"); this.reset(); return null; }
        this.questions = puzzleQuestions.filter(Boolean);
        if (this.questions.length === 0) { console.error("Puzzle Engine: No Valid Puzzle Questions"); this.reset(); return null; }
        console.log("Puzzle Questions Ready:", this.questions.length);
        const firstQuestion = this.startCurrentQuestion(false);
        if (!firstQuestion) {
            // A handler listener may have started a replacement activity; never reset it.
            if (requestId !== this.startRequestId || this.activity !== activityData) return null;
            this.reset();
            return null;
        }
        EventManager.emit("activityStarted", activityData);
        // A synchronous event listener may start or reset another run.
        if (requestId !== this.startRequestId || this.activity !== activityData || !this.state.started) return null;
        EventManager.emit("activityPlaying");
        if (requestId !== this.startRequestId || this.activity !== activityData || !this.state.started) return null;
        return firstQuestion;
    },

    getFileDefinedQuestions: function (activityData) {
        const puzzle = activityData && activityData.puzzle;
        if (!puzzle || !Array.isArray(puzzle.questions) || puzzle.questions.length === 0) return null;

        const questions = puzzle.questions.map(function (question) {
            if (!question || typeof question !== "object") return null;
            if (question.type) return { ...question };
            const difficulty = puzzle && Number.isInteger(Number(puzzle.difficulty)) ? Number(puzzle.difficulty) : null;
            return {
                type: puzzle.type || "jigsaw",
                source: "file",
                title: question.title || puzzle.title || activityData.title || "پازل",
                instruction: question.instruction || puzzle.instruction || "کلمات را به ترتیب درست بچین.",
                objective: question.objective || puzzle.objective || "واژه‌ها را به ترتیب درست بچین",
                difficulty: difficulty,
                content: {
                    ...question,
                    difficulty: difficulty,
                    twoStageWordOrder: question.twoStageWordOrder !== false
                },
                twoStageWordOrder: question.twoStageWordOrder !== false
            };
        }).filter(Boolean);

        // Coordinate-plane targets are generated afresh for each playthrough.
        // Choose unique grid points so no target repeats within one round sequence.
        if (puzzle.mode === "coordinatePlane" && questions.length > 0 &&
            questions.every(function (question) {
                return question && question.mode === "coordinatePlane" &&
                    question.task && question.task.kind === "placePoint";
            })) {
            const system = puzzle.coordinateSystem || questions[0].coordinateSystem || {};
            const minX = Number(system.xMin), maxX = Number(system.xMax);
            const minY = Number(system.yMin), maxY = Number(system.yMax);
            const step = Number(system.unitStep);
            if ([minX, maxX, minY, maxY, step].every(Number.isFinite) &&
                step > 0 && maxX >= minX && maxY >= minY) {
                const candidates = [];
                const countX = Math.floor((maxX - minX) / step + 1e-9);
                const countY = Math.floor((maxY - minY) / step + 1e-9);
                for (let xi = 0; xi <= countX; xi++) {
                    for (let yi = 0; yi <= countY; yi++) {
                        candidates.push({
                            x: Number((minX + xi * step).toFixed(10)),
                            y: Number((minY + yi * step).toFixed(10))
                        });
                    }
                }
                for (let i = candidates.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
                }
                if (candidates.length >= questions.length) {
                    questions.forEach(function (question, index) {
                        question.task = {
                            ...question.task,
                            target: candidates[index]
                        };
                        question.instruction = "نقطه را به مختصات خواسته‌شده منتقل کن.";
                    });
                    console.log("Puzzle Engine: Unique randomized coordinate targets:", questions.length);
                } else {
                    console.warn("Puzzle Engine: Not enough unique coordinate targets for all questions.");
                }
            }
        }

        if (puzzle.randomQuestionOrder === true) {
            for (let i = questions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [questions[i], questions[j]] = [questions[j], questions[i]];
            }
        }

        return questions;
    },

    prepareProviderActivity: function (activityData) {
        const puzzle = activityData.puzzle || {};
        const settings = activityData.settings || {};

        // Jigsaw is a file-backed image puzzle. It must never fall through
        // to the generated-puzzle path, even when an older cached activity
        // configuration does not contain an explicit source field.
        if (puzzle.type === "jigsaw") {
            return {
                ...activityData,
                settings: { ...settings, questionSource: "file" },
                puzzle: { ...puzzle, source: "file" }
            };
        }

        const hasExplicitSource = puzzle.source !== undefined || settings.questionSource !== undefined;
        if (hasExplicitSource) return activityData;
        const hasFixedData = Array.isArray(puzzle.items) || Array.isArray(puzzle.correctOrder) || Array.isArray(puzzle.options) || Array.isArray(puzzle.words) || Array.isArray(puzzle.cells) || Array.isArray(puzzle.inputs) || Array.isArray(puzzle.outputs);
        if (hasFixedData) return { ...activityData, settings: { ...settings, questionSource: "file" }, puzzle: { ...puzzle, source: "file" } };
        return { ...activityData, settings: { ...settings, questionSource: "generated" }, puzzle: { ...puzzle, source: "generated" } };
    },

    startCurrentQuestion: function (publishReady) {
        const requestId = this.startRequestId;
        const activity = this.activity;
        if (this.currentQuestion >= this.questions.length) { this.completeActivity(); return null; }
        this.puzzle = null;
        this.items = [];
        this.userAnswer = null;
        const puzzle = this.questions[this.currentQuestion];
        if (!puzzle) { console.error("Puzzle Engine: Invalid Puzzle Content", this.currentQuestion); return null; }
        const handler = PuzzleTypeRegistry.get(puzzle.type);
        if (!handler || typeof handler.start !== "function") { console.error("Puzzle Engine: Unsupported Puzzle Type:", puzzle.type); return null; }
        console.log("Puzzle Question:", this.currentQuestion + 1, "/", this.questions.length, puzzle.type);
        let result;
        try {
            result = handler.start(this, puzzle);
        } catch (error) {
            console.error("Puzzle Engine: Puzzle Handler Error:", error);
            return null;
        }
        if (!result) { console.error("Puzzle Engine: Puzzle Handler Failed:", puzzle.type); return null; }
        // Puzzle handlers may synchronously emit events whose listeners restart the engine.
        // Do not publish readiness for the superseded run after that happens.
        if (requestId !== this.startRequestId || this.activity !== activity ||
            !this.state.started || !this.puzzle) return null;
        if (publishReady) this.emitCurrentQuestionReady();
        return result;
    },

    emitCurrentQuestionReady: function () {
        EventManager.emit("activityReady", { activity: this.activity, engine: this, engineName: "PuzzleEngine", questionIndex: this.currentQuestion, result: this.getState() });
    },

    getState: function () {
        const state = {
            type: this.puzzle ? this.puzzle.type : null,
            dataType: this.puzzle ? (this.puzzle.dataType || null) : null,
            source: this.puzzle ? (this.puzzle.source || null) : null,
            instruction: this.puzzle ? (this.puzzle.instruction || "") : "",
            items: Array.isArray(this.items) ? [...this.items] : [],
            userAnswer: this.userAnswer,
            moves: this.moves,
            currentQuestion: this.currentQuestion,
            totalQuestions: this.questions.length,
            questionNumber: this.currentQuestion + 1,
            finished: this.state.isFinished
        };
        if (!this.puzzle) return state;
        if (this.puzzle.type === "ordering") state.correctOrder = Array.isArray(this.puzzle.correctOrder) ? [...this.puzzle.correctOrder] : [];
        if (this.puzzle.type === "sequence") { state.missingIndex = this.puzzle.missingIndex; state.answer = this.puzzle.answer; state.pattern = this.puzzle.pattern; state.step = this.puzzle.step; state.multiplier = this.puzzle.multiplier; }
        if (this.puzzle.type === "visualMath") { state.operation = this.puzzle.operation; state.comparison = this.puzzle.comparison; state.answer = this.puzzle.answer; }
        if (this.puzzle.type === "inputOutput") { state.inputs = Array.isArray(this.puzzle.inputs) ? [...this.puzzle.inputs] : []; state.outputs = Array.isArray(this.items) ? [...this.items] : []; state.missingIndex = this.puzzle.missingIndex; state.rule = this.puzzle.rule; state.answer = this.puzzle.answer; }
        if (this.puzzle.type === "sentence") { state.mode = this.puzzle.mode; state.words = Array.isArray(this.puzzle.words) ? [...this.puzzle.words] : []; state.correctWords = Array.isArray(this.puzzle.correctOrder) ? [...this.puzzle.correctOrder] : []; state.grammar = this.puzzle.grammar; state.targets = Array.isArray(this.puzzle.targets) ? [...this.puzzle.targets] : []; state.answers = Array.isArray(this.puzzle.answers) ? [...this.puzzle.answers] : []; }
        if (["grid", "wordGrid", "crossGrid"].includes(this.puzzle.type)) { state.rows = this.puzzle.rows; state.cols = this.puzzle.cols; state.cells = Array.isArray(this.puzzle.cells) ? [...this.puzzle.cells] : []; state.missingIndices = Array.isArray(this.puzzle.missingIndices) ? [...this.puzzle.missingIndices] : []; state.answers = Array.isArray(this.puzzle.answers) ? [...this.puzzle.answers] : []; }
        if (this.puzzle.type === "grid") { state.rules = Array.isArray(this.puzzle.rules) ? [...this.puzzle.rules] : []; state.answer = this.puzzle.answer; }
        if (this.puzzle.type === "wordGrid") { state.relation = this.puzzle.relation; state.relationType = this.puzzle.relationType; state.answer = this.puzzle.answer; }
        if (this.puzzle.type === "crossGrid") { state.horizontalPaths = Array.isArray(this.puzzle.horizontalPaths) ? [...this.puzzle.horizontalPaths] : []; state.verticalPaths = Array.isArray(this.puzzle.verticalPaths) ? [...this.puzzle.verticalPaths] : []; state.paths = Array.isArray(this.puzzle.paths) ? [...this.puzzle.paths] : []; state.rules = Array.isArray(this.puzzle.rules) ? [...this.puzzle.rules] : []; state.answer = this.puzzle.answer; }
        if (this.puzzle.type === "pattern") { state.mode = this.puzzle.mode || "numeric"; state.missingIndex = this.puzzle.missingIndex; state.answer = this.puzzle.answer; state.options = Array.isArray(this.puzzle.options) ? [...this.puzzle.options] : []; }
        if (this.puzzle.type === "spatial") { state.mode = this.puzzle.mode || "legacy"; state.grid = this.puzzle.grid ? { ...this.puzzle.grid } : null; state.axis = this.puzzle.axis || null; state.items = Array.isArray(this.puzzle.items) ? [...this.puzzle.items] : []; state.pieces = Array.isArray(this.puzzle.pieces) ? [...this.puzzle.pieces] : []; state.placements = this.puzzle.placements ? { ...this.puzzle.placements } : {}; state.options = Array.isArray(this.puzzle.options) ? [...this.puzzle.options] : []; state.answer = this.puzzle.answer; state.question = this.puzzle.question || ""; state.coordinateSystem = this.puzzle.coordinateSystem ? { ...this.puzzle.coordinateSystem } : null; state.task = this.puzzle.task ? JSON.parse(JSON.stringify(this.puzzle.task)) : null; }
        if (this.puzzle.type === "jigsaw") { state.objective = this.puzzle.objective || ""; state.title = this.puzzle.title || ""; state.difficulty = this.puzzle.difficulty; state.image = this.puzzle.image; state.rows = this.puzzle.rows; state.cols = this.puzzle.cols; state.pieceCount = this.puzzle.pieceCount; }
        return state;
    },

    setOrder: function (newOrder) { if (!this.puzzle || !this.state.started || this.state.isFinished || this.transitioning || this.checking || !Array.isArray(newOrder)) return false; this.items = [...newOrder]; this.moves++; return this.emitChanged(); },
    setSequenceAnswer: function (value) { if (!this.puzzle || !this.state.started || this.state.isFinished || this.transitioning || this.checking || this.puzzle.type !== "sequence") return false; this.items[this.puzzle.missingIndex] = value; this.moves++; return this.emitChanged(); },
    setVisualMathAnswer: function (value) { if (!this.puzzle || !this.state.started || this.state.isFinished || this.transitioning || this.checking || this.puzzle.type !== "visualMath") return false; if (this.puzzle.operation === "comparison") { if (!["left", "right", "equal"].includes(value)) return false; this.userAnswer = value; } else { const numericValue = Number(value); if (!Number.isFinite(numericValue)) return false; this.userAnswer = numericValue; } this.moves++; return this.emitChanged(); },
    setGenericAnswer: function (value) { if (!this.puzzle || !this.state.started || this.state.isFinished || this.transitioning || this.checking) return false; this.userAnswer = Array.isArray(value) ? [...value] : value; if (this.puzzle.type === "inputOutput" && Number.isInteger(this.puzzle.missingIndex)) this.items[this.puzzle.missingIndex] = value; this.moves++; return this.emitChanged(); },
    setTypeAnswer: function (value) { if (!this.puzzle || !this.state.started || this.state.isFinished || this.transitioning || this.checking) return false; const handler = PuzzleTypeRegistry.get(this.puzzle.type); if (!handler) return false; if (typeof handler.setAnswer === "function") return handler.setAnswer(this, value); this.userAnswer = Array.isArray(value) ? [...value] : value; this.moves++; return this.emitChanged(); },
    setCell: function (index, value) { if (!this.puzzle || !this.state.started || this.state.isFinished || this.transitioning || this.checking) return false; const handler = PuzzleTypeRegistry.get(this.puzzle.type); if (!handler || typeof handler.setCell !== "function") return false; return handler.setCell(this, index, value); },
    setCells: function (values) { if (!this.puzzle || !this.state.started || this.state.isFinished || this.transitioning || this.checking) return false; const handler = PuzzleTypeRegistry.get(this.puzzle.type); if (!handler || typeof handler.setCells !== "function") return false; return handler.setCells(this, values); },

    check: function () {
        if (!this.puzzle || !this.state.started || this.state.isFinished || this.checking || this.transitioning) return false;
        const handler = PuzzleTypeRegistry.get(this.puzzle.type);
        if (!handler || typeof handler.check !== "function") return false;
        this.checking = true;
        this.finishAcceptedThisCheck = false;
        try {
            return !!handler.check(this);
        } finally {
            this.checking = false;
        }
    },

    emitChanged: function () {
        if (!this.puzzle || !this.state.started || this.state.isFinished || this.transitioning) return false;
        const requestId = this.startRequestId;
        const activity = this.activity;
        const puzzle = this.puzzle;
        EventManager.emit("puzzleChanged", this.getState());
        // If a change listener replaced the activity, do not report the old edit as current.
        return requestId === this.startRequestId && this.activity === activity &&
            this.puzzle === puzzle && this.state.started && !this.state.isFinished;
    },

    emitWrong: function () {
        if (!this.puzzle || !this.state.started || this.state.isFinished || this.transitioning) return false;
        const requestId = this.startRequestId;
        const activity = this.activity;
        const puzzle = this.puzzle;
        if (typeof ScoreManager !== "undefined" && typeof ScoreManager.addWrong === "function") ScoreManager.addWrong();
        EventManager.emit("puzzleWrong", this.getState());
        // A listener may synchronously restart; the old check must not continue as current.
        return requestId === this.startRequestId && this.activity === activity &&
            this.puzzle === puzzle && this.state.started && !this.state.isFinished;
    },
    emitStarted: function () {
        const requestId = this.startRequestId;
        const activity = this.activity;
        const puzzle = this.puzzle;
        EventManager.emit("puzzleStarted", puzzle);
        // Do not let the old run publish activityPlaying if a listener restarted it.
        if (requestId !== this.startRequestId || this.activity !== activity ||
            this.puzzle !== puzzle || !this.state.started || this.state.isFinished) return false;
        EventManager.emit("activityPlaying");
        return true;
    },

    finish: function () {
        if (!this.checking) {
            console.warn("Puzzle Engine: Ignored completion outside an explicit check() call.");
            return false;
        }
        if (this.state.isFinished || this.transitioning || this.finishAcceptedThisCheck) return false;
        // One successful check can award credit and advance at most one question.
        this.finishAcceptedThisCheck = true;
        if (typeof ScoreManager !== "undefined" && typeof ScoreManager.addCorrect === "function") ScoreManager.addCorrect();
        this.currentQuestion++;
        if (this.currentQuestion < this.questions.length) {
            this.transitioning = true;
            const transitionRequestId = ++this.transitionRequestId;
            const transitionQuestionIndex = this.currentQuestion;
            const runRequestId = this.startRequestId;
            const activity = this.activity;
            const nextState = this.startCurrentQuestion(true);
            // A handler or readiness listener can synchronously restart the engine.
            if (runRequestId !== this.startRequestId || this.activity !== activity || !this.state.started) return false;
            if (!nextState) {
                console.error("Puzzle Engine: Question transition failed; clearing incomplete activity.");
                this.reset();
                return false;
            }
            const engine = this;
            setTimeout(function () {
                if (engine.transitionRequestId === transitionRequestId &&
                    engine.currentQuestion === transitionQuestionIndex &&
                    engine.state.started && !engine.state.isFinished && engine.transitioning) {
                    engine.transitioning = false;
                }
            }, 0);
            return nextState;
        }
        return this.completeActivity();
    },

    completeActivity: function () {
        if (this.state.isFinished) return null;
        const requestId = this.startRequestId;
        const activity = this.activity;
        this.state.isFinished = true;
        const result = this.buildResult();
        console.log("Puzzle Finished:", result);
        EventManager.emit("puzzleFinished", result);
        // A synchronous listener may reset or start another activity.
        // Do not publish the previous run's second finish event afterward.
        if (requestId !== this.startRequestId || this.activity !== activity || !this.state.isFinished) return result;
        EventManager.emit("activityFinished", result);
        return result;
    },

    buildResult: function () {
        const total = this.questions.length || 1;
        const correct = typeof ScoreManager !== "undefined" ? Number(ScoreManager.correct || 0) : 0;
        const wrong = typeof ScoreManager !== "undefined" ? Number(ScoreManager.wrong || 0) : 0;
        const score = typeof ScoreManager !== "undefined" ? Number(ScoreManager.score || 0) : correct * 10;
        const percentage = Math.round((correct / total) * 100);
        return ActivityResult.create({ activityId: this.activity ? this.activity.id : null, score: score, percentage: percentage, totalQuestions: total, correctAnswers: correct, wrongAnswers: wrong, moves: this.moves, message: "🎉 پازل تمام شد" });
    },

    reset: function () { this.startRequestId++; this.transitionRequestId++; this.state.started = false; this.state.isFinished = false; this.activity = null; this.puzzle = null; this.questions = []; this.currentQuestion = 0; this.items = []; this.userAnswer = null; this.moves = 0; this.transitioning = false; this.checking = false; this.finishAcceptedThisCheck = false; if (typeof ScoreManager !== "undefined" && typeof ScoreManager.reset === "function") ScoreManager.reset(); },
    buildCorrectOrder: function (items, order) { const copy = Array.isArray(items) ? [...items] : []; if (order === "descending") return copy.sort((a, b) => b - a); if (this.detectDataType(copy) === "number") return copy.sort((a, b) => a - b); return copy.sort(); },
    detectDataType: function (items) { if (!Array.isArray(items) || items.length === 0) return "text"; if (items.every(item => typeof item === "string" && (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(item) || item.startsWith("data:image/")))) return "image"; if (items.every(item => typeof item === "number")) return "number"; return "text"; },
    valuesEqual: function (a, b) { if (a === null || a === undefined || b === null || b === undefined) return a === b; const numberA = Number(a); const numberB = Number(b); if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) return numberA === numberB; return String(a) === String(b); },
    areArraysEqual: function (a, b) { if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!this.valuesEqual(a[i], b[i])) return false; return true; },
    shuffle: function (array) { if (!Array.isArray(array)) return []; const list = [...array]; for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; },
    logOrdering: function () { if (!this.puzzle) return; console.log("Puzzle Data Type:", this.puzzle.dataType); console.log("Puzzle Items:", this.items); console.log("Correct Order:", this.puzzle.correctOrder); },
    logSequence: function () { if (!this.puzzle) return; console.log("Sequence Data Type:", this.puzzle.dataType); console.log("Sequence Items:", this.items); console.log("Sequence Pattern:", this.puzzle.pattern); console.log("Sequence Missing Index:", this.puzzle.missingIndex); if (this.puzzle.step !== null) console.log("Sequence Step:", this.puzzle.step); if (this.puzzle.multiplier !== null) console.log("Sequence Multiplier:", this.puzzle.multiplier); }
};

window.PuzzleEngine = PuzzleEngine;
console.log("Puzzle Engine v3.4 Ready");
