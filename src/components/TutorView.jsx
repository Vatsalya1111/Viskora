/* ── Centre Panel – Tutor View ──────────────────────────── */
import React, { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Math as MathEl } from './MathRenderer.jsx';
import StepRow from './StepRow.jsx';
import MisconceptionCard from './MisconceptionCard.jsx';
import UnderstandingCheck from './UnderstandingCheck.jsx';
import PrerequisiteGrid from './PrerequisiteGrid.jsx';
import UploadModal from './UploadModal.jsx';
import './TutorView.css';

/* ── SVG Icons ──────────────────────────────────────────── */
const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function TutorView() {
  const { state, dispatch, selectedAttempt, selectedMethod } = useApp();
  const [imgError, setImgError] = useState(false);

  if (!selectedAttempt) {
    return (
      <div className="tutor-empty">
        <div className="tutor-empty-inner">
          <div className="tutor-empty-icon">📐</div>
          <h2>No attempt selected</h2>
          <p>Upload your working or select a recent attempt from the sidebar.</p>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'OPEN_UPLOAD_MODAL' })}>
            Upload working
          </button>
        </div>
      </div>
    );
  }

  const problem = selectedAttempt.problem;
  const methods = problem.methods;

  return (
    <main className="tutor-view" id="tutor-main">
      {/* ── Problem card ─────────────────────────────────── */}
      <section className="tutor-section card anim-fade-in-up" style={{ animationDelay: '0ms' }}>
        <div className="section-label-sm">Problem</div>
        <div className="problem-display">
          <span className="problem-q">Q.</span>
          <MathEl latex={problem.latex} display={false} />
        </div>
      </section>

      {/* ── Your working ─────────────────────────────────── */}
      <section className="tutor-section card anim-fade-in-up" style={{ animationDelay: '40ms' }}>
        <div className="section-label-sm">Your working</div>

        <div className="working-layout">
          {/* Uploaded image / placeholder */}
          <div className="working-image-col">
            <div className="working-image-wrapper">
              {selectedAttempt.uploadedImageUrl && !imgError ? (
                <img
                  src={selectedAttempt.uploadedImageUrl}
                  alt="Student's handwritten working"
                  className="working-image"
                  onError={() => setImgError(true)}
                />
              ) : state.uploadPreview ? (
                <img
                  src={state.uploadPreview}
                  alt="Uploaded working preview"
                  className="working-image"
                />
              ) : (
                <WorkingPaperPreview
                  problem={problem}
                  method={selectedMethod}
                  selectedStepId={state.selectedStepId}
                  onSelectStep={(id) => dispatch({ type: 'SELECT_STEP', payload: id })}
                />
              )}
            </div>
            <div className="working-image-footer">
              <span className="working-image-label">Uploaded working</span>
              <button
                className="check-transcription-btn"
                id="btn-check-transcription"
                onClick={() => dispatch({ type: 'OPEN_UPLOAD_MODAL' })}
              >
                {selectedAttempt.transcriptionChecked ? (
                  <><CheckIcon /> Transcription verified</>
                ) : (
                  'Check transcription'
                )}
              </button>
            </div>
          </div>

          {/* Step rows */}
          <div className="working-steps-col">
            {selectedMethod?.steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                index={i}
                selected={state.selectedStepId === step.id}
                onClick={() => dispatch({ type: 'SELECT_STEP', payload: step.id })}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Method tabs ──────────────────────────────────── */}
      <section className="tutor-section card anim-fade-in-up" style={{ animationDelay: '80ms' }}>
        {/* Tab bar */}
        <div className="tab-bar" role="tablist" aria-label="Solution methods">
          {methods.map(method => {
            const hasError = method.steps.some(s => s.verdict === 'wrong');
            const allCorrect = method.steps.every(s => s.verdict === 'correct');
            return (
              <button
                key={method.id}
                role="tab"
                id={`tab-${method.id}`}
                aria-selected={state.selectedMethodId === method.id}
                className={`tab-btn ${state.selectedMethodId === method.id ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SELECT_METHOD', payload: method.id })}
              >
                {method.label}
                {allCorrect && <span className="tab-status-ok">✓</span>}
                {hasError && !allCorrect && <span className="tab-status-err">!</span>}
              </button>
            );
          })}
        </div>

        {/* Misconception card */}
        {selectedMethod?.misconceptionId && (
          <MisconceptionCard />
        )}
        {!selectedMethod?.misconceptionId && (
          <div className="method-all-correct">
            <span className="method-correct-icon">🎉</span>
            <div>
              <strong>All steps correct!</strong>
              <p>Your solution using this method is fully correct.</p>
            </div>
          </div>
        )}

        {/* Understanding check */}
        {selectedMethod?.misconceptionId && (
          <UnderstandingCheck />
        )}

        {/* Prerequisites */}
        <PrerequisiteGrid />
      </section>

      {/* Upload Modal */}
      {state.uploadModalOpen && <UploadModal />}
    </main>
  );
}

/** Dynamic student working preview rendered from actual problem & method steps */
function WorkingPaperPreview({ problem, method, selectedStepId, onSelectStep }) {
  const steps = method?.steps || [];
  const questionTitle = problem?.displayText || 'Calculus problem';

  return (
    <div className="working-paper-preview" aria-label="Working sheet preview">
      <div className="paper-margin-red" />
      <div className="paper-header">
        <span className="paper-q-prefix">Q.</span>
        <span className="paper-q-title truncate" title={questionTitle}>{questionTitle}</span>
      </div>
      <div className="paper-subhead">Student Solution:</div>
      <div className="paper-steps-container">
        {steps.map((step, idx) => {
          const isWrong = step.verdict === 'wrong';
          const isSelected = selectedStepId === step.id;
          return (
            <div
              key={step.id || idx}
              className={`paper-step-row ${isWrong ? 'paper-wrong' : 'paper-correct'} ${isSelected ? 'paper-selected' : ''}`}
              onClick={() => onSelectStep && onSelectStep(step.id)}
              title={step.note || ''}
            >
              <span className="paper-step-num">{idx + 1}.</span>
              <span className="paper-step-math truncate">{step.latex || step.note}</span>
              <span className="paper-step-badge">
                {step.verdict === 'correct' && <span className="paper-icon-ok">✓</span>}
                {step.verdict === 'wrong' && <span className="paper-icon-err">!</span>}
                {step.verdict === 'valid-alt' && <span className="paper-icon-alt">≈</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
