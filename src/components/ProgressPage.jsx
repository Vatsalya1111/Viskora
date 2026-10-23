/* ── Progress Page ───────────────────────────────────────── */
import React from 'react';
import { useApp } from '../store/AppContext.jsx';
import { MISCONCEPTION_CATALOGUE } from '../data/catalogue.js';
import './ProgressPage.css';

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

/* Sparkline – simple inline trend via SVG */
function Sparkline({ values, color }) {
  const w = 100, h = 36, pad = 4;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (w - pad * 2);
        const y = h - pad - (v / max) * (h - pad * 2);
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color}/>;
      })}
    </svg>
  );
}

const MASTERY_COLORS = { good: '#22C55E', mid: '#F59E0B', low: '#F43F5E' };
function masteryColor(v) { return v >= 70 ? MASTERY_COLORS.good : v >= 45 ? MASTERY_COLORS.mid : MASTERY_COLORS.low; }

/* Mock trend data per concept (last 5 sessions) */
const TRENDS = {
  'Product rule':               [10, 20, 35, 30, 35],
  'Chain rule':                 [20, 35, 45, 50, 55],
  'Implicit differentiation':   [15, 25, 35, 40, 40],
  'Basic integration':          [55, 60, 65, 68, 70],
  'First shifting theorem':     [20, 30, 38, 42, 45],
  'Inverse Laplace':            [40, 48, 55, 58, 60],
  'Substitution rule':          [60, 65, 70, 72, 75],
  'Integration by parts':       [5, 15, 20, 28, 30],
};

export default function ProgressPage() {
  const { state, dispatch } = useApp();
  const mastery = state.mastery;
  const attempts = state.attempts || [];

  // Recurring misconceptions: count wrong steps per misconception ID derived from actual attempts
  const misconceptionCounts = {};
  attempts.forEach(a => {
    a.problem.methods.forEach(m => {
      if (m.misconceptionId) {
        misconceptionCounts[m.misconceptionId] = (misconceptionCounts[m.misconceptionId] ?? 0) + 1;
      }
    });
  });

  return (
    <div className="progress-page">
      {/* Header */}
      <div className="pp-header">
        <button
          className="btn btn-ghost btn-sm"
          id="btn-back-tutor"
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'tutor' })}
        >
          <BackIcon /> Back to tutor
        </button>
        <div>
          <h1 className="pp-title">Progress &amp; Stats</h1>
          <p className="pp-subtitle">Mastery trends, recurring misconceptions, and attempt history</p>
        </div>
      </div>

      <div className="pp-grid">
        {/* ── Mastery overview ────────────────────────── */}
        <section className="pp-card" aria-label="Mastery overview">
          <h2 className="pp-card-title">Mastery per concept</h2>
          <div className="pp-mastery-list">
            {Object.entries(mastery).map(([concept, score]) => {
              const trend = TRENDS[concept] ?? [score];
              const color = masteryColor(score);
              return (
                <div key={concept} className="pp-mastery-row">
                  <div className="pp-mastery-name">{concept}</div>
                  <Sparkline values={trend} color={color} />
                  <div className="pp-mastery-score-col">
                    <div className="pp-mastery-score" style={{ color }}>{score}%</div>
                    <div className="mastery-bar" style={{ width: 80 }}>
                      <div className="mastery-fill" style={{ width: `${score}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Recurring misconceptions ─────────────────── */}
        <section className="pp-card" aria-label="Recurring misconceptions">
          <h2 className="pp-card-title">Recurring misconceptions</h2>
          <div className="pp-misc-list">
            {Object.entries(misconceptionCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([id, count]) => {
                const mc = MISCONCEPTION_CATALOGUE.find(m => m.id === id);
                if (!mc) return null;
                return (
                  <div key={id} className="pp-misc-row">
                    <div className="pp-misc-left">
                      <div className="pp-misc-name">{mc.name}</div>
                      <div className="pp-misc-concept">{mc.concept} · {mc.topic}</div>
                    </div>
                    <div className="pp-misc-badge">{count}×</div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* ── Attempt history ──────────────────────────── */}
        <section className="pp-card pp-card-full" aria-label="Attempt history">
          <h2 className="pp-card-title">Attempt history</h2>
          <table className="pp-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Topic</th>
                <th>Concept</th>
                <th>Verdict</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map(a => {
                const wrongMethods = a.problem.methods.filter(m => m.steps.some(s => s.verdict === 'wrong'));
                const verdict = wrongMethods.length > 0 ? 'Misconception found' : 'All correct';
                return (
                  <tr key={a.id}>
                    <td className="pp-table-problem">{a.problem.displayText}</td>
                    <td>{a.topic}</td>
                    <td>{a.concept}</td>
                    <td>
                      <span className={`pp-verdict ${wrongMethods.length > 0 ? 'wrong' : 'correct'}`}>
                        {verdict}
                      </span>
                    </td>
                    <td className="pp-table-time">{timeAgo(a.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
