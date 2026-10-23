/* ── Upload Modal ────────────────────────────────────────── */
import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { submitAnalysis } from '../data/analysisApi.js';
import './UploadModal.css';

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function UploadModal() {
  const { state, dispatch } = useApp();
  const [dragging, setDragging] = useState(false);

  const [transcriptionText, setTranscriptionText] = useState('');
  const [formError, setFormError] = useState('');
  const [analysing, setAnalysing] = useState(false);
  const [question, setQuestion] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setFormError('Please upload a PNG, JPG, or WebP image of your working.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { setFormError('The image must be 10 MB or smaller.'); return; }
    setFormError('');
    setFile(file);
    const url = URL.createObjectURL(file);
    dispatch({ type: 'SET_UPLOAD_PREVIEW', payload: url });
  }, [dispatch]);

  async function handleAnalyse() {
    if (!question.trim() && !transcriptionText.trim() && !file) {
      setFormError('Enter the question and steps, or upload an image.');
      return;
    }
    setFormError('');
    setAnalysing(true);
    try {
      const result = await submitAnalysis({ question: question.trim(), text: transcriptionText.trim(), file });
      if (result.status === 'needs_confirmation') {
        setQuestion(result.transcription.question || '');
        setTranscriptionText(result.transcription.steps.join('\n'));
        setFile(null);
        const onlyQuestionNumber = /^(?:(?:question|q)\.?\s*)?\d{1,4}\s*[).:]?$/i.test(result.transcription.question || '');
        setFormError(onlyQuestionNumber
          ? 'This is only the question number. Enter the complete matrix problem in Question before analysing.'
          : result.transcription.confidence == null
            ? 'Please check the transcription and enter the complete question before analysing.'
            : `Please confirm this transcription before analysis (confidence ${Math.round(result.transcription.confidence * 100)}%).`);
        return;
      }
      dispatch({ type: 'CONFIRM_TRANSCRIPTION', payload: { attempt: result.attempt, imageUrl: state.uploadPreview } });
    } catch (error) {
      setFormError(error.message || 'Analysis failed. Please try again.');
    } finally { setAnalysing(false); }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function handleFileInput(e) {
    handleFile(e.target.files[0]);
  }

  return (
    <div className="modal-backdrop" onClick={() => dispatch({ type: 'CLOSE_UPLOAD_MODAL' })}>
      <div className="modal-box" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Upload working">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Upload your working</h2>
          <button className="modal-close" onClick={() => dispatch({ type: 'CLOSE_UPLOAD_MODAL' })} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          {/* Drop zone */}
          <div
            className={`upload-drop ${dragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {state.uploadPreview ? (
              <img src={state.uploadPreview} alt="Uploaded preview" className="upload-preview-img" />
            ) : (
              <>
                <div className="upload-drop-icon">📷</div>
                <div className="upload-drop-text">
                  <strong>Drop image here</strong> or <span className="link">browse</span>
                </div>
                <div className="upload-drop-hint">PNG, JPG, or WebP · Max 10 MB</div>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="visually-hidden" onChange={handleFileInput} id="file-input" />
          </div>

          <div className="modal-section">
            <label className="modal-label" htmlFor="question-input">Question</label>
            <textarea id="question-input" className="input-field modal-textarea" value={question} onChange={e => setQuestion(e.target.value)} rows={2} placeholder="e.g. Differentiate y = x² sin(x)" />
          </div>

          {/* Transcription */}
          <div className="modal-section">
            <label className="modal-label" htmlFor="transcription-input">
              Transcription
              <span className="modal-label-hint">Edit any misread characters</span>
            </label>
            <textarea
              id="transcription-input"
              className="input-field modal-textarea"
              value={transcriptionText}
              onChange={e => setTranscriptionText(e.target.value)}
              rows={4}
              placeholder="Type each step on its own line (helps line-by-line diagnosis)…"
            />
          </div>

          {/* Info box */}
          <div className="modal-info">
            <span className="modal-info-icon">ℹ️</span>
            <span>AI reads the handwriting and reviews the solution steps. Confirm the transcription if any symbols or lines are unclear.</span>
          </div>
          {formError && <div className="modal-error">{formError}</div>}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => dispatch({ type: 'CLOSE_UPLOAD_MODAL' })}>Cancel</button>
          <button
            className="btn btn-primary"
            id="btn-confirm-transcription"
            disabled={analysing}
            onClick={handleAnalyse}
          >
            {analysing ? 'Analysing…' : 'Confirm & Analyse'}
          </button>
        </div>
      </div>
    </div>
  );
}
