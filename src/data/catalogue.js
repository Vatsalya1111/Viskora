/**
 * Viskora – Misconception Catalogue
 * Seeded data for calculus misconceptions.
 * Structure ready for: instructor analytics, real AI replacement.
 */

export const MISCONCEPTION_CATALOGUE = [
  {
    id: 'mc-prod-rule',
    topic: 'Differentiation',
    concept: 'Product rule',
    name: 'Derivative of a product treated as product of derivatives',
    description:
      'Student multiplies the derivatives of each factor instead of applying uv\' + u\'v.',
    typicalWrongForms: [
      "d/dx(f·g) = f'·g'",
      "d/dx(x²·sinx) = 2x·cosx",
    ],
    probingQuestion: 'd/dx (x · x)',
    probingAnswer: '2x',
    probingDistractors: [
      { text: '1 · 1 = 1',  misconceptionId: 'mc-prod-rule', label: 'Product of derivatives' },
      { text: 'x²',          misconceptionId: 'mc-const-mult', label: 'Treats factor as constant' },
      { text: '2x',          misconceptionId: null,            label: 'Correct (via product rule)' },
    ],
    followUp: {
      q2: { expr: 'd/dx (x · eˣ)', answer: 'eˣ + x·eˣ', hint: 'Apply u\'v + uv\' with u=x, v=eˣ' },
      q3: { expr: '∫ x · eˣ dx', answer: 'x·eˣ – eˣ + C', hint: 'Integration by parts — the multiplicative structure reappears.' },
    },
    relatedConcepts: ['Chain rule', 'Integration by parts'],
  },
  {
    id: 'mc-chain-rule',
    topic: 'Differentiation',
    concept: 'Chain rule',
    name: 'Omitting the inner derivative in chain rule',
    description:
      'Student differentiates the outer function but forgets to multiply by the derivative of the inner function.',
    typicalWrongForms: [
      "d/dx(sin(x²)) = cos(x²)",
      "d/dx(e^(3x)) = e^(3x)",
    ],
    probingQuestion: 'd/dx sin(2x)',
    probingAnswer: '2cos(2x)',
    probingDistractors: [
      { text: 'cos(2x)',     misconceptionId: 'mc-chain-rule', label: 'Misses inner derivative' },
      { text: '-cos(2x)',    misconceptionId: 'mc-sign',       label: 'Sign error' },
      { text: '2cos(2x)',    misconceptionId: null,            label: 'Correct' },
    ],
    followUp: {
      q2: { expr: 'd/dx e^(x²)', answer: '2x·e^(x²)', hint: 'Outer: e^u → e^u; inner: x² → 2x' },
      q3: { expr: '∫ cos(3x) dx', answer: 'sin(3x)/3 + C', hint: 'Reverse chain rule: divide by inner derivative.' },
    },
    relatedConcepts: ['Product rule', 'Implicit differentiation'],
  },
  {
    id: 'mc-implicit',
    topic: 'Differentiation',
    concept: 'Implicit differentiation',
    name: 'Forgetting dy/dx when differentiating y',
    description:
      'When differentiating y implicitly, student treats y like a constant and omits the dy/dx factor.',
    typicalWrongForms: [
      "d/dx(y²) = 2y  (missing dy/dx)",
      "d/dx(xy) = y  (missing x·dy/dx term)",
    ],
    probingQuestion: 'd/dx y³',
    probingAnswer: '3y²·(dy/dx)',
    probingDistractors: [
      { text: '3y²',           misconceptionId: 'mc-implicit', label: 'Missing dy/dx' },
      { text: '3y²·y',         misconceptionId: 'mc-prod-rule', label: 'Incorrect product rule' },
      { text: '3y²·(dy/dx)',   misconceptionId: null,           label: 'Correct' },
    ],
    followUp: {
      q2: { expr: 'd/dx (sin y)', answer: 'cos(y)·(dy/dx)', hint: 'Chain rule: outer sin, inner y' },
      q3: { expr: 'Differentiate x² + y² = 25 implicitly', answer: '2x + 2y·(dy/dx) = 0', hint: 'Differentiate each term.' },
    },
    relatedConcepts: ['Chain rule', 'Related rates'],
  },
  {
    id: 'mc-basic-int',
    topic: 'Integration',
    concept: 'Basic integration',
    name: 'Off-by-one error in power rule for integration',
    description:
      'Student adds 1 to the exponent but forgets to divide by the new exponent, or divides by the original exponent.',
    typicalWrongForms: [
      "∫ x³ dx = x⁴  (missing /4)",
      "∫ x³ dx = x⁴/3  (divides by original exponent)",
    ],
    probingQuestion: '∫ x² dx',
    probingAnswer: 'x³/3 + C',
    probingDistractors: [
      { text: 'x³',            misconceptionId: 'mc-basic-int', label: 'Forgot to divide' },
      { text: 'x³/2',          misconceptionId: 'mc-basic-int', label: 'Divided by original exponent' },
      { text: 'x³/3 + C',      misconceptionId: null,           label: 'Correct' },
    ],
    followUp: {
      q2: { expr: '∫ x^(1/2) dx', answer: '(2/3)x^(3/2) + C', hint: 'n=1/2, new exponent = 3/2, divide by 3/2' },
      q3: { expr: 'd/dx (x³/3)', answer: 'x²', hint: 'Verifies the integration — differentiation undoes it.' },
    },
    relatedConcepts: ['Integration by parts', 'Substitution'],
  },
  {
    id: 'mc-laplace-shift',
    topic: 'Laplace transforms',
    concept: 'First shifting theorem',
    name: 'Incorrect application of the first shifting theorem',
    description:
      'Student confuses L{e^(at)f(t)} = F(s-a) with F(s+a), getting the wrong sign in the s-domain shift.',
    typicalWrongForms: [
      "L{e^(2t)sin(3t)} = 3/((s+2)²+9)",
      "L{e^(-t)t} = 1/(s+1)² (uses +1 instead of -(-1)=+1 — sign confusion for negative exponents)",
    ],
    probingQuestion: 'L{e^(3t)}',
    probingAnswer: '1/(s-3)',
    probingDistractors: [
      { text: '1/(s+3)',  misconceptionId: 'mc-laplace-shift', label: 'Wrong sign shift' },
      { text: '3/(s²+9)', misconceptionId: 'mc-laplace-trig',  label: 'Confused with sine transform' },
      { text: '1/(s-3)',  misconceptionId: null,               label: 'Correct' },
    ],
    followUp: {
      q2: { expr: 'L{e^(-2t)cos(4t)}', answer: '(s+2)/((s+2)²+16)', hint: 'Replace s with (s+2) in L{cos(4t)}' },
      q3: { expr: 'L⁻¹{ 1/(s-1)² }', answer: 't·eᵗ', hint: 'Inverse first shift: F(s-1) → e^t·f(t) where F(s)=1/s²' },
    },
    relatedConcepts: ['Inverse Laplace', 'Partial fractions'],
  },
];

