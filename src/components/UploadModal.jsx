/* ── Upload Modal ────────────────────────────────────────── */
import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../store/AppContext.jsx';
import './UploadModal.css';

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function UploadModal() {
  const { state, dispatch, selectedAttempt, selectedMethod } = useApp();
  const [dragging, setDragging] = useState(false);

  // Initialize transcription text from actual problem/steps
  const defaultText = selectedAttempt?.transcriptionRaw ||
    (selectedMethod?.steps
      ? selectedMethod.steps.map((s, i) => `Step ${i + 1}: ${s.latex || s.note}`).join('\n')
      : selectedAttempt?.problem?.displayText || '');

  const [transcriptionText, setTranscriptionText] = useState(defaultText);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    dispatch({ type: 'SET_UPLOAD_PREVIEW', payload: url });
  }, [dispatch]);

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
                <div className="upload-drop-hint">PNG, JPG, PDF · Max 10 MB</div>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="visually-hidden" onChange={handleFileInput} id="file-input" />
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
              placeholder="Type or paste your step-by-step working…"
            />
          </div>

          {/* Info box */}
          <div className="modal-info">
            <span className="modal-info-icon">ℹ️</span>
            <span>Viskora will check your transcription against the uploaded image before trusting the diagnosis.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => dispatch({ type: 'CLOSE_UPLOAD_MODAL' })}>Cancel</button>
          <button
            className="btn btn-primary"
            id="btn-confirm-transcription"
            onClick={() => dispatch({ type: 'CONFIRM_TRANSCRIPTION', payload: { text: transcriptionText, attemptId: selectedAttempt?.id } })}
          >
            Confirm &amp; Analyse
          </button>
        </div>
      </div>
    </div>
  );
}
