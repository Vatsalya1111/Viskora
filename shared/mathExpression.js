const FUNCTIONS = { sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, log: Math.log, sqrt: Math.sqrt };

export function compileMathExpression(expression) {
  if (typeof expression !== 'string' || expression.length > 180) throw new Error('Unsupported expression.');
  const tokens = expression.match(/\s*([0-9]+(?:\.[0-9]+)?|\.[0-9]+|[a-zA-Z]+|[()+\-*/^])/g);
  if (!tokens || tokens.join('').replace(/\s/g, '') !== expression.replace(/\s/g, '')) throw new Error('Unsupported expression.');
  const values = tokens.map(token => token.trim()).filter(Boolean);
  let cursor = 0;
  const peek = () => values[cursor];
  const take = () => values[cursor++];
  function primary() {
    const token = take();
    if (token === '(') { const inner = sum(); if (take() !== ')') throw new Error('Missing closing parenthesis.'); return inner; }
    if (/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(token)) { const n = Number(token); return () => n; }
    if (token === 'x') return x => x;
    if (Object.hasOwn(FUNCTIONS, token)) {
      if (take() !== '(') throw new Error('Function needs parentheses.');
      const arg = sum(); if (take() !== ')') throw new Error('Missing function parenthesis.');
      return x => FUNCTIONS[token](arg(x));
    }
    throw new Error('Unsupported expression.');
  }
  function power() { const left = primary(); if (peek() === '^') { take(); const right = unary(); return x => left(x) ** right(x); } return left; }
  function unary() { if (peek() === '-') { take(); const value = unary(); return x => -value(x); } if (peek() === '+') { take(); return unary(); } return power(); }
  function product() { let value = unary(); while (peek() === '*' || peek() === '/') { const op = take(); const right = unary(); const left = value; value = x => op === '*' ? left(x) * right(x) : left(x) / right(x); } return value; }
  function sum() { let value = product(); while (peek() === '+' || peek() === '-') { const op = take(); const right = product(); const left = value; value = x => op === '+' ? left(x) + right(x) : left(x) - right(x); } return value; }
  const fn = sum(); if (cursor !== values.length) throw new Error('Unexpected expression content.');
  return x => { const value = fn(x); return Number.isFinite(value) ? value : NaN; };
}

export function validateVisualization(spec) {
  if (!spec || spec.verified !== true) return null;
  try {
    if (spec.kind === 'implicit') {
      const upper = compileMathExpression(spec.upperBranch);
      const lowerBranch = compileMathExpression(spec.lowerBranch);
      const lower = Number(spec.lower ?? -5); const upperBound = Number(spec.upper ?? 5);
      if (!Number.isFinite(lower) || !Number.isFinite(upperBound) || lower >= upperBound || upperBound - lower > 1000) return null;
      const finiteCount = fn => Array.from({ length: 41 }, (_, i) => fn(lower + (upperBound - lower) * i / 40)).filter(Number.isFinite).length;
      if (finiteCount(upper) < 3 || finiteCount(lowerBranch) < 3) return null;
      return { kind: 'implicit', equation: typeof spec.equation === 'string' ? spec.equation : '', upperBranch: spec.upperBranch, lowerBranch: spec.lowerBranch, lower, upper: upperBound, verified: true };
    }
    if (spec.kind === 'function') {
      const f = compileMathExpression(spec.expression);
      const derivative = spec.derivative ? compileMathExpression(spec.derivative) : null;
      const lower = Number(spec.lower ?? -5); const upper = Number(spec.upper ?? 5);
      if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower >= upper || upper - lower > 1000) return null;
      const excludedValues = Array.isArray(spec.excludedValues) ? spec.excludedValues.map(Number) : [];
      if (excludedValues.length > 20 || excludedValues.some(value => !Number.isFinite(value))) return null;
      let checked = 0;
      for (const x of [lower + (upper-lower)*.17, lower + (upper-lower)*.39, lower + (upper-lower)*.63, lower + (upper-lower)*.83]) {
        const h = 1e-5 * Math.max(1, Math.abs(x));
        const numeric = (f(x+h) - f(x-h)) / (2*h);
        if (derivative) {
          const claimed = derivative(x);
          if (Number.isFinite(numeric) && Number.isFinite(claimed)) {
          if (Math.abs(numeric-claimed) > .015 * Math.max(1, Math.abs(numeric), Math.abs(claimed))) return null;
          checked++;
          }
        } else if (Number.isFinite(f(x))) {
          checked++;
        }
      }
      return checked >= 2 ? { kind: 'function', expression: spec.expression, derivative: spec.derivative || null, lower, upper, excludedValues, verified: true } : null;
    }
    if (spec.kind === 'integral') {
      compileMathExpression(spec.expression);
      const lower = Number(spec.lower); const upper = Number(spec.upper);
      if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower >= upper || upper-lower > 1000) return null;
      return { kind: 'integral', expression: spec.expression, lower, upper, verified: true };
    }
  } catch { return null; }
  return null;
}