/** Seeded attempts (the screenshot example + a few more) */
export const SEEDED_ATTEMPTS = [
  {
    id: 'attempt-001',
    studentId: 'stu-demo',
    topic: 'Differentiation',
    concept: 'Product rule',
    problem: {
      id: 'prob-001',
      latex: '\\text{Find }\\dfrac{dy}{dx}\\text{ if }y = x^2 \\sin x',
      displayText: 'Find dy/dx if y = x² sin x',
      methods: [
        {
          id: 'method-product',
          label: 'Method 1: Product rule',
          steps: [
            { id: 's1', latex: 'y = x^2 \\sin x', verdict: 'correct', note: 'Restates the function correctly.' },
            { id: 's2', latex: "y' = 2x \\cos x",  verdict: 'wrong',   note: 'Differentiates each factor separately and multiplies — the classic product-rule misconception.' },
          ],
          correctAnswer: "y' = 2x \\sin x + x^2 \\cos x",
          misconceptionId: 'mc-prod-rule',
          confidence: 'medium',
        },
        {
          id: 'method-log',
          label: 'Method 2: Log differentiation',
          steps: [
            { id: 's1', latex: '\\ln y = 2\\ln x + \\ln(\\sin x)', verdict: 'correct', note: 'Taking log of both sides.' },
            { id: 's2', latex: '\\dfrac{1}{y}y\' = \\dfrac{2}{x} + \\dfrac{\\cos x}{\\sin x}', verdict: 'correct', note: 'Implicit differentiation applied correctly.' },
            { id: 's3', latex: "y' = y\\left(\\dfrac{2}{x} + \\cot x\\right)", verdict: 'correct', note: 'Multiply back by y.' },
            { id: 's4', latex: "y' = x^2 \\sin x\\left(\\dfrac{2}{x} + \\cot x\\right)", verdict: 'correct', note: 'Substitute y = x²sinx.' },
          ],
          correctAnswer: "y' = 2x \\sin x + x^2 \\cos x",
          misconceptionId: null,
          confidence: null,
        },
      ],
    },
    uploadedImageUrl: null, // Will be replaced by real upload
    transcriptionChecked: false,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'attempt-002',
    studentId: 'stu-demo',
    topic: 'Differentiation',
    concept: 'Chain rule',
    problem: {
      id: 'prob-002',
      latex: '\\text{Find }\\dfrac{d}{dx}\\sin(x^2)',
      displayText: 'Find d/dx sin(x²)',
      methods: [
        {
          id: 'method-chain',
          label: 'Method 1: Chain rule',
          steps: [
            { id: 's1', latex: '\\text{Let } u = x^2', verdict: 'correct', note: 'Correct substitution.' },
            { id: 's2', latex: '\\dfrac{d}{dx}\\sin(u) = \\cos(u)', verdict: 'wrong', note: 'Forgot to multiply by du/dx = 2x.' },
          ],
          correctAnswer: '2x\\cos(x^2)',
          misconceptionId: 'mc-chain-rule',
          confidence: 'high',
        },
      ],
    },
    uploadedImageUrl: null,
    transcriptionChecked: false,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'attempt-003',
    studentId: 'stu-demo',
    topic: 'Differentiation',
    concept: 'Implicit differentiation',
    problem: {
      id: 'prob-003',
      latex: '\\text{Differentiate } x^2 + y^2 = 25 \\text{ implicitly}',
      displayText: 'Differentiate x² + y² = 25 implicitly',
      methods: [
        {
          id: 'method-implicit',
          label: 'Method 1: Implicit differentiation',
          steps: [
            { id: 's1', latex: '2x + 2y = 0', verdict: 'wrong', note: 'Forgot dy/dx when differentiating y².' },
          ],
          correctAnswer: '2x + 2y\\cdot\\dfrac{dy}{dx} = 0',
          misconceptionId: 'mc-implicit',
          confidence: 'high',
        },
      ],
    },
    uploadedImageUrl: null,
    transcriptionChecked: false,
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'attempt-004',
    studentId: 'stu-demo',
    topic: 'Laplace transforms',
    concept: 'First shifting theorem',
    problem: {
      id: 'prob-004',
      latex: '\\text{Find } \\mathcal{L}\\{e^{2t}\\sin(3t)\\}',
      displayText: 'Find L{e^(2t)sin(3t)}',
      methods: [
        {
          id: 'method-shift',
          label: 'Method 1: First shifting theorem',
          steps: [
            { id: 's1', latex: '\\mathcal{L}\\{\\sin(3t)\\} = \\dfrac{3}{s^2 + 9}', verdict: 'correct', note: 'Standard Laplace of sin.' },
            { id: 's2', latex: '\\mathcal{L}\\{e^{2t}\\sin(3t)\\} = \\dfrac{3}{(s+2)^2 + 9}', verdict: 'wrong', note: 'Used s+2 instead of s-2 (first shift replaces s with s-a, not s+a).' },
          ],
          correctAnswer: '\\dfrac{3}{(s-2)^2 + 9}',
          misconceptionId: 'mc-laplace-shift',
          confidence: 'medium',
        },
      ],
    },
    uploadedImageUrl: null,
    transcriptionChecked: false,
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
].map(attempt => ({ ...attempt, isExample: true }));

/** Prerequisite data per concept */
export const PREREQUISITES = {
  'mc-prod-rule': [
    { id: 'pr-1', name: 'Product rule',            status: 'needs-review', icon: '📐' },
    { id: 'pr-2', name: 'Derivative of xⁿ',        status: 'good',         icon: '✓'  },
    { id: 'pr-3', name: 'Derivatives of trig functions', status: 'good',   icon: '✓'  },
  ],
  'mc-chain-rule': [
    { id: 'pr-1', name: 'Chain rule',               status: 'needs-review', icon: '📐' },
    { id: 'pr-2', name: 'Composite functions',      status: 'needs-review', icon: '📐' },
    { id: 'pr-3', name: 'Derivative of eˣ',         status: 'good',         icon: '✓'  },
  ],
  'mc-implicit': [
    { id: 'pr-1', name: 'Implicit differentiation', status: 'needs-review', icon: '📐' },
    { id: 'pr-2', name: 'Chain rule',               status: 'good',         icon: '✓'  },
    { id: 'pr-3', name: 'Algebraic manipulation',   status: 'good',         icon: '✓'  },
  ],
  'mc-laplace-shift': [
    { id: 'pr-1', name: 'Standard Laplace table',   status: 'good',         icon: '✓'  },
    { id: 'pr-2', name: 'First shifting theorem',   status: 'needs-review', icon: '📐' },
    { id: 'pr-3', name: 'Partial fractions',         status: 'good',         icon: '✓'  },
  ],
  'mc-basic-int': [
    { id: 'pr-1', name: 'Power rule for integration', status: 'needs-review', icon: '📐' },
    { id: 'pr-2', name: 'Exponents & fractions',    status: 'good',         icon: '✓'  },
    { id: 'pr-3', name: 'Constant of integration C', status: 'good',         icon: '✓'  },
  ],
  'Product rule': [
    { id: 'pr-1', name: 'Product rule (uv\' + u\'v)', status: 'needs-review', icon: '📐' },
    { id: 'pr-2', name: 'Power rule (xⁿ)',          status: 'good',         icon: '✓'  },
    { id: 'pr-3', name: 'Trig derivatives',         status: 'good',         icon: '✓'  },
  ],
  'Chain rule': [
    { id: 'pr-1', name: 'Chain rule (inner derivative)', status: 'needs-review', icon: '📐' },
    { id: 'pr-2', name: 'Composite functions f(g(x))', status: 'needs-review', icon: '📐' },
    { id: 'pr-3', name: 'Exponential derivatives',   status: 'good',         icon: '✓'  },
  ],
  'Implicit differentiation': [
    { id: 'pr-1', name: 'Implicit differentiation (dy/dx)', status: 'needs-review', icon: '📐' },
    { id: 'pr-2', name: 'Chain rule',               status: 'good',         icon: '✓'  },
    { id: 'pr-3', name: 'Algebraic isolating terms', status: 'good',         icon: '✓'  },
  ],
  'First shifting theorem': [
    { id: 'pr-1', name: 'Standard Laplace table',   status: 'good',         icon: '✓'  },
    { id: 'pr-2', name: 'Shift in s-domain (s - a)', status: 'needs-review', icon: '📐' },
    { id: 'pr-3', name: 'Linearity property',       status: 'good',         icon: '✓'  },
  ],
};

/** Mastery per concept (0–100) for progress page */
export const INITIAL_MASTERY = {
  'Product rule':               35,
  'Chain rule':                 55,
  'Implicit differentiation':   40,
  'Basic integration':          70,
  'First shifting theorem':     45,
  'Inverse Laplace':            60,
  'Substitution rule':          75,
  'Integration by parts':       30,
};

/** Mock chatbot responses keyed by step verdict + concept */
export const CHATBOT_RESPONSES = {
  'mc-prod-rule': [
    { role: 'user', text: "Why can't I just multiply the derivatives?" },
    { role: 'bot',  text: "Try x · x. Its derivative is 2x, but multiplying the derivatives gives 1 · 1 = 1. The product rule ensures we account for how each factor changes while the other stays fixed." },
    { role: 'user', text: "What's u'v + uv' in words?" },
    { role: 'bot',  text: "\"Rate of first times second, plus first times rate of second.\" You're adding two terms because either piece can be the one changing at any instant." },
  ],
  'mc-chain-rule': [
    { role: 'user', text: "Why do I need to multiply by the inner derivative?" },
    { role: 'bot',  text: "The chain rule says: if y = f(g(x)), then y' = f'(g(x)) · g'(x). The outer function changes at rate f', but x drives that at rate g'(x). Without g'(x), you're missing how fast the input is changing." },
    { role: 'user', text: "Can I see an example?" },
    { role: 'bot',  text: "Sure! d/dx sin(2x): outer is sin (derivative: cos), inner is 2x (derivative: 2). Result: cos(2x) · 2 = 2cos(2x). Without the ×2 you'd have cos(2x) — wrong by a factor of 2." },
  ],
  'mc-implicit': [
    { role: 'user', text: "Why does y² give 2y·dy/dx?" },
    { role: 'bot',  text: "Think of y as a function of x. By chain rule: d/dx(y²) = 2y · (dy/dx). You always need that dy/dx to show y is changing as x changes, not a fixed number." },
  ],
  'mc-laplace-shift': [
    { role: 'user', text: "I keep getting the sign wrong in the shift." },
    { role: 'bot',  text: "Remember: L{e^(at)·f(t)} = F(s–a). Multiply by e^(at) → shift s to the RIGHT (subtract a). Think 'positive a goes to s-minus-a'. If a=2, replace every s with (s–2)." },
  ],
};
