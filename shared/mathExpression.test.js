import test from 'node:test';
import assert from 'node:assert/strict';
import { compileMathExpression, validateVisualization } from './mathExpression.js';

test('evaluates arithmetic expressions and powers without dynamic code execution', () => {
  const fn = compileMathExpression('(x^3)/(3*x+5)');
  assert.ok(Math.abs(fn(1) - 0.125) < 1e-12);
  assert.throws(() => compileMathExpression('globalThis.process.exit()'));
});

test('accepts a derivative visualization only when the derivative matches numerically', () => {
  const good = validateVisualization({ kind: 'function', expression: 'x^3/(3*x+5)', derivative: '(6*x^3+15*x^2)/(3*x+5)^2', lower: 0, upper: 4, verified: true });
  assert.ok(good);
  assert.equal(validateVisualization({ kind: 'function', expression: 'x^3', derivative: '3*x', lower: 1, upper: 4, verified: true }), null);
});

test('supports a definite integral visualization with finite bounds', () => {
  const result = validateVisualization({ kind: 'integral', expression: 'x^2', lower: 0, upper: 2, verified: true });
  assert.equal(result.kind, 'integral');
  assert.equal(validateVisualization({ kind: 'integral', expression: 'x^2', lower: 2, upper: 0, verified: true }), null);
});

test('rejects visualizations not marked as verified or outside the safe expression grammar', () => {
  assert.equal(validateVisualization({ kind: 'function', expression: 'x', derivative: '1', verified: false }), null);
  assert.equal(validateVisualization({ kind: 'function', expression: 'window.alert(1)', derivative: '1', lower: -1, upper: 1, verified: true }), null);
});
