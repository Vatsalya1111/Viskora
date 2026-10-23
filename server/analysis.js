import { validateVisualization } from '../shared/mathExpression.js';

const normalize = (value) => String(value || '').toLowerCase()
  .replace(/\\(?:left|right)/g, '').replace(/\\(?:,|;|!)/g, '')
  .replace(/\\(?:cdot|times)/g, '*').replace(/\\(?:sin|cos|tan)/g, (m) => m.slice(1))
  .replace(/[{}\s$]/g, '').replace(/\\(?:frac)\s*/g, 'frac');

function stepsFromText(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim())
    .filter(Boolean).map((line) => line.replace(/^step\s*\d+\s*[:.)-]?\s*/i, ''));
}

function questionForDisplay(question) {
  return String(question).replace(/\$/g, '')
    .replace(/^\s*Differentiate\s+/i, '\\text{Differentiate } ')
    .replace(/\s+with respect to\s+/i, '\\text{ with respect to } ')
    .replace(/\s+$/, '');
}

function inferMathTopic(question, text) {
  const source = `${question}\n${text}`.toLowerCase();
  if (/\b(matrix|matrices|row.?echelon|gaussian elimination|determinant|eigenvalue|eigenvector|linear system|augmented matrix)\b|\\begin\{(?:bmatrix|pmatrix|matrix|array)\}|\b\d+\s*&\s*[-+]?\d+\s*&\s*[-+]?\d+/.test(source)) return 'Linear Algebra';
  if (/\b(laplace|inverse laplace|transform)\b/.test(source)) return 'Laplace Transforms';
  if (/\b(integrat\w*|antiderivative|substitution)\b|\\int|∫|\\intop/.test(source)) return 'Integration';
  if (/\b(differentiat\w*|derivative|dy\s*\/\s*dx|d\s*\/\s*dx)\b|\\frac\s*\{\s*d\s*y?\s*\}\s*\{\s*d\s*x\s*\}|[a-z]\s*['′]/.test(source)) return 'Differentiation';
  if (/\b(limit|continuity|convergen\w*|series|sequence)\b/.test(source)) return 'Calculus';
  if (/\b(vector|scalar product|dot product|cross product|gradient|divergence|curl)\b/.test(source)) return 'Vector Calculus';
  return 'Other';
}
function parseLinear(value) {
  const terms = String(value).replace(/[()\s*]/g, '').match(/[+-]?[^+-]+/g) || [];
  let x = 0; let constant = 0;
  for (const term of terms) {
    if (term.endsWith('x')) {
      const coefficient = term.slice(0, -1);
      x += coefficient === '' || coefficient === '+' ? 1 : coefficient === '-' ? -1 : Number(coefficient);
    } else constant += Number(term);
  }
  return Number.isFinite(x) && Number.isFinite(constant) ? { x, constant } : null;
}

function verifySquareRootQuotient(question, steps) {
  const latex = question.match(/\\(?:d?frac)\{([^{}]+)\}\{\\sqrt\{([^{}]+)\}\}/i);
  const plain = question.match(/\(([^()]+)\)\s*\/\s*sqrt\s*\(([^()]+)\)/i);
  const source = latex || plain;
  if (!/(differentiat|derivative|dy\s*\/\s*dx|d\s*\/\s*dx)/i.test(question) || !source) return null;
  if (!steps.length) return { status: 'uncertain', reason: 'Provide at least one derivative step.' };
  const numerator = parseLinear(source[1]);
  const denominator = parseLinear(source[2]);
  if (!numerator || !denominator || denominator.x === 0) return { status: 'uncertain', reason: 'This square-root quotient is outside the supported linear-over-square-root check.' };
  const expected = { x: numerator.x * denominator.x / 2, constant: numerator.x * denominator.constant - numerator.constant * denominator.x / 2 };
  const finalText = steps.at(-1)
    .replace(/\\(?:left|right)\b/g, '')
    .replace(/\\(?:,|;|!)/g, '')
    .replace(/\\(?:quad|qquad)\b/g, ' ')
    .replace(/\\text\{[^{}]*(?:ans|answer)[^{}]*\}/ig, '')
    .replace(/\((?:ans|answer)\)/ig, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\^\{?\\frac\{3\}\{2\}\}?/ig, '^(3/2)')
    .replace(/\^\{?3\\?\/2\}?/ig, '^(3/2)')
    .replace(/\\(?:d?frac)\{([^{}]+)\}\{\(([^{}]+)\)\^(?:\{?3\/2\}?|\(3\/2\))\}/i, '$1/($2)^(3/2)')
    .replace(/[{}$\\\s]/g, '').split('=').at(-1);
  const result = finalText.match(/^(.+)\/\(([^()]+)\)\^\(?3\/2\)?$/i);
  if (!result) return { status: 'uncertain', reason: 'I can only verify a linear numerator over a linear expression to the three-halves power for this square-root quotient.' };
  const actualNumerator = parseLinear(result[1]);
  const actualDenominator = parseLinear(result[2]);
  if (!actualNumerator || !actualDenominator) return { status: 'uncertain', reason: 'The final derivative could not be parsed reliably.' };
  const scale = actualDenominator.x / denominator.x;
  const equivalentDenominator = scale > 0 && Math.abs(actualDenominator.constant - denominator.constant * scale) < 1e-9;
  const multiplier = scale ** 1.5;
  const matches = equivalentDenominator
    && Math.abs(actualNumerator.x - expected.x * multiplier) < 1e-9
    && Math.abs(actualNumerator.constant - expected.constant * multiplier) < 1e-9;
  const expectedNumerator = `${expected.x}x${expected.constant < 0 ? '' : '+'}${expected.constant}`.replace(/^1x/, 'x').replace(/^-1x/, '-x').replace(/\+0$/, '');
  const denominatorText = source[2].replace(/\\(?:left|right)/g, '');
  if (matches) return { status: 'no_error', isVerified: true, reason: 'The final derivative matches the quotient and chain rules.' };
  if (equivalentDenominator) return {
    status: 'error_found', isVerified: true, firstInvalidTransition: steps.length - 1,
    reason: 'The final numerator does not match differentiating the square-root denominator with the chain rule.',
    corrected: `(${expectedNumerator})/(${denominatorText})^(3/2)`, confidence: 'low', evidence: steps.at(-1),
    diagnosis: 'The final line has an arithmetic or chain-rule discrepancy; the submitted work alone does not establish which.',
    prerequisite: { topic: 'Quotient and chain rules', explanation: 'Differentiate the numerator and denominator with the quotient rule, and multiply the derivative of √v by v′/(2√v).' },
    followUpQuestion: 'Differentiate (2x + 1)/√(3x + 2), showing the chain-rule factor.',
  };
  return { status: 'uncertain', reason: 'The final denominator is not equivalent to the submitted square-root denominator raised to the three-halves power.' };
}

function verifyLinearQuotient(question, steps) {
  const q = normalize(question);
  const quotient = q.match(/\(([^()]+)\)\/\(([^()]+)\)/);
  if (!/(differentiat|derivative|dy\/dx|d\/dx)/.test(q) || !quotient) return null;
  if (!steps.length) return { status: 'uncertain', reason: 'Provide at least one derivative step.' };
  const numerator = parseLinear(quotient[1]);
  const denominator = parseLinear(quotient[2]);
  if (!numerator || !denominator || denominator.x === 0) return { status: 'uncertain', reason: 'This quotient is outside the supported linear-over-linear check.' };
  const expectedNumerator = numerator.x * denominator.constant - numerator.constant * denominator.x;
  const rawFinal = normalize(steps.at(-1)).split('=').at(-1).replace(/^(?:dy\/dx|y\'|f\'\(x\)|d\/dx)/, '');
  const result = rawFinal.match(/^([+-]?\d+(?:\.\d+)?)\/\(([^()]+)\)\^2$/);
  if (!result) return { status: 'uncertain', reason: 'I can only verify a final constant-over-linear-squared form for this quotient rule check.' };
  const actualNumerator = Number(result[1]);
  const actualDenominator = parseLinear(result[2]);
  if (!actualDenominator) return { status: 'uncertain', reason: 'The final denominator could not be parsed reliably.' };
  const scale = actualDenominator.x / denominator.x;
  const equivalentDenominator = Math.abs(actualDenominator.constant - denominator.constant * scale) < 1e-9;
  const expectedScaledNumerator = expectedNumerator * scale * scale;
  const common = {
    corrected: `${expectedNumerator}/(${quotient[2]})^2`,
    reason: 'For u/v, use (u′v − uv′)/v². The numerator and denominator were checked against the submitted linear expressions.',
    prerequisite: { topic: 'Quotient rule', explanation: 'For differentiable u and v, (u/v)′ = (u′v − uv′)/v², where v is nonzero.' },
    followUpQuestion: 'Differentiate (3x + 1)/(x − 2) using the quotient rule.',
  };
  if (equivalentDenominator && Math.abs(actualNumerator - expectedScaledNumerator) < 1e-9) return { status: 'no_error', isVerified: true, reason: 'The final derivative matches the quotient rule.' };
  if (equivalentDenominator) return {
    status: 'error_found', isVerified: true, firstInvalidTransition: steps.length - 1,
    ...common, confidence: 'low', evidence: steps.at(-1),
    diagnosis: 'The final numerator does not match the quotient-rule calculation. This alone cannot distinguish a rule misunderstanding from an arithmetic slip.',
  };
  return { status: 'uncertain', reason: 'The final denominator is not equivalent to the submitted denominator squared.' };
}

function verifyProductRule(question, steps) {
  const q = normalize(question);
  if (!/(differentiat|derivative|dy\/dx|d\/dx)/.test(q) || !/x\^?2sin\(?x\)?/.test(q)) return null;
  if (steps.length < 1) return { status: 'uncertain', reason: 'Provide the original expression and at least one derivative step.' };
  const candidates = steps.map((step, index) => ({ index, value: normalize(step) }));
  const invalid = candidates.find(({ value }) => /(?:dy\/dx|y\'|f\'|d\/dx)/.test(value) && (/2xcos\(?x\)?/.test(value) || /x\^?2sin\(?x\)?/.test(value)));
  const candidate = candidates.at(-1).value.split('=').at(-1).replace(/^(?:dy\/dx|y\'|f\'\(x\)|d\/dx)/, '');
  const validForms = [
    '2xsin(x)+x^2cos(x)', 'x^2cos(x)+2xsin(x)',
    '2*x*sin(x)+x^2*cos(x)', 'x^2*cos(x)+2*x*sin(x)',
  ].map(normalize);
  if (invalid) {
    return {
      status: 'error_found', isVerified: true, firstInvalidTransition: invalid.index,
      reason: 'For u=x² and v=sin(x), the derivative is u′v + uv′; both factors contribute.',
      corrected: '2x sin(x) + x^2 cos(x)',
      diagnosis: 'The written result is consistent with omitting one product-rule term. A single step cannot establish whether this is a misconception or an execution slip.',
      confidence: 'low', evidence: steps.at(-1),
      prerequisite: { topic: 'Product rule', explanation: 'For differentiable u and v, (uv)′ = u′v + uv′. Here that gives 2x sin(x) + x² cos(x).' },
      followUpQuestion: 'Differentiate x^3 cos(x), showing both product-rule terms.',
      practice: [`Differentiate x^3 sin(x).`, `Differentiate x cos(x).`],
    };
  }
  if (validForms.includes(candidate)) return { status: 'no_error', isVerified: true, reason: 'The product rule is applied correctly.' };
  return { status: 'uncertain', isVerified: false, reason: 'This expression is outside the reliable symbolic checks currently supported.' };
}

function parseLinearXY(value) {
  const terms = String(value).replace(/[()\s*]/g, '').match(/[+-]?[^+-]+/g) || [];
  const result = { x: 0, y: 0, constant: 0 };
  for (const term of terms) {
    const variable = /[xy]/i.exec(term)?.[0]?.toLowerCase();
    if (!variable) result.constant += Number(term);
    else {
      const coefficient = term.replace(variable, '');
      result[variable] += coefficient === '' || coefficient === '+' ? 1 : coefficient === '-' ? -1 : Number(coefficient);
    }
  }
  return Object.values(result).every(Number.isFinite) ? result : null;
}

function verifyImplicitQuadratic(question, steps) {
  const q = normalize(question).replace(/\\(?:text|mathrm)\{([^{}]*)\}/g, '$1');
  if (!/^x\^2-xy-y\^2=\d+(?:\.\d+)?$/.test(q)) return null;
  const final = steps.at(-1).replace(/\\(?:left|right)\b/g, '')
    .replace(/\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}/i, '($1)/($2)')
    .replace(/[${}\\\s]/g, '').replace(/(?:dy\/dx|y')=/ig, '').replace(/^y'=/i, '');
  const quotient = final.match(/^\(?([^/()]+)\)?\/\(?([^/()]+)\)?$/);
  if (!quotient) return { status: 'uncertain', isVerified: false, reason: 'I can check the final implicit derivative for x² − xy − y² = a constant, but could not parse its numerator and denominator.' };
  const numerator = parseLinearXY(quotient[1]);
  const denominator = parseLinearXY(quotient[2]);
  if (!numerator || !denominator) return { status: 'uncertain', isVerified: false, reason: 'The final implicit derivative could not be parsed reliably.' };
  const actual = [numerator.x, numerator.y, numerator.constant, denominator.x, denominator.y, denominator.constant];
  const expected = [-2, 1, 0, -1, -2, 0]; // y' = (y - 2x)/(-x - 2y)
  const pivot = expected.findIndex(value => Math.abs(value) > 1e-9);
  const scale = actual[pivot] / expected[pivot];
  const matches = Number.isFinite(scale) && expected.every((value, index) => Math.abs(actual[index] - value * scale) < 1e-9);
  if (matches) return { status: 'no_error', isVerified: true, reason: 'Implicit differentiation gives (2x − y)/(x + 2y), equivalent to the submitted derivative.' };
  return {
    status: 'error_found', isVerified: true, firstInvalidTransition: steps.length - 1,
    reason: 'The final derivative does not match implicit differentiation of x² − xy − y² = 8.',
    corrected: '(y - 2x)/(-x - 2y)', confidence: 'low', evidence: steps.at(-1),
  };
}

export function analyzeSubmission({ question = '', text = '', image = null }) {
  const steps = stepsFromText(text);
  let problem = question.trim();
  if (!problem) {
    const embeddedQuestionIndex = steps.findIndex(line => /(?:differentiat|derivative|dy\s*\/\s*dx|d\s*\/\s*dx)/i.test(line) && /\([^()]+\)\s*\/\s*\([^()]+\)/.test(line));
    if (embeddedQuestionIndex >= 0) problem = steps.splice(embeddedQuestionIndex, 1)[0];
  }
  if (!problem && steps.length && /\([^()]+\)\s*\/\s*\([^()]+\)/.test(steps[0])) problem = `Differentiate ${steps[0]}`;
  if (!steps.length) throw Object.assign(new Error('Add at least one solution step in the Transcription box before analysing.'), { statusCode: 400 });
  const verification = verifySquareRootQuotient(problem, steps) || verifyLinearQuotient(problem, steps) || verifyProductRule(problem, steps) || verifyImplicitQuadratic(problem, steps) || {
    status: 'uncertain', isVerified: false,
    reason: 'I could not match this submission to a supported check. Put the full problem in Question and each solution line in Transcription.',
  };
  const concept = inferMathTopic(problem, steps.join('\n'));
  const mapped = steps.map((value, index) => ({
    id: `submitted-${index + 1}`, latex: value,
    verdict: verification?.status === 'error_found' && index === verification.firstInvalidTransition ? 'wrong'
      : verification?.status === 'no_error' ? 'correct' : 'uncertain',
    note: verification?.status === 'error_found' && index === verification.firstInvalidTransition ? verification.reason
      : verification?.status === 'no_error' ? verification.reason : verification?.reason || 'Not verified by the supported symbolic checks.',
  }));
  return {
    id: `attempt-${Date.now()}`, studentId: 'student', topic: 'Mathematics', concept,
    problem: { id: `problem-${Date.now()}`, latex: questionForDisplay(problem || 'Transcribed working'), displayText: problem || 'Transcribed working', methods: [{
      id: `method-${Date.now()}`, label: 'Submitted solution', steps: mapped,
      correctAnswer: verification?.corrected || '', confidence: verification?.confidence || null,
      misconceptionId: null, diagnosis: verification?.diagnosis || null, diagnosisEvidence: verification?.evidence || null,
      prerequisites: verification?.prerequisite ? [{ id: 'product-rule', name: verification.prerequisite.topic, explanation: verification.prerequisite.explanation, status: 'needs-review' }] : [],
      followUpQuestion: verification?.followUpQuestion || null,
      practiceQuestions: verification?.practice || [],
      verificationReason: verification?.reason || null,
      verificationStatus: verification?.status || 'uncertain',
    }] },
    transcriptionChecked: true, transcriptionRaw: [problem, ...steps].filter(Boolean).join('\n'), timestamp: new Date().toISOString(),
    analysisStatus: verification?.status || 'uncertain', verification,
  };
}

export async function transcribeImage({ image, mimeType }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Handwriting recognition is unavailable: configure GEMINI_API_KEY on the server.'), { statusCode: 503 });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [
      { text: 'Read the handwritten mathematics in the image. Do not solve it or invent missing writing. Return one JSON object only, with exactly these fields: question (string, use an empty string if absent), steps (array of strings in written order), confidence (number from 0 to 1), unclear (boolean). Put each complete handwritten line in a separate steps item. Preserve mathematical notation as plain text or LaTeX. Set confidence below 0.65 and unclear=true if any important writing is hard to read.' },
      { inline_data: { mime_type: mimeType, data: image } },
    ] }], generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'minimal' }, maxOutputTokens: 2048 } }),
  });
  if (!response.ok) throw Object.assign(new Error(`Transcription service failed (${response.status}).`), { statusCode: 502 });
  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').filter(Boolean).join('\n');
  try {
    const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let result;
    try { result = JSON.parse(text); }
    catch {
      const first = text.indexOf('{');
      const last = text.lastIndexOf('}');
      if (first < 0 || last <= first) throw new Error('No JSON object in model response.');
      result = JSON.parse(text.slice(first, last + 1));
    }
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Model response was not an object.');
    const question = typeof result.question === 'string' ? result.question.trim() : '';
    const rawSteps = Array.isArray(result.steps) ? result.steps : typeof result.steps === 'string' ? result.steps.split(/\r?\n/) : [];
    const steps = rawSteps.map(step => typeof step === 'string' ? step.trim()
      : step && typeof step === 'object' ? String(step.text || step.latex || '').trim() : '').filter(Boolean);
    const parsedConfidence = typeof result.confidence === 'number' ? result.confidence
      : Number.parseFloat(String(result.confidence || '').replace('%', '')) / (String(result.confidence || '').includes('%') ? 100 : 1);
    const confidence = Number.isFinite(parsedConfidence)
      ? Math.max(0, Math.min(1, parsedConfidence > 1 && parsedConfidence <= 100 ? parsedConfidence / 100 : parsedConfidence))
      : 0.5;
    // A question number (for example "37)") is not a usable problem statement.
    // Ask the student to supply the missing prompt instead of silently treating it as the problem.
    const questionOnlyNumber = /^(?:(?:question|q)\.?\s*)?\d{1,4}\s*[).:]?$/i.test(question);
    return { question, steps, confidence, unclear: result.unclear === true || confidence < 0.65 || !question || questionOnlyNumber || !steps.length };
  } catch {
    throw Object.assign(new Error('The transcription service returned text the app could not read as a question and solution steps. Try again, or enter the question and steps manually.'), { statusCode: 502 });
  }
}

