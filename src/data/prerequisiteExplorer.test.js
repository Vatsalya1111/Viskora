import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrerequisitePath } from './prerequisiteExplorer.js';

test('builds a substitution path with a changed-bounds prerequisite from actual steps', () => {
  const nodes = buildPrerequisitePath({
    question: 'Evaluate the definite integral',
    steps: ['u=3x-2', '\\int_1^2 f(x)dx = \\int_1^4 f(u)du'],
  });
  assert.deepEqual(nodes.map(node => node.id), ['algebra', 'substitution', 'bounds', 'antiderivative', 'current']);
});

test('builds a quotient-rule path for a differentiated quotient', () => {
  const nodes = buildPrerequisitePath({ question: 'Differentiate y=x^3/(3x+5)' });
  assert.ok(nodes.some(node => node.id === 'quotient'));
  assert.equal(nodes.at(-1).id, 'current');
});

test('returns no invented path for an unsupported topic without prerequisite data', () => {
  assert.deepEqual(buildPrerequisitePath({ question: 'Prove this topology theorem' }), []);
});

test('uses supplied knowledge-base concepts when question inference is unavailable', () => {
  const nodes = buildPrerequisitePath({ prerequisites: [{ name: 'Vector spaces', explanation: 'Check closure.' }] });
  assert.equal(nodes[0].title, 'Vector spaces');
  assert.equal(nodes[0].explanation, 'Check closure.');
});
