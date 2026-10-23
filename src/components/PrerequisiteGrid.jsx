/* ── Prerequisites Vertical Checklist (Expandable / Collapsible) ── */
import React, { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import './PrerequisiteGrid.css';

/* ── SVG Icons ────────────────────────────────────────────── */
const ChecklistIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);

const ChevronDownIcon = ({ open }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`prereq-chevron ${open ? 'open' : ''}`}
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const CheckedBoxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="prereq-check-svg">
    <rect width="20" height="20" x="2" y="2" rx="5" fill="#22C55E"/>
    <polyline points="6.5 12 10 15.5 17.5 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NeedsReviewBoxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="prereq-check-svg">
    <rect width="20" height="20" x="2" y="2" rx="5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2"/>
    <path d="M12 8v4M12 16h.01" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

export default function PrerequisiteGrid() {
  const { prerequisites, dispatch } = useApp();
  const [isOpen, setIsOpen] = useState(true);

  if (!prerequisites || prerequisites.length === 0) return null;

  const needsReviewCount = prerequisites.filter(p => p.status === 'needs-review').length;
  const readyCount = prerequisites.filter(p => p.status === 'good').length;

  return (
    <div className="prereq-section card" id="prerequisites-section">
      {/* ── Collapsible Checklist Header ────────────────────── */}
      <button
        type="button"
        className="prereq-header-toggle"
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        aria-controls="prereq-checklist-content"
      >
        <div className="prereq-header-left">
          <div className="prereq-header-icon-wrap">
            <ChecklistIcon />
          </div>
          <div>
            <span className="prereq-header-title">Prerequisites Checklist</span>
            <span className="prereq-header-subtitle">
              Foundational skills for this problem
            </span>
          </div>
        </div>

        <div className="prereq-header-right">
          {needsReviewCount > 0 ? (
            <span className="prereq-summary-pill pill-warn">
              {needsReviewCount} to review
            </span>
          ) : (
            <span className="prereq-summary-pill pill-good">
              All ready ({readyCount})
            </span>
          )}
          <span className="prereq-toggle-label">{isOpen ? 'Hide' : 'Show'}</span>
          <ChevronDownIcon open={isOpen} />
        </div>
      </button>

      {/* ── Vertical Checklist Body ───────────────────────── */}
      {isOpen && (
        <div className="prereq-content" id="prereq-checklist-content">
          <div className="prereq-vertical-list" role="list">
            {prerequisites.map(prereq => {
              const isGood = prereq.status === 'good';
              return (
                <div
                  key={prereq.id}
                  className={`prereq-checklist-item ${isGood ? 'item-good' : 'item-review'}`}
                  role="listitem"
                  onClick={() => dispatch({ type: 'TOGGLE_PREREQUISITE', payload: { prereqId: prereq.id } })}
                  title="Click to toggle mastered status"
                >
                  {/* Interactive Checkbox Indicator */}
                  <button
                    type="button"
                    className="prereq-checkbox-btn"
                    aria-label={`Toggle status for ${prereq.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'TOGGLE_PREREQUISITE', payload: { prereqId: prereq.id } });
                    }}
                  >
                    {isGood ? <CheckedBoxIcon /> : <NeedsReviewBoxIcon />}
                  </button>

                  {/* Scannable text content */}
                  <div className="prereq-item-info">
                    <div className="prereq-item-name">{prereq.name}</div>
                    <div className="prereq-item-desc">
                      {isGood
                        ? 'Mastered — ready to apply in this step'
                        : 'Review recommended — core source of confusion'}
                    </div>
                  </div>

                  {/* Right Status Badge */}
                  <div className="prereq-item-status-col">
                    <span className={`prereq-badge ${isGood ? 'badge-good' : 'badge-review'}`}>
                      {isGood ? 'Good to go' : 'Needs review'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="prereq-footer-hint">
            💡 Click any prerequisite to check it off as you review.
          </div>
        </div>
      )}
    </div>
  );
}