export async function tutorChat(input) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('AI tutor chat is unavailable: configure GEMINI_API_KEY in the project root .env file.'), { statusCode: 503 });
  const context = [
    'You are Viskora, a careful, supportive tutor for university mathematics. Answer the student directly and explain reasoning at an appropriate level. Do not assume their work is correct; verify calculations. If context is insufficient, ask a focused question. Use readable math notation.',
    `Problem: ${input.problem || '(not provided)'}`,
    `Topic: ${input.concept || '(not identified)'}`,
    `Selected step: ${input.step || '(none)'}`,
    `Step status/feedback: ${input.feedback || '(not available)'}`,
    `Recent conversation: ${JSON.stringify((Array.isArray(input.history) ? input.history : []).slice(-8))}`,
    `Student asks: ${input.message || ''}`,
  ].join('\n');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', signal: AbortSignal.timeout(45000), headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: context }] }], generationConfig: { thinkingConfig: { thinkingLevel: 'minimal' }, maxOutputTokens: 700, temperature: 0.3 } }),
  });
  if (!response.ok) throw Object.assign(new Error(`AI tutor request failed (${response.status}).`), { statusCode: 502 });
  const data = await response.json();
  const answer = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
  if (!answer) throw Object.assign(new Error('AI tutor returned an empty response. Please retry.'), { statusCode: 502 });
  return answer;
}

