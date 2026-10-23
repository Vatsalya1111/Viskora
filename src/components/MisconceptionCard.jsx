/* ── MisconceptionCard (Dynamic & Scannable) ─────────────── */
import React from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Math as MathEl } from './MathRenderer.jsx';
import './MisconceptionCard.css';

/* ── SVG Icons ────────────────────────────────────────────── */
const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="#F43F5E"/>
    <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="sans-serif">!</text>
  </svg>
);

const SlipIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="#10B981"/>
    <polyline points="7 12 10.5 15.5 17 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CONFIDENCE_LABELS = {
  low:    'Confidence: Low',
  medium: 'Confidence: Medium',
  high:   'Confidence: High',
};

export default function MisconceptionCard() {
  const { misconception, liveConfidence, state, selectedMethod } = useApp();

  if (!misconception) return null;

  const confidence = liveConfidence ?? selectedMethod?.confidence ?? 'medium';
  const isSlip = state.checkState.verdict === 'slip';

  // Dynamic values derived from actual data passed through selectedMethod & misconception
  const wrongStep = selectedMethod?.steps.find(s => s.verdict === 'wrong');
  const correctAnswer = selectedMethod?.correctAnswer || misconception?.probingAnswer || '';
  const diagnosisNote = wrongStep?.note || misconception?.description || 'A conceptual step was missed in this solution.';
  const commonPatterns = misconception?.typicalWrongForms || [];

  return (
    <div className={`misconception-card anim-fade-in-up ${isSlip ? 'is-slip' : ''}`} id="misconception-card">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="mc-header">
        <div className="mc-title-row">
          {isSlip ? <SlipIcon /> : <AlertIcon />}
          <h3 className="mc-title">
            {isSlip ? 'Looks like a slip' : 'Likely Misconception'}
          </h3>
          <span className={`pill pill-${confidence}`}>
            {CONFIDENCE_LABELS[confidence] ?? `Confidence: ${confidence}`}
          </span>
        </div>
        <div className="mc-name-badge">{misconception.name}</div>
      </div>

      {isSlip ? (
        /* ── Slip / Intact Understanding ─────────────────── */
        <div className="mc-slip-box">
          <div className="mc-slip-headline">
            🎉 Great news — your conceptual foundation is intact!
          </div>
          <p className="mc-slip-body">
            Based on your responses in the adaptive check, this was a one-off execution slip rather than a deep conceptual error.
          </p>
          {correctAnswer && (
            <div className="mc-scannable-item correct" style={{ marginTop: 10 }}>
              <div className="mc-section-label">Verified Target Step</div>
              <div className="mc-math-highlight correct">
                <MathEl latex={correctAnswer} />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Scannable Diagnosis Grid ─────────────────────── */
        <div className="mc-scannable-grid">
          {/* 1. What was observed */}
          <div className="mc-scannable-item error">
            <div className="mc-scannable-header">
              <span className="mc-dot dot-error" />
              <span className="mc-section-label">Identified Mistake</span>
            </div>
            <p className="mc-scannable-text">{diagnosisNote}</p>
            {wrongStep?.latex && (
              <div className="mc-math-highlight error">
                <span className="mc-math-tag">Your Step:</span>
                <MathEl latex={wrongStep.latex} />
              </div>
            )}
          </div>

          {/* 2. Typical wrong patterns (if data exists) */}
          {commonPatterns.length > 0 && (
            <div className="mc-scannable-item warning">
              <div className="mc-scannable-header">
                <span className="mc-dot dot-warning" />
                <span className="mc-section-label">Frequent Pattern To Avoid</span>
              </div>
              <div className="mc-tags-list">
                {commonPatterns.map((pattern, i) => (
                  <code key={i} className="mc-pattern-tag">{pattern}</code>
                ))}
              </div>
            </div>
          )}

          {/* 3. Correct step */}
          {correctAnswer && (
            <div className="mc-scannable-item correct">
              <div className="mc-scannable-header">
                <span className="mc-dot dot-correct" />
                <span className="mc-section-label">Correct Formulation</span>
              </div>
              <div className="mc-math-highlight correct">
                <span className="mc-math-tag">Expected:</span>
                <MathEl latex={correctAnswer} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
