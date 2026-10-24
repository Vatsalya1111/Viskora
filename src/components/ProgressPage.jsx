/* ── Progress Page ───────────────────────────────────────── */
import React from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Math as MathFormula } from './MathRenderer.jsx';
import './ProgressPage.css';

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

function getOutcome(attempt) {
  const methods = attempt.problem?.methods ?? [];
  const statuses = methods.map(method => method.verificationStatus).filter(Boolean);
  if (statuses.includes('error_found') || methods.some(method => method.steps?.some(step => step.verdict === 'wrong'))) return 'review';
  if (statuses.includes('no_error') || (methods.length > 0 && methods.every(method => method.steps?.length && method.steps.every(step => step.verdict === 'correct')))) return 'correct';
  return 'uncertain';
}

function getSubmissionSummary(attempt) {
  const methods = attempt.problem?.methods ?? [];
  const steps = methods.flatMap(method => method.steps ?? []);
  const wrongIndex = steps.findIndex(step => step.verdict === 'wrong');
  const note = wrongIndex >= 0 ? steps[wrongIndex].note : methods.find(method => method.verificationReason)?.verificationReason;
  const summary = wrongIndex >= 0
    ? `Step ${wrongIndex + 1} needs review${note ? `: ${note}` : '.'}`
    : getOutcome(attempt) === 'correct'
      ? 'The submitted steps were verified as correct.'
      : note || 'This submission could not be fully verified.';
  return summary.length > 180 ? `${summary.slice(0, 177).trimEnd()}…` : summary;
}

function shareLabel(count, total) {
  return total ? `${Math.round(count / total * 100)}%` : '0%';
}

