'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadTracker(seed) {
  const store = new Map(Object.entries(seed || {}));
  const context = {
    console: { log() {}, error() {}, warn() {} },
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); }
    },
    ProfileContext: { key(key) { return 'profile:' + key; } },
    JSON, Math, Number, String, Date, Object, Array
  };
  context.window = context;
  vm.runInNewContext(
    fs.readFileSync('engine/progress/progressTracker.js', 'utf8'),
    context,
    { filename: 'engine/progress/progressTracker.js' }
  );
  return context.ProgressTracker;
}

const tracker = loadTracker();
tracker.update('sample-activity', {
  score: 60, percentage: 100, stars: 5, completed: true
});
tracker.update('sample-activity', {
  score: 40, percentage: 67, stars: 3, completed: true
});
let saved = tracker.get('sample-activity');
assert.equal(saved.percentage, 67, 'latest percentage must reflect the latest attempt');
assert.equal(saved.stars, 3, 'latest stars must reflect the latest attempt');
assert.equal(saved.bestScore, 60, 'best score must not be replaced by a lower score');
assert.equal(saved.bestPercentage, 100, 'best percentage must be preserved');
assert.equal(saved.bestStars, 5, 'best stars must be preserved');
assert.equal(saved.completed, true, 'finishing an activity must mark it completed');
assert.equal(saved.successful, false, 'a completed 67 percent attempt is not an educational pass');

const legacyKey = 'profile:Tahouri_Progress';
const legacyData = {
  compositeAnimalMediaDemo: {
    played: true, bestScore: 30, stars: 2, percentage: 33,
    completed: true, lastPlayed: 1
  }
};
const migratedTracker = loadTracker({ [legacyKey]: JSON.stringify(legacyData) });
migratedTracker.update('compositeAnimalMediaDemo', {
  score: 40, percentage: 67, stars: 3, completed: true
});
saved = migratedTracker.get('compositeAnimalMediaDemo');
assert.equal(saved.bestScore, 60, 'legacy perfect score must be converted to the new six-unit scale');
assert.equal(saved.bestPercentage, 100, 'legacy perfect percentage must survive migration');
assert.equal(saved.bestStars, 5, 'legacy perfect stars must survive migration');
assert.equal(saved.percentage, 67, 'latest result must still show the new attempt');

console.log('Progress tracker best-versus-latest regression checks passed');
