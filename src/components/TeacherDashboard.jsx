import React, { useEffect, useMemo, useState } from 'react';
import { accountRequest } from '../data/accountApi.js';
import { Math as MathFormula } from './MathRenderer.jsx';
import './TeacherDashboard.css';

function outcome(attempt) {
  const methods = attempt.problem?.methods || [];
  if (methods.some(m => m.verificationStatus === 'error_found' || m.steps?.some(step => step.verdict === 'wrong'))) return 'Needs review';
  if (methods.length && methods.every(m => m.verificationStatus === 'no_error' || m.steps?.length && m.steps.every(step => step.verdict === 'correct'))) return 'Correct';
  return 'Unverified';
}

export default function TeacherDashboard({ session, onSignOut }) {
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { const result = await accountRequest('/api/reports/classes'); setClasses(result.classes || []); setError(''); }
    catch (issue) { setError(issue.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function createClass(event) {
    event.preventDefault(); setError('');
    try { await accountRequest('/api/classes', { method: 'POST', body: { name: className } }); setClassName(''); await refresh(); }
    catch (issue) { setError(issue.message); }
  }

  const allStudents = classes.flatMap(item => item.students.map(student => ({ ...student, className: item.name })));
  const totalAttempts = allStudents.reduce((sum, student) => sum + student.attempts.length, 0);
  const allAttempts = allStudents.flatMap(student => student.attempts);
  const summaries = useMemo(() => {
    const result = { Correct: 0, 'Needs review': 0, Unverified: 0 };
    allAttempts.forEach(attempt => result[outcome(attempt)]++);
    return result;
  }, [classes]);

  return <main className="teacher-dashboard">
    <header className="teacher-header"><div><p className="td-eyebrow">Teacher workspace</p><h1>Class learning overview</h1><p>Review each student’s learning report and see patterns across your classes.</p></div><div className="td-user"><span>{session.user.name}<small>{session.user.email}</small></span><button onClick={onSignOut}>Sign out</button></div></header>
    <form className="td-create" onSubmit={createClass}><div><h2>Create a class</h2><p>Share its join code with students so they can link their learning reports to you.</p></div><input aria-label="Class name" required minLength="2" maxLength="80" placeholder="e.g. Engineering Mathematics — Section A" value={className} onChange={e => setClassName(e.target.value)} /><button>Create class</button></form>
    {error && <p className="td-error" role="alert">{error}</p>}
    <div className="td-refresh-row"><span>Reports are saved as students work.</span><button onClick={refresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh reports'}</button></div>
    <section className="td-stats" aria-label="General class report"><article><span>Classes</span><strong>{classes.length}</strong></article><article><span>Students</span><strong>{allStudents.length}</strong></article><article><span>Submissions</span><strong>{totalAttempts}</strong></article><article><span>Correct</span><strong>{summaries.Correct}</strong></article><article><span>Needs review</span><strong>{summaries['Needs review']}</strong></article></section>
    {loading ? <p className="td-empty">Loading class reports…</p> : classes.length === 0 ? <p className="td-empty">Create your first class to get a join code and student overview.</p> : classes.map(item => {
      const attempts = item.students.flatMap(student => student.attempts);
      const checked = attempts.filter(attempt => outcome(attempt) !== 'Unverified');
      const accuracy = checked.length ? Math.round(checked.filter(attempt => outcome(attempt) === 'Correct').length / checked.length * 100) : null;
      const topics = Object.entries(attempts.reduce((group, attempt) => { const topic = attempt.topic || 'Other'; group[topic] = (group[topic] || 0) + 1; return group; }, {})).sort((a,b) => b[1]-a[1]);
      return <section className="td-class" key={item.id}>
        <div className="td-class-head"><div><h2>{item.name}</h2><span>{item.students.length} {item.students.length === 1 ? 'student' : 'students'} · {attempts.length} submissions · {accuracy === null ? 'No verified work yet' : `${accuracy}% verified accuracy`}</span></div><div className="td-code">Join code <strong>{item.joinCode}</strong></div></div>
        <div className="td-general"><strong>Class report</strong><span>{topics.length ? topics.map(([topic,count]) => `${topic}: ${count}`).join(' · ') : 'No submissions yet'}{attempts.length ? ` · ${summariesFor(attempts)}` : ''}</span></div>
        {item.students.length === 0 ? <p className="td-empty">No students have joined this class yet.</p> : <div className="td-students">{item.students.map(student => {
          const done = student.attempts.filter(attempt => outcome(attempt) !== 'Unverified');
          const score = done.length ? Math.round(done.filter(attempt => outcome(attempt) === 'Correct').length / done.length * 100) : null;
          return <details className="td-student" key={student.id}><summary><span className="td-avatar">{student.name.slice(0,1).toUpperCase()}</span><span className="td-student-name"><strong>{student.name}</strong><small>{student.email}</small></span><span>{student.attempts.length} submissions</span><span>{score === null ? 'No verified work' : `${score}% verified accuracy`}</span><span className="td-expand">View report⌄</span></summary>
            <div className="td-report"><div className="td-report-stats"><span><strong>{student.attempts.length}</strong> submissions</span><span><strong>{student.mastery ? Object.keys(student.mastery).length : 0}</strong> tracked concepts</span><span><strong>{score === null ? '—' : `${score}%`}</strong> verified accuracy</span></div>
              <h3>Learning topics</h3>{student.attempts.length ? <div className="td-topic-list">{Object.entries(student.attempts.reduce((group, attempt) => { const topic = `${attempt.topic || 'Other'} / ${attempt.concept || 'General'}`; group[topic] = (group[topic] || 0) + 1; return group; }, {})).map(([topic,count]) => <span key={topic}>{topic}<b>{count}</b></span>)}</div> : <p>No analysis reports yet. Their report will appear after they submit work.</p>}
              {Object.keys(student.mastery || {}).length > 0 && <div className="td-mastery">{Object.entries(student.mastery).map(([concept,value]) => <span key={concept}>{concept}<b>{value}%</b></span>)}</div>}
              <h3>Recent submissions</h3>{student.attempts.slice(0,8).map((attempt,index) => <details className="td-attempt" key={attempt.id || index}><summary><span className="td-attempt-heading"><strong><MathFormula latex={attempt.problem?.latex || attempt.problem?.displayText || 'Submitted working'} /></strong><small>{attempt.topic || 'Other'} · {attempt.concept || 'General'} · {attempt.timestamp ? new Date(attempt.timestamp).toLocaleDateString() : 'date unavailable'}</small></span><b>{outcome(attempt)}</b></summary><div className="td-attempt-detail">{attempt.problem?.methods?.map((method, methodIndex) => <section key={method.id || methodIndex}><strong>{method.diagnosis || method.name || 'Analysis'}{method.confidence ? ` · ${method.confidence} confidence` : ''}</strong>{method.verificationReason && <p>{method.verificationReason}</p>}{method.steps?.map((step, stepIndex) => <div className="td-step-detail" key={step.id || stepIndex}><b>Step {stepIndex + 1} · {step.verdict || 'unverified'}:</b><div><MathFormula latex={step.latex || ''} />{step.note && <p>{step.note}</p>}</div></div>)}</section>)}</div></details>)}</div>
          </details>;
        })}</div>}
      </section>;
    })}
  </main>;
}

function summariesFor(attempts) {
  const counts = { Correct: 0, 'Needs review': 0, Unverified: 0 };
  attempts.forEach(attempt => counts[outcome(attempt)]++);
  return `${counts.Correct} correct, ${counts['Needs review']} need review, ${counts.Unverified} unverified`;
}