export function buildVisualizationFromQuestion(question) {
  const normalizedQuestion = normalize(question).replace(/\\(?:text|mathrm)\{([^{}]*)\}/g, '$1');
  const implicitQuadratic = normalizedQuestion.match(/^x\^2-xy-y\^2=(-?\d+(?:\.\d+)?)$/);
  if (implicitQuadratic) {
    const constant = Number(implicitQuadratic[1]);
    const discriminant = `5*x^2-4*(${constant})`;
    const extent = Math.max(5, Math.sqrt(Math.max(0, 4 * constant / 5)) + 3);
    return validateVisualization({ kind: 'implicit', equation: `x^2-xy-y^2=${constant}`, upperBranch: `(-x+sqrt(${discriminant}))/2`, lowerBranch: `(-x-sqrt(${discriminant}))/2`, lower: -extent, upper: extent, verified: true });
  }
  let source = String(question || '').replace(/\$/g, '').replace(/\\text\{[^}]*\}/gi, ' ');
  const match = source.match(/(?:y|f\s*\(\s*x\s*\))\s*=\s*(.+?)(?=\s*(?:with\s+respect\s+to|,|$))/i);
  if (!match) return null;
  let expression = match[1].replace(/\\(?:left|right)\b/g, '');
  for (let i = 0; i < 8; i++) {
    const next = expression.replace(/\\(?:d?frac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/gi, '(($1)/($2))');
    if (next === expression) break;
    expression = next;
  }
  expression = expression
    .replace(/\\sqrt\s*\{([^{}]*)\}/gi, 'sqrt($1)')
    .replace(/\\(sin|cos|tan|exp|log)\s*([a-z0-9]+)/gi, '$1($2)')
    .replace(/\\(sin|cos|tan|exp|log)\b/gi, '$1')
    .replace(/\\(?:cdot|times)/g, '*')
    .replace(/([a-z0-9)])([\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207b\u207a]+)/g, (_, base, power) => `${base}^${[...power].map(char => ({8304:"0",185:"1",178:"2",179:"3",8308:"4",8309:"5",8310:"6",8311:"7",8312:"8",8313:"9",8315:"-",8314:"+"})[char.codePointAt(0)]).join("")}`)
    .replace(/[{}]/g, '')
    .replace(/[\u00d7\u00b7]/g, "*").replace(/[\u2212\u2013]/g, "-")
    .replace(/\s+/g, '')
    .replace(/(\d)(x|sin|cos|tan|exp|log|sqrt|\()/gi, '$1*$2')
    .replace(/(x|\))(?=(x|\(|sin|cos|tan|exp|log|sqrt))/gi, '$1*')
    ;
  const excludedValues = [];
  for (const denominator of expression.matchAll(/\/\(([^()]*)\)/g)) {
    const linear = denominator[1].match(/^([+-]?(?:\d+(?:\.\d+)?)?)\*?x(?:([+-])(\d+(?:\.\d+)?))?$/i);
    if (!linear) continue;
    const coefficient = linear[1] === '' || linear[1] === '+' ? 1 : linear[1] === '-' ? -1 : Number(linear[1]);
    const constant = linear[3] ? Number(`${linear[2]}${linear[3]}`) : 0;
    if (coefficient !== 0) excludedValues.push(-constant / coefficient);
  }
  return validateVisualization({ kind: 'function', expression, lower: -5, upper: 5, excludedValues, verified: true });
}

