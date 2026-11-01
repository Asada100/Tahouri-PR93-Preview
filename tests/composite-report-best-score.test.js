'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const storage = new Map();
const savedData = new Map();
const key = 'profile:Tahouri_Statistics';
savedData.set(key, {
  overall: {
    totalActivities: 12, totalScore: 290, averageScore: 24,
    bestScore: 40, totalCorrect: 29, totalWrong: 6
  },
  subjects: {},
  chapters: {},
  activities: {
    'grade6:science:chapter1:compositeAnimalMediaDemo': {
      activityId: 'compositeAnimalMediaDemo',
      subjectId: 'science',
      gradeId: 'grade6',
      chapterId: 'chapter1',
      totalActivities: 12,
      totalScore: 290,
      averageScore: 24,
      bestScore: 40,
      bestPercentage: 100,
      totalCorrect: 29,
      totalWrong: 6
    },
    'grade5:science:chapter1:compositeAnimalMediaDemo': {
      activityId: 'compositeAnimalMediaDemo',
      subjectId: 'science',
      gradeId: 'grade5',
      chapterId: 'chapter1',
      totalActivities: 1,
      totalScore: 40,
      averageScore: 40,
      bestScore: 40,
      totalCorrect: 4,
      totalWrong: 2
    }
  }
});

const context = {
  console: { log() {}, warn() {}, error() {} },
  localStorage: {
    getItem(name) { return storage.has(name) ? storage.get(name) : null; },
    setItem(name, value) { storage.set(name, String(value)); },
    removeItem(name) { storage.delete(name); }
  },
  ProfileContext: { key(name) { return 'profile:' + name; }, getGrade() { return 'grade6'; } },
  SaveManager: {
    load(name) { return savedData.get(name) || null; },
    save(name, value) { savedData.set(name, JSON.parse(JSON.stringify(value))); return true; }
  },
  Math, Number, String, Object, Array, JSON
};
context.window = context;

vm.runInNewContext(
  fs.readFileSync('engine/core/statisticsManager.js', 'utf8'),
  context,
  { filename: 'engine/core/statisticsManager.js' }
);

const stats = context.StatisticsManager.getActivities();
const activity = stats['grade6:science:chapter1:compositeAnimalMediaDemo'];

assert.equal(activity.bestScore, 60,
  'a historical 100% composite result must use the new 60-point scale');
assert.equal(activity.bestPercentage, 100,
  'best percentage must remain unchanged');
assert.equal(activity.totalActivities, 12,
  'migration must not change attempt count');
assert.equal(activity.totalScore, 290,
  'migration must preserve aggregate historical score when per-attempt scores are unavailable');
assert.equal(activity.totalCorrect, 29);
assert.equal(activity.totalWrong, 6);
assert.equal(context.StatisticsManager.get().bestScore, 60,
  'overall best score must be rebuilt from migrated activity statistics');
assert.equal(stats['grade5:science:chapter1:compositeAnimalMediaDemo'].bestScore, 40,
  'records without a confirmed perfect percentage must not be migrated');

console.log('Composite report best-score migration checks passed');
