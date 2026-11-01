// =====================================
// Tahouri Edu Platform
// Jigsaw Puzzle Handler
// Version 2.7
// Supports image and word/sentence jigsaw
// Group-aware word jigsaw supports independent drop rows/zones.
// =====================================

const JigsawPuzzleHandler = {
    shuffleWordList: function (words) {
        const shuffled = Array.isArray(words) ? words.slice() : [];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        if (shuffled.length > 1 && shuffled.every(function (word, index) { return word === words[index]; })) {
            [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
        }
        return shuffled;
    },

    start: function (engine, data) {
        if (typeof JigsawPuzzle === "undefined") return null;

        const content = { ...data, ...(data.content || {}) };
        const definition = { ...data, type: "jigsaw", content: content };
        const result = JigsawPuzzle.start(definition);
        if (!result) return null;

        const isWords = result.mode === "words";
        const hasTwoStage = content.twoStageWordOrder === true || data.twoStageWordOrder === true;
        const correctOrder = Array.isArray(content.correctOrder)
            ? content.correctOrder.map(String)
            : Array.isArray(data.correctOrder)
                ? data.correctOrder.map(String)
                : [];

        const words = (Array.isArray(result.words) ? result.words : []).map(String);
        const firstLineLength = Number(content.firstLineLength || data.firstLineLength || 0);
        const configuredGroups = Array.isArray(content.groupLengths)
            ? content.groupLengths
            : Array.isArray(data.groupLengths)
                ? data.groupLengths
                : null;
        const groupLengths = configuredGroups
            ? configuredGroups.map(Number).filter(function (value) { return Number.isInteger(value) && value > 0; })
            : (Number.isInteger(firstLineLength) && firstLineLength > 0 && firstLineLength < words.length
                ? [firstLineLength, words.length - firstLineLength]
                : []);
        const punctuation = content.punctuation || data.punctuation || {};

        engine.puzzle = {
            type: "jigsaw",
            dataType: isWords ? "text" : "image",
            mode: result.mode,
            source: data.source || "file",
            instruction: data.instruction || (isWords ? "هر واژه را از بخش کلمات به پاسخ خود منتقل کن." : "قطعه‌ها را جابه‌جا کن تا تصویر کامل شود."),
            objective: data.objective || (isWords ? "واژه‌ها را به ترتیب درست بچین" : "تصویر را کامل کن"),
            title: data.title || (isWords ? "جورچین واژه‌ها" : "پازل تصویری"),
            difficulty: result.difficulty,
            image: result.image,
            rows: result.rows,
            cols: result.cols,
            words: words,
            pieceCount: result.pieceCount,
            twoStageWordOrder: hasTwoStage,
            stage: hasTwoStage ? 2 : undefined,
            availableWords: hasTwoStage ? this.shuffleWordList(words) : undefined,
            targetWords: hasTwoStage ? [] : undefined,
            targetGroups: hasTwoStage && groupLengths.length ? groupLengths.map(function () { return []; }) : undefined,
            history: hasTwoStage ? [] : undefined,
            hintUsed: false,
            firstLineLength: Number.isInteger(firstLineLength) && firstLineLength > 0 ? firstLineLength : null,
            groupLengths: groupLengths,
            punctuation: punctuation && typeof punctuation === "object" ? { ...punctuation } : {},
            correctOrder: correctOrder.length ? correctOrder : words.slice()
        };

        engine.items = hasTwoStage ? [] : result.pieces.slice().sort(function (a, b) { return a.currentIndex - b.currentIndex; }).map(function (piece) { return piece.id; });
        engine.moves = 0;
        engine.emitStarted();
        console.log("Jigsaw Puzzle Handler Started", {
            mode: result.mode,
            twoStageWordOrder: hasTwoStage,
            stage: engine.puzzle.stage || 1,
            groupLengths: engine.puzzle.groupLengths
        });
        return engine.getState();
    },

    move: function (engine, fromIndex, toIndex) {
        if (!engine || !engine.puzzle || engine.puzzle.type !== "jigsaw" || (engine.state && engine.state.isFinished)) return false;

        const isImage = engine.puzzle.dataType === "image" || engine.puzzle.mode === "image";

        // Image Jigsaw owns its movement in JigsawImagePuzzle. Keep the image
        // path explicit here so the Word Jigsaw Stage-2 wrapper cannot
        // interfere with image-piece movement.
        if (isImage && typeof JigsawImagePuzzle !== "undefined") {
            if (!JigsawImagePuzzle.state && typeof JigsawImagePuzzle.restoreFromEngine === "function") {
                JigsawImagePuzzle.restoreFromEngine();
            }
            if (typeof JigsawPuzzle !== "undefined") {
                JigsawPuzzle.state = JigsawImagePuzzle.state;
            }
        }

        let moved = isImage && typeof JigsawImagePuzzle !== "undefined"
            ? JigsawImagePuzzle.move(fromIndex, toIndex)
            : JigsawPuzzle.move(fromIndex, toIndex);

        // The persisted image-jigsaw session can contain a valid piece order
        // while the core state is reconstructed from that order. If the core
        // rejects the move, use the engine's position array as the authoritative
        // image arrangement and synchronize the core from it.
        if (!moved && isImage && Array.isArray(engine.items)) {
            const from = Number(fromIndex);
            const to = Number(toIndex);
            if (Number.isInteger(from) && Number.isInteger(to) &&
                from >= 0 && to >= 0 && from < engine.items.length && to < engine.items.length &&
                from !== to) {
                [engine.items[from], engine.items[to]] = [engine.items[to], engine.items[from]];
                engine.moves = Number(engine.moves || 0) + 1;
                if (typeof JigsawImagePuzzle.restoreFromEngine === "function") {
                    JigsawImagePuzzle.restoreFromEngine();
                }
                if (typeof JigsawPuzzle !== "undefined") {
                    JigsawPuzzle.state = JigsawImagePuzzle.state;
                }
                moved = true;
            }
        }

        if (!moved) return false;

        const state = isImage && typeof JigsawImagePuzzle !== "undefined"
            ? JigsawImagePuzzle.getState()
            : JigsawPuzzle.getState();

        if (typeof JigsawPuzzle !== "undefined") JigsawPuzzle.state = state;
        engine.items = state.pieces.slice().sort(function (a, b) { return a.currentIndex - b.currentIndex; }).map(function (piece) { return piece.id; });
        engine.moves = state.moves;
        EventManager.emit("puzzleChanged", engine.getState());
        if (state.solved) engine.check();
        return true;
    },

    reset: function (engine) {
        if (!engine || !engine.puzzle || engine.puzzle.type !== "jigsaw" || (engine.state && engine.state.isFinished)) return false;
        const state = JigsawPuzzle.reset();
        if (!state) return false;
        engine.items = state.pieces.slice().sort(function (a, b) { return a.currentIndex - b.currentIndex; }).map(function (piece) { return piece.id; });
        engine.moves = state.moves;
        EventManager.emit("puzzleChanged", engine.getState());
        return true;
    },

    check: function (engine) {
        if (!engine || !engine.puzzle || engine.puzzle.type !== "jigsaw") return false;
        if (engine.puzzle.twoStageWordOrder === true) {
            if (engine.puzzle.stage === 2 && typeof JigsawPuzzleHandler.checkStage2 === "function") return JigsawPuzzleHandler.checkStage2(engine);
            return false;
        }
        if (engine.state && engine.state.isFinished) return !!(JigsawPuzzle.state && JigsawPuzzle.state.solved);
        const solved = JigsawPuzzle.check();
        if (solved) {
            EventManager.emit("puzzleChanged", engine.getState());
            engine.finish();
            return true;
        }
        engine.emitWrong();
        return false;
    }
};

window.JigsawPuzzleHandler = JigsawPuzzleHandler;
PuzzleTypeRegistry.register("jigsaw", JigsawPuzzleHandler);
console.log("Jigsaw Puzzle Handler v2.6 Ready");