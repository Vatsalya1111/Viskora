import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSubmission, transcribeImage } from './analysis.js';

test('recognizes a valid product-rule derivative', () => {
  const result = analyzeSubmission({ question: 'Differentiate y = x^2 sin(x)', text: 'dy/dx = 2x sin(x) + x^2 cos(x)' });
  assert.equal(result.analysisStatus, 'no_error');
  assert.equal(result.problem.methods[0].steps[0].verdict, 'correct');
});

test('flags the omitted product-rule term and offers a correction', () => {
  const result = analyzeSubmission({ question: 'Differentiate y = x^2 sin(x)', text: 'dy/dx = 2x cos(x)' });
  assert.equal(result.analysisStatus, 'error_found');
  assert.equal(result.problem.methods[0].steps[0].verdict, 'wrong');
  assert.match(result.problem.methods[0].correctAnswer, /2x sin/);
});

test('highlights an earlier invalid derivative transition even if later corrected', () => {
  const result = analyzeSubmission({ question: 'Differentiate y = x^2 sin(x)', text: 'dy/dx = 2x cos(x)\nTherefore dy/dx = 2x sin(x) + x^2 cos(x)' });
  assert.equal(result.analysisStatus, 'error_found');
  assert.equal(result.verification.firstInvalidTransition, 0);
});

test('accepts reordered equivalent product-rule terms', () => {
  const result = analyzeSubmission({ question: 'Differentiate y = x^2 sin(x)', text: 'x^2 cos(x) + 2x sin(x)' });
  assert.equal(result.analysisStatus, 'no_error');
});

test('verifies the uploaded linear-over-linear quotient derivative', () => {
  const result = analyzeSubmission({ question: 'Differentiate y = (3x - 2)/(5 - 4x)', text: 'dy/dx = 7/(5 - 4x)^2' });
  assert.equal(result.analysisStatus, 'no_error');
});

test('extracts the quotient question when it was included in the transcription field', () => {
  const result = analyzeSubmission({ text: 'Differentiate y = (3x - 2)/(5 - 4x)\ndy/dx = 7/(5 - 4x)^2' });
  assert.equal(result.analysisStatus, 'no_error');
  assert.match(result.problem.displayText, /Differentiate/);
});

test('accepts an equivalent quotient derivative with a sign-reversed denominator', () => {
  const result = analyzeSubmission({ question: 'Differentiate y = (3x - 2)/(5 - 4x)', text: 'dy/dx = 7/(4x - 5)^2' });
  assert.equal(result.analysisStatus, 'no_error');
});

test('flags an incorrect constant numerator in a quotient derivative', () => {
  const result = analyzeSubmission({ question: 'Differentiate y = (3x - 2)/(5 - 4x)', text: 'dy/dx = 11/(5 - 4x)^2' });
  assert.equal(result.analysisStatus, 'error_found');
  assert.equal(result.problem.methods[0].correctAnswer, '7/(5-4x)^2');
});

test('verifies the OCR LaTeX form of a quotient over a square root', () => {
  const result = analyzeSubmission({
    question: 'Differentiate $y=\\frac{3x-2}{\\sqrt{5-4x}}$ with respect to $x$.',
    text: 'y = (3x - 2)/sqrt(5 - 4x)\ndy/dx = ((5 - 4x)^(1/2)(3) - (3x - 2)(1/2)(5 - 4x)^(-1/2)(-4))/((5 - 4x)^(1/2))^2\ndy/dx = (11 - 6x)/(5 - 4x)^(3/2)',
  });
  assert.equal(result.analysisStatus, 'no_error');
  assert.match(result.problem.latex, /\\text\{Differentiate/);
});

test('verifies a LaTeX final answer with a three-halves denominator power', () => {
  const result = analyzeSubmission({
    question: 'Differentiate $y=\\frac{3x-2}{\\sqrt{5-4x}}$ with respect to $x$.',
    text: 'dy/dx = \\frac{11-6x}{(5-4x)^{3/2}}',
  });
  assert.equal(result.analysisStatus, 'no_error');
});

test('ignores OCR LaTeX answer annotations in the final line', () => {
  const result = analyzeSubmission({
    question: 'Differentiate $y=\\frac{3x-2}{\\sqrt{5-4x}}$ with respect to $x$.',
    text: 'dy/dx = \\frac{11-6x}{\\left(5-4x\\right)^{3/2}} \\quad (\\text{ans})',
  });
  assert.equal(result.analysisStatus, 'no_error');
});

test('verifies OCR that writes the three-halves power as a LaTeX fraction', () => {
  const result = analyzeSubmission({
    question: 'Differentiate $y=\\frac{3x-2}{\\sqrt{5-4x}}$ with respect to $x$.',
    text: 'dy/dx = \\frac{11-6x}{(5-4x)^{\\frac{3}{2}}} \\quad (\\text{ans})',
  });
  assert.equal(result.analysisStatus, 'no_error');
});

test('verifies the implicit derivative in the uploaded quadratic equation', () => {
  const result = analyzeSubmission({
    question: 'x^2 - xy - y^2 = 8',
    text: "2x - (y + xy') - 2yy' = 0\n-xy' - 2yy' = y - 2x\ny' = \\frac{y-2x}{-x-2y}",
  });
  assert.equal(result.analysisStatus, 'no_error');
});

test('flags an incorrect final implicit derivative for the uploaded quadratic equation', () => {
  const result = analyzeSubmission({ question: 'x^2 - xy - y^2 = 8', text: "y' = (y + 2x)/(x + 2y)" });
  assert.equal(result.analysisStatus, 'error_found');
});

test('does not classify unsupported math as correct or incorrect', () => {
  const result = analyzeSubmission({ question: 'Find the Laplace transform of a function', text: 'L{f(t)} = ...' });
  assert.equal(result.analysisStatus, 'uncertain');
  assert.equal(result.problem.methods[0].steps[0].verdict, 'uncertain');
});

test('rejects an empty submission', () => {
  assert.throws(() => analyzeSubmission({}), /solution step/);
  assert.throws(() => analyzeSubmission({ question: 'Differentiate y = (3x - 2)/(5 - 4x)' }), /solution step/);
});

test('reports missing vision credentials instead of inventing a transcription', async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try { await assert.rejects(transcribeImage({ image: 'AA==', mimeType: 'image/png' }), /configure GEMINI_API_KEY/); }
  finally { if (previous !== undefined) process.env.GEMINI_API_KEY = previous; }
});
