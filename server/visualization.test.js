import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVisualizationFromQuestion } from './analysis.js';
import { transcriptionNeedsConfirmation } from './index.js';

test('builds a graph spec from a supported typed differentiation problem', () => {
  const spec = buildVisualizationFromQuestion(`Differentiate y = x${String.fromCodePoint(0x00b2)} sin(x) with respect to x`);
  assert.equal(spec?.kind, 'function');
  assert.equal(spec?.expression, 'x^2*sin(x)');
});

test('uses the newly submitted function instead of stale graph data', () => {
  const first = buildVisualizationFromQuestion('Differentiate y=x^2');
  const next = buildVisualizationFromQuestion('Differentiate y=2*x+1');
  assert.notEqual(first.expression, next.expression);
  assert.equal(next.expression, '2*x+1');
});

test('detects and preserves the rational function domain exclusion', () => {
  const spec = buildVisualizationFromQuestion('Differentiate y=x^3/(3*x+5) with respect to x');
  assert.equal(spec?.expression, 'x^3/(3*x+5)');
  assert.ok(Math.abs(spec.excludedValues[0] + 5 / 3) < 1e-10);
});

test('rejects malformed or unsupported expressions rather than graphing them', () => {
  assert.equal(buildVisualizationFromQuestion('Differentiate y=window.alert(1)'), null);
  assert.equal(buildVisualizationFromQuestion('Differentiate y=\\sqrt?'), null);
});

test('does not create analysis from an image transcription that needs confirmation', () => {
  assert.equal(transcriptionNeedsConfirmation({ question: '37)', steps: ['line 1'], confidence: 0.95, unclear: false }), true);
  assert.equal(transcriptionNeedsConfirmation({ question: 'Differentiate y=x^2', steps: ['dy/dx=2x'], confidence: 0.95, unclear: false }), false);
});
