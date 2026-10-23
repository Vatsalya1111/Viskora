import React, { useEffect, useMemo, useState } from 'react';
import { compileMathExpression } from '../../shared/mathExpression.js';
import { Math as MathEl } from './MathRenderer.jsx';
import './MathVisualizer.css';

const W = 640; const H = 320; const PAD = 38;

export default function MathVisualizer({ spec, problem, status }) {
  const [open, setOpen] = useState(Boolean(spec));
  const [point, setPoint] = useState(0);
  useEffect(() => { if (spec) { setOpen(true); setPoint(0.5); } }, [spec]);
  const graph = useMemo(() => {
    if (!spec) return null;
    try {
      if (spec.kind === 'implicit') {
        const upper = compileMathExpression(spec.upperBranch);
        const lower = compileMathExpression(spec.lowerBranch);
        const xs = Array.from({ length: 241 }, (_, i) => spec.lower + (spec.upper - spec.lower) * i / 240);
        const upperValues = xs.map(upper); const lowerValues = xs.map(lower);
        const finite = [...upperValues, ...lowerValues].filter(Number.isFinite);
        if (finite.length < 20) return null;
        let ymin = Math.min(0, ...finite); let ymax = Math.max(0, ...finite);
        const span = Math.max(ymax - ymin, 1); ymin -= span * .12; ymax += span * .12;
        const px = x => PAD + (x - spec.lower) / (spec.upper - spec.lower) * (W - 2 * PAD);
        const py = y => H - PAD - (y - ymin) / (ymax - ymin) * (H - 2 * PAD);
        const branchPath = values => {
          let drawing = false;
          return values.reduce((d, y, i) => {
            if (!Number.isFinite(y)) { drawing = false; return d; }
            const command = `${drawing ? ' L' : ' M'}${px(xs[i]).toFixed(1)},${py(y).toFixed(1)}`;
            drawing = true;
            return d + command;
          }, '');
        };
        return { implicit: true, px, py, upperCurve: branchPath(upperValues), lowerCurve: branchPath(lowerValues) };
      }
      const fn = compileMathExpression(spec.expression);
      const derivative = spec.kind === 'function' && spec.derivative ? compileMathExpression(spec.derivative) : null;
      const xs = Array.from({ length: 361 }, (_, i) => spec.lower + (spec.upper - spec.lower) * i / 360);
      const sampleStep = (spec.upper - spec.lower) / 360;
      const isExcluded = x => (spec.excludedValues || []).some(root => Math.abs(x - root) <= sampleStep * 1.25);
      const values = xs.map(x => isExcluded(x) ? NaN : fn(x));
      const finite = values.filter(Number.isFinite);
      if (finite.length < 100) return null;
      const rangeOf = values => {
        const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
        return [sorted[Math.floor((sorted.length - 1) * .02)], sorted[Math.ceil((sorted.length - 1) * .98)]];
      };
      let [ymin, ymax] = rangeOf(finite);
      if (spec.kind === 'function' && derivative) {
        const [dmin, dmax] = rangeOf(xs.map(x => isExcluded(x) ? NaN : derivative(x)));
        ymin = Math.min(ymin, dmin); ymax = Math.max(ymax, dmax);
      }
      if (spec.kind === 'integral') { ymin = Math.min(ymin, 0); ymax = Math.max(ymax, 0); }
      const span = Math.max(ymax - ymin, 1); ymin -= span * .12; ymax += span * .12;
      const px = x => PAD + (x - spec.lower) / (spec.upper - spec.lower) * (W - 2 * PAD);
      const py = y => H - PAD - (y - ymin) / (ymax - ymin) * (H - 2 * PAD);
      const path = list => {
        let connected = false;
        return list.reduce((d, p) => {
          if (!Number.isFinite(p.y) || p.y < ymin || p.y > ymax) { connected = false; return d; }
          const command = `${connected ? ' L' : 'M'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`;
          connected = true;
          return d + command;
        }, '');
      };
      const curve = path(xs.map((x, i) => ({ x, y: values[i] })));
      const derivativeValues = derivative ? xs.map(x => isExcluded(x) ? NaN : derivative(x)) : [];
      const derivativePath = derivative ? path(xs.map((x, i) => ({ x, y: derivativeValues[i] }))) : '';
      const rawX0 = spec.lower + (spec.upper - spec.lower) * point;
      const excludedRoot = (spec.excludedValues || []).find(root => Math.abs(rawX0 - root) <= sampleStep * 1.25);
      const x0 = excludedRoot == null ? rawX0 : excludedRoot + (excludedRoot + sampleStep * 2 <= spec.upper ? sampleStep * 2 : -sampleStep * 2);
      const y0 = fn(x0);
      const h = 1e-5 * Math.max(1, Math.abs(x0));
      const slope = derivative ? derivative(x0) : (fn(x0 + h) - fn(x0 - h)) / (2 * h);
      const tangent = spec.kind === 'function' && Number.isFinite(y0) && Number.isFinite(slope)
        ? path([{ x: x0 - (spec.upper-spec.lower)*.1, y: y0-slope*(spec.upper-spec.lower)*.1 }, { x: x0 + (spec.upper-spec.lower)*.1, y: y0+slope*(spec.upper-spec.lower)*.1 }]) : '';
      const area = spec.kind === 'integral' ? `${curve} L${px(spec.upper)},${py(0)} L${px(spec.lower)},${py(0)} Z` : '';
      return { fn, derivative, px, py, curve, derivativePath, tangent, area, x0, y0, slope, ymin, ymax };
    } catch { return null; }
  }, [spec, point]);

  if (!spec) {
    const message = status === 'uncertain'
      ? 'A graph is withheld until the submitted expression can be verified.'
      : 'No graph is available because this problem could not be safely converted to a supported expression.';
    return <section className="math-visualizer card" aria-label="Graph visualization unavailable"><div className="visualizer-toggle"><span><strong>Graph visualization</strong><small>{problem || 'Current problem'}</small></span></div><p className="visualizer-empty">{message}</p></section>;
  }

  return (
    <section className="math-visualizer card">
      <button type="button" className="visualizer-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <span><strong>Interactive math visualizer</strong><small>Explore the actual expressions from this solution</small></span>
        <span>{open ? 'Hide' : 'Explore'}</span>
      </button>
      {open && (graph && spec ? <div className="visualizer-body">
        <div className="visualizer-legend"><span><i className="legend-function" />{spec.kind === 'integral' ? 'Integrand' : spec.kind === 'implicit' ? 'Implicit relation' : 'Function'}</span><MathEl latex={spec.kind === 'implicit' ? spec.equation : spec.kind === 'integral' ? `f(x)=${spec.expression}` : `y=${spec.expression}`} />{spec.kind === 'function' && spec.derivative && <span><i className="legend-derivative" />Derivative: <MathEl latex={`y'=${spec.derivative}`} /></span>}{spec.kind === 'function' && <span><i className="legend-tangent" />Tangent</span>}</div>
        <svg className="math-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={spec.kind === 'function' ? 'Graph of the function and derivative with a movable tangent point' : spec.kind === 'implicit' ? 'Graph of both branches of an implicit relation' : 'Graph of the integrand and shaded integration area'}>
          <defs><clipPath id="math-plot-clip"><rect x={PAD} y={PAD} width={W-2*PAD} height={H-2*PAD} /></clipPath></defs>
          <line x1={PAD} y1={Math.max(PAD, Math.min(H-PAD, graph.py(0)))} x2={W-PAD} y2={Math.max(PAD, Math.min(H-PAD, graph.py(0)))} className="plot-axis" />
          <line x1={Math.max(PAD, Math.min(W-PAD, graph.px(0)))} y1={PAD} x2={Math.max(PAD, Math.min(W-PAD, graph.px(0)))} y2={H-PAD} className="plot-axis" />
          <text x={W-PAD+8} y={graph.py(0)-6} className="plot-label">x</text>
          <text x={graph.px(Math.max(spec.lower, Math.min(spec.upper, 0)))+6} y={PAD-8} className="plot-label">y</text>
          <g clipPath="url(#math-plot-clip)">
            {spec.kind === 'integral' && <path d={graph.area} className="plot-area" />}
            {spec.kind === 'implicit' && <><path d={graph.upperCurve} className="plot-function" /><path d={graph.lowerCurve} className="plot-function" /></>}
            {spec.kind !== 'implicit' && <path d={graph.curve} className="plot-function"><title>{spec.expression}</title></path>}
            {spec.kind === 'function' && <>{spec.derivative && <path d={graph.derivativePath} className="plot-derivative"><title>{spec.derivative}</title></path>}<path d={graph.tangent} className="plot-tangent" /><circle cx={graph.px(graph.x0)} cy={graph.py(graph.y0)} r="5" className="plot-point"><title>x={graph.x0.toFixed(2)}, f(x)={graph.y0.toFixed(3)}, slope={graph.slope.toFixed(3)}</title></circle></>}
          </g>
          <text x={W/2} y={H-5} textAnchor="middle" className="plot-label">x</text>
        </svg>
        {spec.kind === 'function' ? <div className="visualizer-control"><label htmlFor="visualizer-point">Move point along the function</label><input id="visualizer-point" type="range" min="0" max="1" step="0.005" value={point} onChange={event => setPoint(Number(event.target.value))} /><p><MathEl latex={`x=${graph.x0.toFixed(2)},\quad f'(x)=${graph.slope.toFixed(3)}`} /></p></div> : spec.kind === 'implicit' ? <p className="visualizer-note">Both branches of the implicit relation are plotted.</p> : <p className="visualizer-note">Shaded area from {spec.lower} to {spec.upper}. <MathEl latex={`\\int_{${spec.lower}}^{${spec.upper}} ${spec.expression}\\,dx`} /></p>}
        {spec.kind === 'function' && spec.excludedValues?.length > 0 && <p className="visualizer-note">Excluded from the domain: {spec.excludedValues.map(value => <MathEl key={value} latex={`x\\ne ${Number(value.toPrecision(5))}`} />)}</p>}
      </div> : <p className="visualizer-empty">This problem’s expression could not be safely matched to a supported graph, so no sample graph is shown.</p>)}
    </section>
  );
}
