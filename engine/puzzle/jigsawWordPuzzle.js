// =====================================
// Tahouri Edu Platform
// Word Jigsaw Core
// Version 1.0
// Owns word/sentence Jigsaw state and movement.
// =====================================
const JigsawWordPuzzle = {
    VERSION: "1.0",
    state: null,
    normalizeWord: function (word) { return String(word == null ? "" : word).replace(/\u200c/g, " ").replace(/\s+/g, " ").trim(); },

    start: function (definition) {
        const puzzle = definition || {};
        const content = puzzle.content || {};
        const words = Array.isArray(content.words) ? content.words.map(String) : [];
        if (words.length < 2) { console.error("Word Jigsaw: At least two words are required"); return null; }
        const pieces = words.map(function (word, i) { return { id: "word-" + i, word: word, correctIndex: i, currentIndex: i }; });
        const arrangement = this.shuffleIndexes(words.length);
        pieces.forEach(function (piece, i) { piece.currentIndex = arrangement[i]; });
        if (this.isSolved(pieces, words) && pieces.length > 1) {
            [pieces[pieces.length - 1].currentIndex, pieces[pieces.length - 2].currentIndex] =
                [pieces[pieces.length - 2].currentIndex, pieces[pieces.length - 1].currentIndex];
        }
        this.state = { type: "jigsaw", mode: "words", words: words.slice(), pieceCount: words.length, difficulty: Number(puzzle.difficulty || 1), pieces: pieces, moves: 0, solved: false };
        console.log("Word Jigsaw Started", { pieceCount: words.length });
        return this.getState();
    },

    restoreFromEngine: function () {
        if (typeof PuzzleEngine === "undefined" || !PuzzleEngine.puzzle || PuzzleEngine.puzzle.type !== "jigsaw") return false;
        const puzzle = PuzzleEngine.puzzle;
        const words = Array.isArray(puzzle.words) ? puzzle.words.map(String) : [];
        if (words.length < 2) return false;
        const pieces = words.map(function (word, i) { return { id: "word-" + i, word: word, correctIndex: i, currentIndex: i }; });
        const items = Array.isArray(PuzzleEngine.items) ? PuzzleEngine.items : [];
        if (items.length === pieces.length) {
            const used = new Set(); let valid = true;
            items.forEach(function (id, pos) {
                const piece = pieces.find(function (p) { return p.id === id && !used.has(p.id); });
                if (!piece) valid = false; else { piece.currentIndex = pos; used.add(piece.id); }
            });
            if (!valid || used.size !== pieces.length) pieces.forEach(function (p, i) { p.currentIndex = i; });
        }
        this.state = { type: "jigsaw", mode: "words", words: words, pieceCount: words.length, difficulty: Number(puzzle.difficulty || 1), pieces: pieces, moves: Number(PuzzleEngine.moves || 0), solved: false };
        this.state.solved = this.isSolved();
        console.log("Word Jigsaw State Restored", { pieceCount: words.length, moves: this.state.moves, solved: this.state.solved });
        return true;
    },

    move: function (fromIndex, toIndex) {
        if (!this.state || this.state.solved) return false;
        const from = Number(fromIndex), to = Number(toIndex);
        if (!this.isValidPosition(from) || !this.isValidPosition(to) || from === to) return false;
        const a = this.getPieceAt(from), b = this.getPieceAt(to);
        if (!a || !b) return false;
        [a.currentIndex, b.currentIndex] = [b.currentIndex, a.currentIndex];
        this.state.moves += 1; this.state.solved = this.isSolved();
        return true;
    },
    check: function () { if (!this.state) return false; this.state.solved = this.isSolved(); return this.state.solved; },
    isSolved: function (pieces, words) {
        if (!Array.isArray(pieces) || !Array.isArray(words)) return false;
        return words.every(function (expected, position) {
            const piece = pieces.find(function (p) { return p.currentIndex === position; });
            return !!piece && JigsawWordPuzzle.normalizeWord(piece.word) === JigsawWordPuzzle.normalizeWord(expected);
        });
    },
    reset: function () {
        if (!this.state) return null;
        const arrangement = this.shuffleIndexes(this.state.pieceCount);
        this.state.pieces.forEach(function (p, i) { p.currentIndex = arrangement[i]; });
        if (this.isSolved(this.state.pieces, this.state.words) && this.state.pieceCount > 1) {
            const n = this.state.pieceCount;
            [this.state.pieces[n - 1].currentIndex, this.state.pieces[n - 2].currentIndex] =
                [this.state.pieces[n - 2].currentIndex, this.state.pieces[n - 1].currentIndex];
        }
        this.state.moves = 0; this.state.solved = false;
        return this.getState();
    },
    getState: function () { if (!this.state) this.restoreFromEngine(); return this.state ? JSON.parse(JSON.stringify(this.state)) : null; },
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
window.JigsawWordPuzzle = JigsawWordPuzzle;
console.log("Word Jigsaw Core v1.0 Ready");