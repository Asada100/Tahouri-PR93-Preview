'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const events = [];
const context = {
  console: { log() {}, error() {}, warn() {} },
  EventManager: { emit(name, payload) { events.push({ name, payload }); } },
  MatchingProvider: {
    getContent(activity) { return activity.matching; }
  },
  MatchingTypeRegistry: {
    has() { return false; },
    get() {
      return { prepare(data) { return data; } };
    }
  },
  Math,
  JSON,
  Number,
  String,
  Array,
  Object
};
context.window = context;
vm.runInNewContext(
  fs.readFileSync('engine/activity/matchingEngine.js', 'utf8'),
  context,
  { filename: 'engine/activity/matchingEngine.js' }
);

function completeMatching(activity) {
  const state = context.MatchingEngine.start(activity);
  assert.ok(state && state.started, 'matching activity should start');
  for (const pair of activity.matching.pairs) {
    context.MatchingEngine.select('left', pair.left.id);
    context.MatchingEngine.select('right', pair.right.id);
  }
  assert.equal(context.MatchingEngine.getState().finished, true);
}

const matching = {
  type: 'matching',
  matchingType: 'basic',
  instruction: 'match',
  pairs: [
    { id: 'p1', left: { id: 'left1', value: 'A' }, right: { id: 'right1', value: '1' } },
    { id: 'p2', left: { id: 'left2', value: 'B' }, right: { id: 'right2', value: '2' } }
  ],
  leftItems: [
    { id: 'left1', value: 'A' },
    { id: 'left2', value: 'B' }
  ],
  rightItems: [
    { id: 'right1', value: '1' },
    { id: 'right2', value: '2' }
  ]
};

completeMatching({
  id: 'composite-demo::matching-stage',
  type: 'matching',
  settings: { compositeStage: true },
  matching
});

assert.equal(events.filter(event => event.name === 'compositeMatchingFinished').length, 1,
  'composite matching must emit its stage-complete event exactly once');
assert.equal(events.filter(event => event.name === 'activityFinished').length, 0,
  'composite matching must not finish the whole platform activity');
assert.equal(events[0].payload.activityId, 'composite-demo::matching-stage');
assert.equal(events[0].payload.result.percentage, 100);

events.length = 0;
completeMatching({
  id: 'standalone-matching',
  type: 'matching',
  settings: {},
  matching
});
assert.equal(events.filter(event => event.name === 'activityFinished').length, 1,
  'standalone matching must preserve the normal activity lifecycle');
assert.equal(events.filter(event => event.name === 'compositeMatchingFinished').length, 0,
  'standalone matching must not emit a composite-only event');

console.log('Composite matching lifecycle regression checks passed');
