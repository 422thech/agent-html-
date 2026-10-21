const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const file = path.join(__dirname, 'index.html');
const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const source = html.match(/<script id="mbti-core">([\s\S]*?)<\/script>/)?.[1] || '';
const context = vm.createContext({});
vm.runInContext(source, context);
const api = context.MBTI;

test('all questions and type interpretations are available for a complete test', () => {
  assert.ok(api, 'personality scoring and question data must exist');
  assert.equal(api.questions.length, 48);
  assert.equal(new Set(api.questions.map(q => q.text)).size, 48);
  for (const dim of ['EI', 'SN', 'TF', 'JP']) {
    const list = api.questions.filter(q => q.dim === dim);
    assert.equal(list.length, 12);
    assert.equal(list.filter(q => q.direction === 1).length, 6);
    assert.equal(list.filter(q => q.direction === -1).length, 6);
  }
  assert.equal(Object.keys(api.types).length, 16);
});

test('all sixteen preference combinations produce the matching complete interpretation', () => {
  assert.ok(api, 'scoring must exist');
  for (const type of ['ESTJ','ESTP','ESFJ','ESFP','ENTJ','ENTP','ENFJ','ENFP','ISTJ','ISTP','ISFJ','ISFP','INTJ','INTP','INFJ','INFP']) {
    const answers = api.questions.map(q => type.includes(q.dim[0]) ? 2*q.direction : -2*q.direction);
    const result = api.score(answers);
    assert.equal(result.type, type);
    result.dimensions.forEach(d => assert.equal(d.percent, 100));
    for (const field of ['title','summary','core','strengths','blind','communication','growth']) {
      assert.ok(api.types[type][field]?.length > 0, type+' missing '+field);
    }
  }
});

test('neutral answers and close scores explicitly identify ties and weak preferences', () => {
  assert.ok(api, 'scoring must exist');
  const answers = Array(48).fill(0);
  const tie = api.score(answers);
  assert.equal(tie.type, 'ESTJ');
  tie.dimensions.forEach(d => {
    assert.equal(d.tie, true);
    assert.equal(d.leftPercent, 50);
    assert.equal(d.strength, '均衡');
    assert.equal(api.evidence(answers, d.key).length, 0);
  });
  answers[0] = 1;
  const close = api.score(answers).dimensions[0];
  assert.equal(close.tie, false);
  assert.equal(close.strength, '倾向较弱');
  // 50 + 1 / 48 * 100 = 52.083..., rounded to 52.
  assert.equal(close.leftPercent, 52);
});

test('reverse scoring and explanation evidence reflect the actual selected answer', () => {
  assert.ok(api, 'scoring must exist');
  const answers = Array(48).fill(0);
  const reverse = api.questions.findIndex(q => q.dim === 'EI' && q.direction === -1);
  answers[reverse] = -2;
  const dim = api.score(answers).dimensions[0];
  assert.equal(dim.letter, 'E');
  assert.equal(dim.raw, 2);
  const evidence = api.evidence(answers, 'EI');
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].index, reverse);
  assert.equal(evidence[0].answer, -2);
  assert.equal(evidence[0].letter, 'E');
});

test('incomplete and invalid answers cannot produce a result', () => {
  assert.ok(api, 'scoring must exist');
  for (const bad of [[], Array(48).fill(null), Array(48).fill(4), Array(48).fill('1'), Array(47).fill(0)]) {
    assert.throws(() => api.score(bad));
  }
});

test('saved progress is validated and incomplete completion flags are discarded', () => {
  assert.ok(api, 'progress validation must exist');
  assert.equal(api.restore('{invalid'), null);
  assert.equal(api.restore(JSON.stringify({version: 2, answers: []})), null);
  const answers = Array(48).fill(null); answers[0] = 2;
  const restored = api.restore(JSON.stringify({version: 1, answers, index: 47, completed: true}));
  assert.equal(restored.index, 1);
  assert.equal(restored.completed, false);
  assert.equal(restored.answers[0], 2);
  const complete = api.restore(JSON.stringify({version: 1, answers: Array(48).fill(0), index: 47, completed: true}));
  assert.equal(complete.completed, true);
});