export default function ProgressPage() {
  const { state, dispatch, syncStatus, syncError, retryReportSync } = useApp();
  const attempts = state.attempts || [];
  const topicStats = Object.values(attempts.reduce((groups, attempt) => {
    const topic = attempt.topic || 'Other';
    groups[topic] ??= { topic, total: 0, correct: 0, review: 0, uncertain: 0 };
    groups[topic].total += 1;
    groups[topic][getOutcome(attempt)] += 1;
    return groups;
  }, {})).sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic));
  const verifiedCount = attempts.filter(attempt => getOutcome(attempt) !== 'uncertain').length;
  const correctCount = attempts.filter(attempt => getOutcome(attempt) === 'correct').length;
  const reviewCount = attempts.filter(attempt => getOutcome(attempt) === 'review').length;
  const uncertainCount = attempts.length - verifiedCount;
  const accuracy = verifiedCount ? Math.round(correctCount / verifiedCount * 100) : null;
  const maxTopicCount = Math.max(1, ...topicStats.map(topic => topic.total));
  const activity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const count = attempts.filter(attempt => {
      if (!attempt.timestamp) return false;
      const uploaded = new Date(attempt.timestamp);
      return uploaded.getFullYear() === date.getFullYear() && uploaded.getMonth() === date.getMonth() && uploaded.getDate() === date.getDate();
    }).length;
    return { key, label: date.toLocaleDateString(undefined, { weekday: 'short' }), count };
  });
  const maxActivity = Math.max(1, ...activity.map(day => day.count));
  const correctShare = attempts.length ? correctCount / attempts.length * 100 : 0;
  const reviewShare = attempts.length ? reviewCount / attempts.length * 100 : 0;

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
          <p className="pp-subtitle">Topic analytics and a clear history of your submitted work</p>
        </div>
      </div>

      <div className="pp-grid">
        <section className="pp-card pp-card-full" aria-label="Learning analytics">
          <div className="pp-analytics-heading">
            <div>
              <h2 className="pp-card-title">Your learning at a glance</h2>
              <p className="pp-analytics-caption">Analytics update whenever you add working.</p>
            </div>
            <div className="pp-sync-state">
              <span className={`pp-local-badge sync-${syncStatus}`} title={syncError || undefined}><span />{syncStatus === 'synced' ? 'Synced to your teacher' : syncStatus === 'syncing' ? 'Syncing report…' : syncStatus === 'loading' ? 'Connecting…' : 'Saved locally · sync issue'}</span>
              {syncStatus === 'error' && <button className="pp-sync-retry" onClick={retryReportSync}>Retry sync</button>}
            </div>
          </div>
          <div className="pp-stat-grid">
            <div className="pp-stat"><span className="pp-stat-label">Submissions</span><strong>{attempts.length}</strong><span>all recorded work</span></div>
            <div className="pp-stat"><span className="pp-stat-label">Topics explored</span><strong>{topicStats.length}</strong><span>based on your uploads</span></div>
            <div className="pp-stat"><span className="pp-stat-label">Verified accuracy</span><strong>{accuracy === null ? '—' : `${accuracy}%`}</strong><span>{verifiedCount ? `${verifiedCount} reviewed submissions` : 'appears after a verified review'}</span></div>
          </div>
          <h3 className="pp-chart-title">Work by topic</h3>
          {topicStats.length === 0 ? <p className="pp-empty">Upload your first solution to start a topic breakdown.</p> : (
            <div className="pp-topic-chart">
              {topicStats.map(topic => (
                <div className="pp-topic-row" key={topic.topic}>
                  <span className="pp-topic-name">{topic.topic}</span>
                  <div className="pp-topic-track" aria-label={`${topic.total} submissions: ${topic.correct} correct, ${topic.review} need review, ${topic.uncertain} unverified`}>
                    <span className="pp-topic-bar" style={{ width: `${Math.max(8, topic.total / maxTopicCount * 100)}%` }}>
                      {topic.correct > 0 && <i className="pp-segment-correct" style={{ flex: topic.correct }} />}
                      {topic.review > 0 && <i className="pp-segment-review" style={{ flex: topic.review }} />}
                      {topic.uncertain > 0 && <i className="pp-segment-uncertain" style={{ flex: topic.uncertain }} />}
                    </span>
                  </div>
                  <span className="pp-topic-count">{topic.total} {topic.total === 1 ? 'upload' : 'uploads'}</span>
                </div>
              ))}
            </div>
          )}
          {topicStats.length > 0 && <div className="pp-chart-legend"><span className="good-dot" /> Correct <span className="review-dot" /> Needs review <span className="uncertain-dot" /> Unverified</div>}
        </section>
        <section className="pp-card" aria-label="Weekly upload activity">
          <div className="pp-chart-header">
            <div><h2 className="pp-card-title">Weekly activity</h2><p className="pp-analytics-caption">Your uploads over the last 7 days</p></div>
            <strong className="pp-chart-total">{activity.reduce((sum, day) => sum + day.count, 0)}<small> this week</small></strong>
          </div>
          <div className="pp-activity-chart" role="img" aria-label={activity.map(day => `${day.label}: ${day.count} uploads`).join(', ')}>
            {activity.map((day, index) => (
              <div className="pp-activity-day" key={day.key}>
                <span className="pp-activity-count">{day.count || ''}</span>
                <div className="pp-activity-track"><i className={index === 6 ? 'today' : ''} style={{ height: `${day.count ? Math.max(10, day.count / maxActivity * 100) : 3}%` }} /></div>
                <span className="pp-activity-label">{day.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="pp-card" aria-label="Review outcomes">
          <h2 className="pp-card-title">Review outcomes</h2>
          <p className="pp-analytics-caption">Share of all submissions, including unverified work.</p>
          {attempts.length === 0 ? <p className="pp-empty">Outcome breakdown will appear after your first upload.</p> : (
            <div className="pp-outcome-content">
              <div className="pp-donut" role="img" aria-label={`${correctCount} correct, ${reviewCount} need review, ${uncertainCount} unverified`} style={{ '--correct-share': `${correctShare}%`, '--review-share': `${reviewShare}%` }}>
                <div><strong>{attempts.length}</strong><span>uploads</span></div>
              </div>
              <div className="pp-outcome-legend">
                <div><span className="good-dot" /><span>Correct</span><strong>{correctCount} <small>{shareLabel(correctCount, attempts.length)}</small></strong></div>
                <div><span className="review-dot" /><span>Needs review</span><strong>{reviewCount} <small>{shareLabel(reviewCount, attempts.length)}</small></strong></div>
                <div><span className="uncertain-dot" /><span>Unverified</span><strong>{uncertainCount} <small>{shareLabel(uncertainCount, attempts.length)}</small></strong></div>
              </div>
            </div>
          )}
        </section>


        {/* ── Attempt history ──────────────────────────── */}
        <section className="pp-card pp-card-full" aria-label="Attempt history">
          <div className="pp-history-heading">
            <div><h2 className="pp-card-title">Submission reviews</h2><p className="pp-analytics-caption">Open any submission to inspect its steps and analysis.</p></div>
            <span className="pp-history-total">{attempts.length} {attempts.length === 1 ? 'submission' : 'submissions'}</span>
          </div>
          {attempts.length === 0 ? <p className="pp-empty">No attempts yet. Upload your working to get started.</p> : (
            <div className="pp-submission-list">
              {attempts.map(attempt => {
                const outcome = getOutcome(attempt);
                const verdict = outcome === 'review' ? 'Needs review' : outcome === 'correct' ? 'All correct' : 'Unverified';
                const methods = attempt.problem?.methods ?? [];
                const steps = methods.flatMap(method => method.steps ?? []);
                return (
                  <details className="pp-submission" key={attempt.id}>
                    <summary className="pp-submission-summary">
                      <span className={`pp-outcome-marker ${outcome}`} />
                      <span className="pp-submission-main">
                        <strong>{attempt.problem?.displayText || 'Submitted working'}</strong>
                        <span>{attempt.topic || 'Other'} · {attempt.concept || 'General'} · {timeAgo(attempt.timestamp)}</span>
                      </span>
                      <span className={`pp-verdict ${outcome === 'review' ? 'wrong' : outcome}`}>{verdict}</span>
                      <span className="pp-expand-hint">Details</span>
                    </summary>
                    <div className="pp-submission-detail">
                      <div className="pp-summary-box"><span>Problem</span><p>{attempt.problem?.displayText || 'Transcribed working'}</p></div>
                      <div className="pp-summary-box"><span>Summary</span><p>{getSubmissionSummary(attempt)}</p></div>
                      {steps.length > 0 && (
                        <div className="pp-submission-steps">
                          <h3>Submitted steps</h3>
                          {steps.map((step, index) => (
                            <div className={`pp-submission-step ${step.verdict || 'uncertain'}`} key={step.id || index}>
                              <span>{index + 1}</span><div><MathFormula latex={step.latex || ''} />{step.note && <small>{step.note}</small>}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        dispatch({ type: 'SELECT_ATTEMPT', payload: attempt.id });
                        dispatch({ type: 'SET_VIEW', payload: 'tutor' });
                      }}>Open in tutor</button>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return 'date unavailable';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
