'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = {
  console: { log() {}, warn() {}, error() {} },
  document: {
    readyState: 'loading',
    addEventListener() {}
  },
  Set,
  String,
  Object,
  Array
};
context.window = context;

for (const path of [
  'engine/question/compositeActivityProvider.js',
  'engine/ui/compositeActivityScreen.js'
]) {
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
}

const activity = {
  id: 'audio-prompt-test',
  composite: {
    mode: 'composite',
    stages: [{
      id: 'sound-question',
      interaction: 'choice',
      title: 'صدای جانور',
      instruction: 'به صدا گوش کن و پاسخ درست را انتخاب کن.',
      prompt: { type: 'audio', src: 'assets/audio/frog.mp3' },
      options: [
        { id: 'frog', media: { type: 'text', value: 'قورباغه' } },
        { id: 'cat', media: { type: 'text', value: 'گربه' } }
      ],
      answerId: 'frog'
    }]
  }
};

const normalized = context.CompositeActivityProvider.getContent(activity);
assert.equal(normalized.stages[0].prompt.type, 'audio');
assert.equal(normalized.stages[0].prompt.src, 'assets/audio/frog.mp3');

const rendered = context.CompositeActivityScreen.renderMedia(normalized.stages[0].prompt, true);
assert.match(rendered, /<audio[^>]*controls/);
assert.match(rendered, /preload="none"/);
assert.match(rendered, /src="assets\/audio\/frog\.mp3"/);
assert.match(rendered, /compositeAudioFallback[^>]*hidden/);
assert.match(rendered, /پخش این صدا ممکن نیست/);

assert.throws(() => context.CompositeActivityProvider.getContent({
  composite: {
    mode: 'composite',
    stages: [{
      id: 'invalid-audio-option',
      interaction: 'choice',
      prompt: { type: 'text', value: 'کدام صدا؟' },
      options: [
        { id: 'audio', media: { type: 'audio', src: 'assets/audio/frog.mp3' } },
        { id: 'text', media: { type: 'text', value: 'قورباغه' } }
      ],
      answerId: 'text'
    }]
  }
}), /Unsupported media type/);

assert.throws(() => context.CompositeActivityProvider.getContent({
  composite: {
    mode: 'composite',
    stages: [{
      id: 'missing-audio-source',
      interaction: 'choice',
      prompt: { type: 'audio', src: '  ' },
      options: [
        { id: 'yes', media: { type: 'text', value: 'بله' } },
        { id: 'no', media: { type: 'text', value: 'خیر' } }
      ],
      answerId: 'yes'
    }]
  }
}), /Media source is missing/);

console.log('Composite audio prompt regression checks passed');
