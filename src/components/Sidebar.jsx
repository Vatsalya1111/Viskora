/* ── Sidebar Component ──────────────────────────────────── */
import React, { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import './Sidebar.css';

const TopicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const ChevronDown = ({ open }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 200ms ease' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);

const ProgressIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function Sidebar() {
  const { state, dispatch, attemptsByTopic } = useApp();
  const [closedTopics, setClosedTopics] = useState([]);

  function toggleTopic(topic) {
    setClosedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  }

  function getConceptLabel(attempt) {
    return attempt.concept;
  }

  return (
    <aside className="sidebar">
      {/* Wordmark */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="url(#grad)"/>
            <path d="M8 22 L14 10 L16 16 L18 10 L24 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#818CF8"/>
                <stop offset="1" stopColor="#4F46E5"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="sidebar-wordmark">Viskora</span>
      </div>

      {/* Upload button */}
      <button
        className="sidebar-upload-btn"
        id="btn-upload-working"
        onClick={() => dispatch({ type: 'OPEN_UPLOAD_MODAL' })}
      >
        <UploadIcon />
        Upload working
      </button>

      {/* Recent attempts */}
      <div className="sidebar-section-label">Recent attempts</div>

      <nav className="sidebar-nav" aria-label="Recent attempts">
        {Object.keys(attemptsByTopic).length === 0 && <p className="sidebar-empty">No attempts yet. Upload your working to get started.</p>}
        {Object.entries(attemptsByTopic).map(([topic, attempts]) => (
          <div key={topic} className="sidebar-topic-group">
            <button
              className="sidebar-topic-header"
              onClick={() => toggleTopic(topic)}
              aria-expanded={!closedTopics.includes(topic)}
            >
              <span>{topic}</span>
              <ChevronDown open={!closedTopics.includes(topic)} />
            </button>

            {!closedTopics.includes(topic) && (
              <ul className="sidebar-attempt-list" role="list">
                {attempts.map(attempt => (
                  <li key={attempt.id}>
                    <button
                      className={`sidebar-attempt-btn ${state.selectedAttemptId === attempt.id ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'SELECT_ATTEMPT', payload: attempt.id })}
                      id={`sidebar-attempt-${attempt.id}`}
                    >
                      <TopicIcon />
                      <span className="truncate">{getConceptLabel(attempt)}</span>
                      {attempt.isExample && <span className="sidebar-sample-badge">Sample</span>}
                      {state.selectedAttemptId === attempt.id && (
                        <span className="sidebar-active-dot" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>

      {/* Progress link (pinned bottom) */}
      <button
        className="sidebar-progress-link"
        id="btn-view-progress"
        onClick={() => dispatch({ type: 'SET_VIEW', payload: 'progress' })}
      >
        <ProgressIcon />
        <span>View progress &amp; stats</span>
        <ChevronRight />
      </button>
    </aside>
  );
}
