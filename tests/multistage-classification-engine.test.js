'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const finished = [];
const context = {
  console: { log() {}, warn() {}, error() {} },
  ActivityManager: { finish(result) { finished.push(result); } },
  Set, String, Object, Array, Number, Math, JSON, Error
};
context.window = context;
context.EventManager = { emit(name, payload) { if (name === 'activityFinished') finished.push(payload); } };

for (const path of [
  'engine/activity/activityResult.js',
  'engine/question/classificationProvider.js',
  'engine/activity/classificationTypes/classificationTypeRegistry.js',
  'engine/activity/classificationTypes/choiceClassification.js',
  'engine/activity/classificationTypes/multiStageClassification.js',
  'engine/activity/classificationEngine.js'
]) {
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
}

const activity = {
  id: 'multi-stage-regression',
  settings: { scorePerCorrect: 10, allowRetry: true },
  classification: {
    mode: 'multiStage',
    instruction: 'دسته‌بندی کن',
    stages: [
      {
        id: 'stage-1',
        title: 'جانوران',
        mode: 'choice',
        categories: [{ id: 'vertebrate', title: 'مهره‌دار' }, { id: 'invertebrate', title: 'بی‌مهره' }],
        items: [
          { id: 'fish', content: 'ماهی', categoryId: 'vertebrate' },
          { id: 'worm', content: 'کرم', categoryId: 'invertebrate' }
        ]
      },
      {
        id: 'stage-2',
        title: 'مواد',
        mode: 'dragDrop',
        categories: [{ id: 'natural', title: 'طبیعی' }, { id: 'artificial', title: 'مصنوعی' }],
        items: [
          { id: 'wood', content: 'چوب', categoryId: 'natural' },
          { id: 'glass', content: 'شیشه', categoryId: 'artificial' }
        ]
      }
    ]
  }
};

const engine = context.ClassificationEngine;
const initial = engine.start(activity);
assert.equal(initial.mode, 'multiStage');
assert.equal(initial.totalItems, 4);
assert.equal(initial.totalStages, 2);
assert.equal(initial.currentStage, 0);

const wrongRetry = engine.classifyItem('fish', 'invertebrate');
assert.equal(wrongRetry.correct, false);
assert.equal(wrongRetry.retryAllowed, true);
assert.equal(engine.getState().currentStage, 0);
assert.equal(engine.getState().classifiedItems, 0);

engine.classifyItem('fish', 'vertebrate');
const stageAdvance = engine.classifyItem('worm', 'invertebrate');
assert.equal(stageAdvance.stageCompleted, true);
assert.equal(stageAdvance.currentStage, 1);
assert.equal(stageAdvance.state.stageCompleted, 1);
assert.equal(stageAdvance.state.totalClassifiedItems, 2);
assert.equal(stageAdvance.state.classifiedItems, 0);
assert.deepEqual(Array.from(stageAdvance.state.items, item => item.id), ['wood', 'glass']);
assert.equal(stageAdvance.state.totalItems, 4);

engine.classifyItem('wood', 'natural');
const saved = engine.getState();
engine.start(activity);
assert.equal(engine.restoreSession(saved), true);
assert.equal(engine.getState().currentStage, 1);
assert.equal(engine.getState().classifiedItems, 1);
assert.equal(engine.getState().totalClassifiedItems, 3);

const finalResult = engine.classifyItem('glass', 'artificial');
assert.equal(finalResult.completed, true);
assert.equal(finalResult.percentage, 100);
assert.equal(finalResult.score, 40);
assert.equal(finalResult.correctAnswers, 4);
assert.equal(finalResult.wrongAnswers, 1);
assert.equal(finalResult.stats.totalQuestions, 4);
assert.equal(finished.length, 1, 'final result must be emitted exactly once');
assert.equal(engine.classifyItem('glass', 'artificial'), null);
assert.equal(finished.length, 1, 'completed activity must not emit a second result');

const noRetryActivity = JSON.parse(JSON.stringify(activity));
noRetryActivity.id = 'multi-stage-no-retry';
noRetryActivity.settings.allowRetry = false;
finished.length = 0;
engine.start(noRetryActivity);
engine.classifyItem('fish', 'invertebrate');
const noRetryAdvance = engine.classifyItem('worm', 'invertebrate');
assert.equal(noRetryAdvance.stageCompleted, true);
assert.equal(noRetryAdvance.state.correctAnswers, 1);
assert.equal(noRetryAdvance.state.wrongAnswers, 1);
assert.equal(noRetryAdvance.state.totalClassifiedItems, 2);
engine.classifyItem('wood', 'natural');
const noRetryResult = engine.classifyItem('glass', 'artificial');
assert.equal(noRetryResult.percentage, 75);
assert.equal(noRetryResult.completed, true);
assert.equal(finished.length, 1);

assert.throws(() => context.ClassificationProvider.getContent({
  classification: {
    mode: 'multiStage',
    stages: [{
      id: 'invalid',
      categories: [{ id: 'a', title: 'A' }],
      items: [{ id: 'duplicate', content: 'x', categoryId: 'missing' }]
    }]
  }
}), /Invalid categoryId/);

console.log('Multi-stage classification regression checks passed');
