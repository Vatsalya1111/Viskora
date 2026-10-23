const CONCEPTS = {
  algebra: { title: 'Algebra with fractions', formula: '\\frac{a}{b} = a b^{-1}', example: '\\frac{x^2}{x}=x' },
  power: { title: 'Power rule', formula: '\\frac{d}{dx}x^n = nx^{n-1}', example: '\\frac{d}{dx}x^3=3x^2' },
  chain: { title: 'Chain rule', formula: '\\frac{d}{dx}f(g(x))=f\'(g(x))g\'(x)', example: '\\frac{d}{dx}(3x-2)^2=6(3x-2)' },
  product: { title: 'Product rule', formula: '(uv)\' = u\'v+uv\'', example: '\\frac{d}{dx}(x^2\\sin x)=2x\\sin x+x^2\\cos x' },
  quotient: { title: 'Quotient rule', formula: '\\left(\\frac{u}{v}\\right)\' = \\frac{u\'v-uv\'}{v^2}', example: '\\frac{d}{dx}\\left(\\frac{x^3}{3x+5}\\right)=\\frac{3x^2(3x+5)-3x^3}{(3x+5)^2}' },
  implicit: { title: 'Implicit differentiation', formula: '\\frac{d}{dx}y^n=ny^{n-1}y\'', example: '\\frac{d}{dx}(y^2)=2yy\'' },
  antiderivative: { title: 'Power rule for integration', formula: '\\int u^n\\,du=\\frac{u^{n+1}}{n+1}+C', example: '\\int u^{-3}du=-\\frac{1}{2u^2}+C' },
  substitution: { title: 'U substitution', formula: 'u=g(x),\\quad du=g\'(x)dx', example: 'u=3x-2\\Rightarrow du=3dx' },
  bounds: { title: 'Change definite integral bounds', formula: 'x=a,b\\Rightarrow u=g(a),g(b)', example: 'u=3x-2,\\ x:1\\to2\\Rightarrow u:1\\to4' },
};

export function buildPrerequisitePath({ question = '', steps = [], diagnosis = '', prerequisites = [] } = {}) {
  const source = `${question} ${diagnosis} ${steps.map(step => typeof step === 'string' ? step : step?.latex || '').join(' ')} ${prerequisites.map(item => `${item.name || ''} ${item.explanation || ''}`).join(' ')}`.toLowerCase();
  const ids = [];
  const add = id => { if (!ids.includes(id)) ids.push(id); };
  if (/integral|\\int|antiderivative|substitution/.test(source)) {
    if (/substitution|\bdu\b|\bu\s*=/.test(source)) { add('algebra'); add('substitution'); }
    if (/bound|limit|\\int/.test(source) && /substitution|\bdu\b|\bu\s*=/.test(source)) add('bounds');
    add('antiderivative');
  } else if (/differentiat|derivative|dy\s*\/\s*dx|y['′]/.test(source)) {
    add('algebra'); add('power');
    if (/\bquotient\b|\\frac|\//.test(source)) add('quotient');
    if (/sin|cos|product/.test(source)) add('product');
    if (/sqrt|\^\s*\(|chain/.test(source)) add('chain');
    if (/implicit|y\^|y\s*\(/.test(source)) add('implicit');
  }
  const usable = ids.map(id => ({ id, ...CONCEPTS[id] }));
  if (usable.length) {
    const current = /integral|\\int|antiderivative|substitution/.test(source) ? 'Evaluate the integral'
      : /quotient/.test(source) ? 'Differentiate the quotient'
        : /implicit/.test(source) ? 'Differentiate the relation' : 'Differentiate the expression';
    usable.push({ id: 'current', title: current, formula: '', example: '' });
    return usable;
  }
  if (prerequisites.length) return prerequisites.map((item, i) => ({
    id: item.id || `provided-${i}`, title: item.name || 'Prerequisite concept',
    formula: item.formula || '', example: item.example || '', explanation: item.explanation || '',
  }));
  return [];
}

export function getPrerequisiteConcept(id) {
  return CONCEPTS[id] || null;
}
