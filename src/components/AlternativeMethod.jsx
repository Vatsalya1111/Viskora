import React, { useState } from 'react';
import { Math as MathEl } from './MathRenderer.jsx';
import './AlternativeMethod.css';

export default function AlternativeMethod({ method }) {
  const [open, setOpen] = useState(false);
  const alternative = method?.alternativeMethod;
  return (
    <section className="alternative-method card">
      <button type="button" className="alternative-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <span><strong>Explore another method</strong><small>Compare a different approach to this problem</small></span>
        <span>{open ? 'Hide' : 'Explore'}</span>
      </button>
      {open && (alternative ? (
        <div className="alternative-columns">
          <div className="alternative-column">
            <h3>Your submitted method</h3>
            <ol>{method.steps.map((step, i) => <li key={step.id || i}><MathEl latex={step.latex} /></li>)}</ol>
          </div>
          <div className="alternative-column">
            <h3>{alternative.label}</h3>
            <ol>{alternative.steps.map((step, i) => <li key={i}><MathEl latex={step} /></li>)}</ol>
            <p className="alternative-difference"><strong>Key difference:</strong> {alternative.keyDifference || 'This uses a different sequence of valid steps.'}</p>
            <p className="alternative-result"><strong>AI-checked result:</strong> <MathEl latex={alternative.finalAnswer} /></p>
          </div>
        </div>
      ) : <p className="alternative-empty">No distinct alternative method was confidently available for this solution.</p>)}
    </section>
  );
}
