'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const emitted = [];
const context = { console: { log() {}, warn() {}, error() {} }, Math, Number, String, Object, Array, Set, JSON };
context.window = context;
context.EventManager = { emit(name, payload) { emitted.push({ name, payload }); } };
context.ActivityResult = { create(result) { return result; } };
for (const path of [
  'engine/wordPuzzle/wordRepository.js','engine/wordPuzzle/pathEngine.js',
  'engine/wordPuzzle/difficultyEngine.js','engine/wordPuzzle/hintEngine.js',
  'engine/wordPuzzle/scoreEngine.js','engine/wordPuzzle/wordPuzzleValidator.js',
  'engine/wordPuzzle/wordPuzzleEngine.js'
]) vm.runInNewContext(fs.readFileSync(path, 'utf8'), context, { filename: path });

const activity = {
  id: 'word-puzzle-regression',
  settings: { rounds: 5, modes: ['wordBuilder','wordSearch','wordFamily','lPath'], difficulty: 2 },
  puzzle: {
    builderStages: [{
      id: 'test-stage', title: 'مرحله آزمایشی', targetCount: 1,
      letters: ['چ','ر','ا','غ'],
      words: [{ word: 'چراغ', meaning: 'وسیله‌ای که نور می‌دهد' }]
    }],
    words: [
      { word: 'چراغ', clue: 'وسیله‌ای که نور می‌دهد' },
      { word: 'فروغ', clue: 'روشنایی و تابش' },
      { word: 'جهان', clue: 'همه عالم و هستی' },
      { word: 'تجلی', clue: 'آشکار شدن' },
      { word: 'تعالی', clue: 'بلندی و کمال' },
      { word: 'کتاب', clue: 'چیزی برای خواندن' },
      { word: 'مدرسه', clue: 'محل آموزش' },
      { word: 'دانش', clue: 'آگاهی' },
      { word: 'روشنایی', clue: 'تابش نور' },
      { word: 'تابان', clue: 'درخشان' }
    ],
    families: [{ base: 'علم', members: ['عالم', 'علوم'] }]
  }
};

let state = context.WordPuzzleEngine.start(activity);
assert.equal(state.data.type, 'modeSelect', 'game starts with a mode chooser, not an automatic chain');
assert.equal(state.mode, null);

state = context.WordPuzzleEngine.selectMode('wordBuilder');
assert.equal(state.data.type, 'wordBuilder');
assert.equal(state.total, 1);
const built = context.WordPuzzleEngine.submitBuilder('چراغ');
assert.equal(built.correct, true);
assert.equal(built.finished, true, 'one independent word-builder game ends only after its answer is correct');

state = context.WordPuzzleEngine.start(activity);
state = context.WordPuzzleEngine.selectMode('wordSearch');
assert.equal(state.data.type, 'wordSearch');
assert.equal(state.data.words.length, 10, 'word search shows ten target words when the activity provides ten');
assert.ok(state.data.grid.length <= 9, 'ten-word search keeps the board compact enough to avoid unnecessary scrolling');
assert.ok(state.data.placements.length >= 2, 'word-search board should contain multiple words');
assert.equal(state.total, state.data.words.length);
const first = state.data.placements[0];
const firstResult = context.WordPuzzleEngine.submitSearch(first.path);
assert.equal(firstResult.correct, true);
assert.equal(firstResult.finished, false, 'finding one word must not finish a multi-word search board');
assert.equal(context.WordPuzzleEngine.state.foundWords.length, 1);
assert.equal(context.WordPuzzleEngine.state.mode, 'wordSearch', 'mode does not auto-chain');
assert.equal(context.WordPuzzleEngine.state.round, 0, 'round does not auto-advance');
const duplicate = context.WordPuzzleEngine.submitSearch(first.path);
assert.equal(duplicate.duplicate, true, 'already-found words are not counted twice');
for (const placement of state.data.placements.slice(1)) {
  const result = context.WordPuzzleEngine.submitSearch(placement.path);
  assert.equal(result.correct, true, 'each placed target word can be found');
}
assert.equal(context.WordPuzzleEngine.state.finished, true, 'board finishes after all target words are found');
assert.equal(context.WordPuzzleEngine.state.correct, context.WordPuzzleEngine.state.total);
assert.equal(emitted.filter(x => x.name === 'activityFinished').length, 2, 'one completion event per completed independent game');

const screen = fs.readFileSync('engine/ui/wordPuzzleScreen.js', 'utf8');
const styles = fs.readFileSync('engine/ui/wordPuzzle.css', 'utf8');
assert.match(screen, /pointerdown/);
assert.match(screen, /pointermove/);
assert.match(screen, /selectMode\(mode\)/);
assert.match(screen, /wp-found/);

// Hints target an unfound word and charge a two-point penalty.
state = context.WordPuzzleEngine.start(activity);
state = context.WordPuzzleEngine.selectMode('wordSearch');
const hint = context.WordPuzzleEngine.hint();
assert.equal(hint.type, 'path');
assert.ok(hint.value.length >= 1);
assert.ok(hint.word);
assert.equal(context.WordPuzzleEngine.state.hintPenalty, 2);
assert.equal(hint.value.length, 1, 'first word-search hint reveals only the first letter');
const secondHint = context.WordPuzzleEngine.hint();
assert.equal(secondHint.type, 'path');
assert.equal(secondHint.word, hint.word, 'second hint continues on the same unfound word');
assert.equal(secondHint.value.length, 2, 'second hint reveals only the first two letters');
assert.equal(context.WordPuzzleEngine.state.hintPenalty, 4);
const limitedHint = context.WordPuzzleEngine.hint();
assert.equal(limitedHint.type, 'limit', 'further hints for the same word reveal nothing more');
assert.equal(context.WordPuzzleEngine.state.hintPenalty, 4, 'a hint at the cap does not deduct more points');
const hintedPlacement = state.data.placements.find(p => p.word === hint.word);
assert.ok(hintedPlacement);
context.WordPuzzleEngine.submitSearch(hintedPlacement.path);
const nextWordHint = context.WordPuzzleEngine.hint();
assert.equal(nextWordHint.type, 'path');
assert.notEqual(nextWordHint.word, hint.word, 'after finding a word, hints move to the next unfound word');
assert.equal(nextWordHint.value.length, 1, 'the next word starts again with its first letter');

// Straight-line movement contract for word search (no turns).
assert.equal(context.WordPuzzlePathEngine.straight([[0,0],[0,1],[0,2]]), true);
assert.equal(context.WordPuzzlePathEngine.straight([[0,0],[1,1],[2,2]]), true);
assert.equal(context.WordPuzzlePathEngine.straight([[0,0],[0,1],[1,1]]), false);
assert.match(screen, /straightOnly:false/);
assert.match(screen, /onRelease:selected/);
assert.match(screen, /wp-live-word/);
assert.doesNotMatch(screen.slice(screen.indexOf('search(x,d,foundWords=[])'), screen.indexOf('lpath(x,d){')), /data-check|data-clear/);
assert.match(screen, /wp-path-found/);

console.log('Word Puzzle independent modes, straight tracing, and auto-check checks passed');

assert.match(screen, /const crossed=\[\]/, 'drag tracking follows the swept pointer segment between events');
assert.match(screen, /const corridor=Math\.min\(bounds\.width,bounds\.height\)\*0\.34/);
assert.doesNotMatch(screen, /wp-search-tools-toggle/);
assert.match(screen, /wp-search-hint/);
assert.doesNotMatch(styles, /wp-search-tools-toggle/);