async function getCheckedVisualization(question, text) {
  const fallback = buildVisualizationFromQuestion(question);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: [
        'Return JSON only with a visualization for this mathematically verified-correct solution. For differentiation, use the exact original function and its derivative. For definite integration, use the exact integrand and bounds. Only use expressions supported by arithmetic, x, sin, cos, tan, exp, log, sqrt, parentheses, and explicit *; otherwise return null.',
        'Schema: {"visualization":{"kind":"function|integral","expression":"...","derivative":"...","lower":-5,"upper":5,"verified":true}} or {"visualization":null}. Do not invent a graph or silently change the question. For functions, independently verify the derivative.',
        `Problem: ${question || '(not stated)'}`,
        `Student work: ${text || '(not available)'}`,
      ].join('\n') }] }], generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'minimal' }, maxOutputTokens: 350 } }),
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    const parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    return validateVisualization(parsed.visualization) || fallback;
  } catch { return fallback; }
}

export async function verifyAttemptWithAI(attempt, { question, text }) {
  // Keep exact, independently computed checks authoritative. Ask Gemini only
  // for an optional graph when one of these checks proves the work correct.
  if (attempt.verification?.isVerified === true && ['no_error', 'error_found'].includes(attempt.verification.status)) {
    const method = attempt.problem.methods[0];
    if (attempt.verification.status === 'no_error') method.visualization = await getCheckedVisualization(question, text);
    else if (method.correctAnswer) method.visualization = await getCheckedVisualization(question, `${text}\nVerified corrected answer: ${method.correctAnswer}`);
    return attempt;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('AI math checking is unavailable: configure GEMINI_API_KEY on the server.'), { statusCode: 503 });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: [
      'Review this mathematics solution against the exact submitted problem and steps. Check each transition in order, not just the final answer. The broad subject is Mathematics; infer the actual topic from the question and notation. A matrix or row-reduction problem is Linear Algebra, never Differentiation unless derivatives are actually present.',
      'Do not assume a limited list of supported problem types. Work with the stated subject and notation when you can.',
      'Return one JSON object only: {"topic":"Differentiation|Linear Algebra|Integration|Laplace Transforms|Calculus|Vector Calculus|Other","verdict":"correct|incorrect|uncertain","summary":"short explanation","steps":[{"verdict":"correct|incorrect|uncertain","feedback":"short explanation"}],"firstIncorrectStep":0,"correctedStep":"full corrected replacement for the earliest incorrect line, or empty string","correctedAnswer":"final answer or empty string","confidence":0.0,"prerequisites":[{"name":"concept","explanation":"brief explanation","formula":"LaTeX","example":"LaTeX example"}],"alternativeMethod":{"available":false,"label":"","steps":[],"keyDifference":"","finalAnswer":"","verified":false},"visualization":{"kind":"function|integral","expression":"safe expression using x and explicit *","derivative":"safe derivative expression, function only","lower":-5,"upper":5,"verified":true}}.',
      'The steps array must have one entry per submitted step. Compare each line with the immediately preceding line and find only the earliest invalid transition. A correct line must remain correct even if a later step is wrong. Mark only the earliest invalid step incorrect; mark later dependent steps uncertain unless they contain a separate independent error. For substitutions in definite integrals, calculate the new bounds from the substitution and the original endpoints before judging them. firstIncorrectStep is zero-based; use null if there is no error. correctedStep must replace the earliest incorrect line with a mathematically valid next line, preserving the student’s method; never repeat a prior line as the correction. correctedAnswer is the final result and is separate. Do not call an equivalent unsimplified expression incorrect. If the problem, handwriting, or math is ambiguous, choose uncertain. Check algebra carefully and do not invent missing work.',
      'Also include only directly relevant prerequisites. Offer an alternative method only when it is genuinely distinct, complete, and you have independently checked its steps and final answer; otherwise set available=false. Visualization must describe the actual problem: for differentiation return a supported explicit function and its derivative; for definite integration return its integrand and actual bounds. Use only arithmetic, x, parentheses and explicit multiplication. Set visualization to null if you cannot confidently match the expression to the problem.',
      `Problem: ${question || '(not stated)'}`,
      'Submitted solution steps:',
      ...attempt.problem.methods[0].steps.map((step, index) => `${index + 1}. ${step.latex}`),
      `Transcription supplied: ${text || '(none)'}`,
    ].join('\n') }] }], generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'medium' }, maxOutputTokens: 4096 } }),
  });
  if (!response.ok) throw Object.assign(new Error(`AI math check failed (${response.status}).`), { statusCode: 502 });
  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').filter(Boolean).join('\n') || '';
  let result;
  try {
    const content = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { result = JSON.parse(content); }
    catch { result = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1)); }
  } catch {
    throw Object.assign(new Error('The AI math checker returned a response the app could not read. Please retry.'), { statusCode: 502 });
  }
  const statuses = { correct: 'no_error', incorrect: 'error_found', uncertain: 'uncertain' };
  let status = statuses[String(result.verdict || '').toLowerCase()];
  if (!status) throw Object.assign(new Error('The AI math checker could not provide a clear result. Please retry.'), { statusCode: 502 });
  const method = attempt.problem.methods[0];
  const aiSteps = Array.isArray(result.steps) ? result.steps : [];
  const requestedIndex = Number.isInteger(result.firstIncorrectStep) ? result.firstIncorrectStep : -1;
  const inferredIndex = aiSteps.findIndex(step => /^(incorrect|wrong)$/i.test(String(step?.verdict || '')));
  const reportedErrorIndex = requestedIndex >= 0 && requestedIndex < method.steps.length ? requestedIndex : inferredIndex;
  // Never invent the location of an error when the model fails to identify a step.
  if (status === 'error_found' && reportedErrorIndex < 0) status = 'uncertain';
  // A verdict without a matching per-line review is not enough evidence to grade the work.
  if (status === 'no_error' && (aiSteps.length !== method.steps.length || aiSteps.some(step => !/^(correct|valid-alt)$/i.test(String(step?.verdict || ''))))) status = 'uncertain';
  const aiConfidence = typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : null;
  if (status !== 'uncertain' && (aiConfidence == null || aiConfidence < 0.7)) status = 'uncertain';
  const firstIncorrectStep = status === 'error_found' ? reportedErrorIndex : -1;
  method.steps = method.steps.map((step, index) => {
    const aiStep = aiSteps[index];
    const stepVerdict = String(aiStep?.verdict || '').toLowerCase();
    const verdict = status === 'uncertain' ? 'uncertain'
      : status === 'no_error' ? 'correct'
      : index === firstIncorrectStep ? 'wrong'
          : index < firstIncorrectStep && /^(correct|uncertain)$/.test(stepVerdict) ? stepVerdict : 'uncertain';
    return { ...step, verdict, note: String(aiStep?.feedback || result.summary || step.note || '') };
  });
  method.verificationStatus = status;
  method.verificationReason = String(result.summary || 'AI review completed.');
  method.diagnosis = status === 'error_found' ? method.verificationReason : null;
  method.correctedStep = typeof result.correctedStep === 'string' ? result.correctedStep : '';
  method.correctAnswer = typeof result.correctedAnswer === 'string' ? result.correctedAnswer : '';
  method.prerequisiteConcepts = Array.isArray(result.prerequisites) ? result.prerequisites.filter(item => item && typeof item.name === 'string' && typeof item.explanation === 'string').slice(0, 5) : [];
  const alternative = result.alternativeMethod;
  method.alternativeMethod = alternative?.available === true && alternative.verified === true
    && Array.isArray(alternative.steps) && alternative.steps.length >= 2
    && typeof alternative.finalAnswer === 'string' && alternative.finalAnswer.trim()
    ? { label: String(alternative.label || 'Alternative method'), steps: alternative.steps.map(String).slice(0, 12), keyDifference: String(alternative.keyDifference || ''), finalAnswer: alternative.finalAnswer, aiChecked: true }
    : null;
  method.visualization = validateVisualization(result.visualization);
  if (!method.visualization && status === 'no_error') {
    method.visualization = await getCheckedVisualization(question, text);
  }
  if (!method.visualization && status === 'error_found' && method.correctAnswer) {
    method.visualization = await getCheckedVisualization(question, `${text}\nCorrected answer: ${method.correctAnswer}`);
  }
  const validTopics = new Set(['Differentiation', 'Linear Algebra', 'Integration', 'Laplace Transforms', 'Calculus', 'Vector Calculus', 'Other']);
  if (attempt.concept === 'Other' && validTopics.has(result.topic)) attempt.concept = result.topic;
  method.confidence = aiConfidence;
  attempt.analysisStatus = status;
  attempt.verification = { status, isVerified: status !== 'uncertain', reason: method.verificationReason, firstInvalidTransition: firstIncorrectStep };
  attempt.aiVerified = true;
  return attempt;
}
