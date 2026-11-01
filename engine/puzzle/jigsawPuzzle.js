// =====================================
// Tahouri Edu Platform
// Jigsaw Dispatcher / Compatibility Facade
// Version 3.0
// Image and Word Jigsaw implementations are isolated.
// =====================================
const JigsawPuzzle = {
    VERSION: "3.0",
    state: null,
    active: function () {
        return this.state && this.state.mode === "words" ? JigsawWordPuzzle : JigsawImagePuzzle;
    },
    start: function (definition) {
        const content = (definition && definition.content) || {};
        const isWords = Array.isArray(content.words) && content.words.length >= 2;
        const engine = isWords ? JigsawWordPuzzle : JigsawImagePuzzle;
        const result = engine.start(definition);
        this.state = engine.state;
        return result;
    },
    restoreFromEngine: function () {
        if (typeof PuzzleEngine === "undefined" || !PuzzleEngine.puzzle) return false;
        const engine = PuzzleEngine.puzzle.mode === "words" || Array.isArray(PuzzleEngine.puzzle.words) ? JigsawWordPuzzle : JigsawImagePuzzle;
        const ok = engine.restoreFromEngine();
        this.state = engine.state;
        return ok;
    },
    move: function (from, to) { const engine = this.active(); const ok = engine && engine.move(from, to); this.state = engine ? engine.state : null; return ok; },
    reset: function () { const engine = this.active(); const result = engine && engine.reset(); this.state = engine ? engine.state : null; return result; },
    check: function () { const engine = this.active(); const ok = engine && engine.check(); this.state = engine ? engine.state : null; return ok; },
    getState: function () { const engine = this.active(); const result = engine && engine.getState(); this.state = engine ? engine.state : null; return result; },
    isSolved: function () { const engine = this.active(); return !!(engine && engine.check && engine.check()); },
    normalizeWord: function (word) { return typeof JigsawWordPuzzle !== "undefined" && JigsawWordPuzzle.normalizeWord ? JigsawWordPuzzle.normalizeWord(word) : String(word == null ? "" : word); }
};
window.JigsawPuzzle = JigsawPuzzle;
console.log("Jigsaw Dispatcher v3.0 Ready");