// =====================================
// Tahouri Edu Platform
// Image Jigsaw Core
// Version 1.0
// Owns image-only Jigsaw state and movement.
// =====================================
const JigsawImagePuzzle = {
    VERSION: "1.0",
    state: null,

    resolveImagePath: function (image) {
        if (!image) return image;
        const raw = String(image).trim();
        if (!raw) return raw;
        let assetPath = raw;
        try { assetPath = new URL(raw, document.baseURI).pathname || raw; } catch (e) {}
        const match = assetPath.match(/(?:^|\/)assets\/(.*)$/);
        if (match) {
            const script = Array.from(document.scripts || []).find(function (item) {
                return item.src && /(?:^|\/)engine\//.test(item.src);
            });
            if (script && script.src) {
                const scriptURL = new URL(script.src, document.baseURI);
                const root = new URL("../../", scriptURL);
                return new URL("assets/" + match[1], root).href;
            }
            const basePath = document.baseURI.replace(/[^/]*$/, "");
            return new URL("assets/" + match[1], basePath).href;
        }
        return new URL(raw, document.baseURI).href;
    },

    start: function (definition) {
        const puzzle = definition || {};
        const content = puzzle.content || {};
        const rows = Number(content.rows), cols = Number(content.cols), image = content.image;
        if (!Number.isInteger(rows) || rows < 2 || !Number.isInteger(cols) || cols < 2 || !image) {
            console.error("Image Jigsaw: Invalid image definition");
            return null;
        }
        const count = rows * cols;
        const pieces = [];
        for (let i = 0; i < count; i += 1) pieces.push({ id: "piece-" + i, correctIndex: i, currentIndex: i });
        const arrangement = this.shuffleIndexes(count);
        pieces.forEach(function (piece, index) { piece.currentIndex = arrangement[index]; });
        if (this.isIdentity(pieces) && count > 1) {
            [pieces[count - 1].currentIndex, pieces[count - 2].currentIndex] =
                [pieces[count - 2].currentIndex, pieces[count - 1].currentIndex];
        }
        this.state = {
            type: "jigsaw", mode: "image", image: this.resolveImagePath(image),
            rows: rows, cols: cols, pieceCount: count,
            difficulty: Number(puzzle.difficulty || 1), pieces: pieces, moves: 0, solved: false
        };
        console.log("Image Jigsaw Started", { rows: rows, cols: cols, pieceCount: count });
        return this.getState();
    },

    restoreFromEngine: function () {
        if (typeof PuzzleEngine === "undefined" || !PuzzleEngine.puzzle || PuzzleEngine.puzzle.type !== "jigsaw") return false;
        const puzzle = PuzzleEngine.puzzle;
        const count = Number(puzzle.pieceCount || (Number(puzzle.rows) * Number(puzzle.cols)));
        if (!Number.isInteger(count) || count < 2) return false;
        const pieces = Array.from({length: count}, function (_, i) {
            return { id: "piece-" + i, correctIndex: i, currentIndex: i };
        });
        const items = Array.isArray(PuzzleEngine.items) ? PuzzleEngine.items : [];
        if (items.length === count) {
            const used = new Set();
            let valid = true;
            items.forEach(function (id, position) {
                const piece = pieces.find(function (p) { return p.id === id && !used.has(p.id); });
                if (!piece) valid = false;
                else { piece.currentIndex = position; used.add(piece.id); }
            });
            if (!valid || used.size !== count) pieces.forEach(function (p, i) { p.currentIndex = i; });
        }
        this.state = {
            type: "jigsaw", mode: "image",
            image: this.resolveImagePath(puzzle.image), rows: Number(puzzle.rows), cols: Number(puzzle.cols),
            pieceCount: count, difficulty: Number(puzzle.difficulty || 1), pieces: pieces,
            moves: Number(PuzzleEngine.moves || 0), solved: false
        };
        this.state.solved = this.isSolved();
        console.log("Image Jigsaw State Restored", { pieceCount: count, moves: this.state.moves, solved: this.state.solved });
        return true;
    },

    move: function (fromIndex, toIndex) {
        if (!this.state || this.state.solved) return false;
        const from = Number(fromIndex), to = Number(toIndex);
        if (!this.isValidPosition(from) || !this.isValidPosition(to) || from === to) return false;
        const a = this.getPieceAt(from), b = this.getPieceAt(to);
        if (!a || !b) return false;
        [a.currentIndex, b.currentIndex] = [b.currentIndex, a.currentIndex];
        this.state.moves += 1;
        this.state.solved = this.isSolved();
        return true;
    },

    check: function () { if (!this.state) return false; this.state.solved = this.isSolved(); return this.state.solved; },
    isSolved: function () { return !!this.state && Array.isArray(this.state.pieces) && this.state.pieces.every(function (p) { return p.currentIndex === p.correctIndex; }); },
    isIdentity: function (pieces) { return pieces.every(function (p) { return p.currentIndex === p.correctIndex; }); },
    reset: function () {
        if (!this.state) return null;
        const arrangement = this.shuffleIndexes(this.state.pieceCount);
        this.state.pieces.forEach(function (p, i) { p.currentIndex = arrangement[i]; });
        if (this.isIdentity(this.state.pieces) && this.state.pieceCount > 1) {
            const n = this.state.pieceCount;
            [this.state.pieces[n - 1].currentIndex, this.state.pieces[n - 2].currentIndex] =
                [this.state.pieces[n - 2].currentIndex, this.state.pieces[n - 1].currentIndex];
        }
        this.state.moves = 0; this.state.solved = false;
        return this.getState();
    },
    getState: function () {
        if (!this.state) this.restoreFromEngine();
        if (!this.state) return null;
        return JSON.parse(JSON.stringify(this.state));
    },
    getPieceAt: function (position) { return this.state ? this.state.pieces.find(function (p) { return p.currentIndex === position; }) || null : null; },
    isValidPosition: function (position) { return Number.isInteger(position) && !!this.state && position >= 0 && position < this.state.pieceCount; },
    shuffleIndexes: function (count) {
        const indexes = Array.from({length: count}, function (_, i) { return i; });
        for (let i = indexes.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
        }
        return indexes;
    }
};
window.JigsawImagePuzzle = JigsawImagePuzzle;
console.log("Image Jigsaw Core v1.0 Ready");