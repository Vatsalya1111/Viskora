/* ── StepRow – individual step in student's working (Scannable) ── */
import React from 'react';
import { Math as MathEl } from './MathRenderer.jsx';
import './StepRow.css';

const CorrectIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="#22C55E"/>
    <polyline points="7 12.5 10.5 16 17 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WrongIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="#F43F5E"/>
    <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="sans-serif">!</text>
  </svg>
);

const ValidAltIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="#8B5CF6"/>
    <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="12" fontWeight="700" fontFamily="sans-serif">≈</text>
  </svg>
);

export default function StepRow({ step, index, selected, onClick }) {
  const verdictClass = step.verdict === 'correct' ? 'correct'
                     : step.verdict === 'wrong'   ? 'wrong'
                     : 'valid-alt';

  return (
    <button
      className={`step-row ${verdictClass} ${selected ? 'selected' : ''}`}
      onClick={onClick}
      id={`step-${step.id}`}
      aria-selected={selected}
      title={step.note}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="step-left-content">
        <span className="step-label">Step {index + 1}:</span>
        <span className="step-math">
          <MathEl latex={step.latex} />
        </span>
      </div>

      <div className="step-right-content">
        {step.verdict === 'correct' && (
          <span className="step-status-pill pill-ok">
            <CorrectIcon />
            <span>Correct</span>
          </span>
        )}
        {step.verdict === 'wrong' && (
          <span className="step-status-pill pill-err">
            <WrongIcon />
            <span>Incorrect</span>
          </span>
        )}
        {step.verdict === 'valid-alt' && (
          <span className="step-status-pill pill-alt">
            <ValidAltIcon />
            <span>Valid alt</span>
          </span>
        )}
        {selected && (
          <span className="step-active-badge">Active</span>
        )}
      </div>
    </button>
  );
}
