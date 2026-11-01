'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const activityPath = 'content/grades/grade6/science/chapter1/compositeAnimalMediaDemo/activity.json';
const activity = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
const index = JSON.parse(fs.readFileSync('data/activities.json', 'utf8'));
const events = [];
let finalResult = null;

const context = {
  console: { log() {}, warn() {}, error() {} },
  EventManager: { emit(name, payload) { events.push({ name, payload }); } },
  ActivityManager: { finish(result) { finalResult = result; } },
  ActivityResult: { create(payload) { return payload; } },
  MatchingTypeRegistry: {
    has() { return false; },
    get() { return { prepare(data) { return data; } }; }
  },
  Math, JSON, Number, String, Array, Object, Set
};
context.window = context;

for (const path of [
  'engine/question/matchingProvider.js',
  'engine/activity/matchingEngine.js',
  'engine/question/compositeActivityProvider.js',
  'engine/activity/compositeActivityEngine.js'
]) {
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
}

assert.ok(index.some(item => item.id === activity.id && item.title === activity.title),
  'activity must be registered in the platform activity index');
assert.equal(activity.composite.stages.length, 3, 'activity must have exactly three stages');
assert.equal(activity.composite.stages[2].interaction, 'matching');
assert.equal(activity.composite.stages[2].matching.pairs.length, 4);
for (const stage of activity.composite.stages) {
  if (stage.prompt && stage.prompt.type === 'image') {
    assert.ok(fs.existsSync(stage.prompt.src), 'missing prompt image: ' + stage.prompt.src);
  }
}

let state = context.CompositeActivityEngine.start(activity);
assert.equal(state.totalStages, 3);
assert.equal(state.stage.id, 'cat-group');

// Complete the first choice stage correctly.
let answer = context.CompositeActivityEngine.answer('not-an-option');
assert.equal(answer, null, 'unknown option IDs must be rejected');
assert.equal(context.CompositeActivityEngine.getState().moves, 0, 'invalid choices must not count as moves');
answer = context.CompositeActivityEngine.answer('cat-mammal');
assert.equal(answer.correct, true);
state = context.CompositeActivityEngine.next();
assert.equal(state.stage.id, 'frog-group');

// Complete the second choice stage correctly.
answer = context.CompositeActivityEngine.answer('frog-amphibian');
assert.equal(answer.correct, true);
state = context.CompositeActivityEngine.next();
assert.equal(state.stage.id, 'animal-group-matching');

// The parent engine must reject a partial matching result and leave the stage pending.
assert.equal(context.CompositeActivityEngine.completeMatchingStage({ percentage: 75, moves: 3, wrongAnswers: 1 }), null,
  'an incomplete matching stage must not be accepted');
assert.equal(context.CompositeActivityEngine.getState().answers[2], undefined,
  'an incomplete matching stage must not mark the stage complete');

// Run the actual matching engine against the activity's four configured pairs.
const matchingActivity = {
  id: activity.id + '::animal-group-matching',
  type: 'matching',
  settings: { compositeStage: true },
  matching: state.stage.matching
};
const matchingState = context.MatchingEngine.start(matchingActivity);
assert.ok(matchingState && matchingState.started, 'matching stage must start');
const pairs = state.stage.matching.pairs;
// A wrong attempt must be counted but must not lock the left item or finish the stage.
context.MatchingEngine.select('left', pairs[0].left.id);
const wrongAttempt = context.MatchingEngine.select('right', pairs[1].right.id);
assert.equal(wrongAttempt.correct, false, 'a mismatched pair must be rejected');
assert.equal(context.MatchingEngine.getState().finished, false, 'a wrong pair must not finish matching');
for (const pair of pairs) {
  context.MatchingEngine.select('left', pair.left.id);
  context.MatchingEngine.select('right', pair.right.id);
}
const matchingFinished = events.find(event => event.name === 'compositeMatchingFinished');
assert.ok(matchingFinished, 'matching stage must emit its internal completion event');
assert.equal(events.filter(event => event.name === 'activityFinished').length, 0,
  'inner matching stage must not finish the parent activity');
assert.equal(matchingFinished.payload.result.percentage, 100);
assert.equal(matchingFinished.payload.result.wrongAnswers, 1, 'wrong matching attempts must be preserved in the result');
assert.equal(matchingFinished.payload.result.moves, 5, 'the failed attempt must count toward moves');

state = context.CompositeActivityEngine.completeMatchingStage(matchingFinished.payload.result);
assert.ok(state && state.answers[2], 'composite engine must accept matching completion');
const result = context.CompositeActivityEngine.next();
assert.equal(result.activityId, activity.id);
assert.equal(result.completed, true);
assert.equal(result.percentage, 100);
assert.equal(result.correctAnswers, 6);
assert.equal(result.totalQuestions, 6);
assert.equal(result.wrongAnswers, 1, 'the parent activity must preserve matching-stage mistakes');
assert.equal(result.score, 60, 'each of the six correct learning units must earn points');
assert.equal(finalResult.activityId, activity.id);
assert.equal(events.filter(event => event.name === 'activityFinished').length, 0,
  'composite engine should finish through ActivityManager, not emit a duplicate finish event');

// Two wrong choices plus four correct matches must score four of six units.
context.CompositeActivityEngine.reset();
events.length = 0;
state = context.CompositeActivityEngine.start(activity);
answer = context.CompositeActivityEngine.answer('cat-bird');
assert.equal(answer.correct, false);
context.CompositeActivityEngine.next();
answer = context.CompositeActivityEngine.answer('frog-reptile');
assert.equal(answer.correct, false);
state = context.CompositeActivityEngine.next();
const retryMatchingActivity = {
  id: activity.id + '::animal-group-matching',
  type: 'matching',
  settings: { compositeStage: true },
  matching: state.stage.matching
};
context.MatchingEngine.start(retryMatchingActivity);
for (const pair of state.stage.matching.pairs) {
  context.MatchingEngine.select('left', pair.left.id);
  context.MatchingEngine.select('right', pair.right.id);
}
const retryFinished = events.find(event => event.name === 'compositeMatchingFinished');
assert.ok(retryFinished, 'retry matching stage must finish');
context.CompositeActivityEngine.completeMatchingStage(retryFinished.payload.result);
const retryResult = context.CompositeActivityEngine.next();
assert.equal(retryResult.correctAnswers, 4, 'four matching pairs count as four correct units');
assert.equal(retryResult.totalQuestions, 6, 'two choices plus four pairs make six units');
assert.equal(retryResult.percentage, 67, 'two wrong choices and four correct pairs must yield 67 percent');
assert.equal(retryResult.score, 40, 'four correct units must earn forty points');
assert.equal(retryResult.wrongAnswers, 2, 'both incorrect choices must be preserved');

// A valid but incorrect choice is recorded once and cannot be answered repeatedly.
context.CompositeActivityEngine.reset();
context.CompositeActivityEngine.start(activity);
answer = context.CompositeActivityEngine.answer('cat-bird');
assert.equal(answer.correct, false, 'a valid wrong choice must be recorded as incorrect');
assert.equal(context.CompositeActivityEngine.getState().wrongAnswers, 1);
assert.equal(context.CompositeActivityEngine.answer('cat-mammal'), null,
  'a stage must not accept a second answer after its first answer is recorded');
assert.equal(context.CompositeActivityEngine.next().stage.id, 'frog-group',
  'the learner must be able to continue after feedback on an incorrect answer');

console.log('Full animal composite activity integration checks passed');
