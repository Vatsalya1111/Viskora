/**
 * UnderstandingCheck – adaptive 3-question flow.
 * Q1: MCQ confirm, Q2: short variant, Q3: short transfer.
 * Adaptive: wrong answer → add targeted question; 3 correct → end early.
 */
import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { RichText } from './MathRenderer.jsx';
import './UnderstandingCheck.css';

const BrainIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.74-4.56 2.5 2.5 0 0 1-.23-7.4 2.5 2.5 0 0 1 4.43-3.08"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.74-4.56 2.5 2.5 0 0 0 .23-7.4 2.5 2.5 0 0 0-4.43-3.08"/>
  </svg>
);

const CheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);
const XCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

export default function UnderstandingCheck() {
  const { state, dispatch, buildQuestions, misconception } = useApp();
  const { checkState } = state;
  const questions = useMemo(() => buildQuestions(), [buildQuestions]);

  const [shortAnswer, setShortAnswer] = useState('');
  const [answered, setAnswered] = useState(null); // null | { correct, explanation }

  if (!misconception) return null;

  // Not started
  if (!checkState.active && !checkState.complete) {
    return (
      <div className="understanding-card anim-fade-in-up" id="check-understanding">
        <div className="uc-start">
          <div className="uc-start-left">
            <div className="uc-icon-wrap"><BrainIcon /></div>
            <div>
              <div className="uc-title">Check your understanding</div>
              <div className="uc-subtitle">3 short questions, adaptive to your answers</div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            id="btn-start-check"
            onClick={() => dispatch({ type: 'START_CHECK' })}
          >
            Start check →
          </button>
        </div>
      </div>
    );
  }

  // Completed
  if (checkState.complete) {
    const verdict = checkState.verdict;
    return (
      <div className={`understanding-card anim-fade-in-up ${verdict === 'slip' ? 'uc-verdict-slip' : 'uc-verdict-confirmed'}`} id="check-complete">
        <div className="uc-complete">
          <div className="uc-complete-icon">
            {verdict === 'slip' ? '🎉' : verdict === 'confirmed' ? '🔍' : '📊'}
          </div>
          <div>
            <div className="uc-title">
              {verdict === 'slip' && 'Looks like a slip — you actually understand this!'}
              {verdict === 'confirmed' && 'Misconception confirmed. Let\'s fix this.'}
              {verdict === 'revised' && 'Partially understood — more practice recommended.'}
            </div>
            <div className="uc-subtitle" style={{ marginTop: 4 }}>
              {checkState.answers.filter(a => a.correct).length} of {checkState.answers.length} correct
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            id="btn-practice-next"
            style={{ marginLeft: 'auto' }}
          >
            Practice next →
          </button>
        </div>
      </div>
    );
  }

  const qIndex = checkState.questionIndex;
  const question = questions[qIndex];
  if (!question) return null;

  const total = questions.length;

  function handleMCQ(option) {
    const correct = option.misconceptionId === null;
    const explanation = correct
      ? `✓ Correct! ${misconception?.probingQuestion} = ${misconception?.probingAnswer}. ${question.explanation || misconception?.description || ''}`
      : `✗ That answer (${option.text}) corresponds to "${option.label}". See the explanation below.`;

    setAnswered({ correct, explanation });

    setTimeout(() => {
      dispatch({
        type: 'ANSWER_CHECK_QUESTION',
        payload: { qIndex, answer: option.text, correct, misconceptionId: option.misconceptionId },
      });
      setAnswered(null);
      setShortAnswer('');
    }, 1600);
  }

  function handleShort() {
    if (!shortAnswer.trim()) return;
    // Fuzzy match: if answer contains key term
    const key = question.answer.toLowerCase().replace(/\s/g, '');
    const input = shortAnswer.toLowerCase().replace(/\s/g, '');
    const correct = input.includes(key.slice(0, Math.min(5, key.length))) ||
                    key.includes(input.slice(0, Math.min(5, input.length)));
    const explanation = correct
      ? `✓ Correct! ${question.explanation}`
      : `✗ The expected answer is: ${question.answer}. ${question.hint}`;
    setAnswered({ correct, explanation });

    setTimeout(() => {
      dispatch({
        type: 'ANSWER_CHECK_QUESTION',
        payload: { qIndex, answer: shortAnswer, correct, misconceptionId: correct ? null : misconception.id },
      });
      setAnswered(null);
      setShortAnswer('');
    }, 2000);
  }

  return (
    <div className="understanding-card anim-fade-in-up" id="check-understanding-active">
      {/* Header */}
      <div className="uc-header">
        <div className="uc-header-left">
          <div className="uc-icon-wrap"><BrainIcon /></div>
          <span className="uc-title">Check your understanding</span>
        </div>
        <div className="uc-progress-label">{qIndex + 1} of {total}</div>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ marginBottom: 16, marginTop: 8 }}>
        <div className="progress-fill" style={{ width: `${((qIndex) / total) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="uc-question">
        <div className="uc-q-tag">Q{qIndex + 1}</div>
        <div className="uc-q-text"><RichText text={question.prompt} /></div>
      </div>

      {/* Answer area */}
      {question.type === 'mcq' && !answered && (
        <div className="uc-mcq-options">
          {question.options.map((opt, i) => (
            <button
              key={i}
              className="mcq-option"
              id={`mcq-opt-${i}`}
              onClick={() => handleMCQ(opt)}
            >
              <span className="mcq-opt-letter">{String.fromCharCode(65 + i)}.</span>
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {question.type === 'short' && !answered && (
        <div className="uc-short-input">
          <input
            type="text"
            className="input-field"
            id={`short-answer-${qIndex}`}
            placeholder="Type your answer…"
            value={shortAnswer}
            onChange={e => setShortAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleShort()}
          />
          <button className="btn btn-primary btn-sm" onClick={handleShort}>Submit</button>
          {question.hint && (
            <button
              className="btn btn-ghost btn-sm"
              title="Show hint"
              onClick={() => setAnswered({ correct: null, explanation: `💡 Hint: ${question.hint}` })}
            >
              Hint
            </button>
          )}
        </div>
      )}

      {/* Feedback */}
      {answered !== null && (
        <div className={`uc-feedback ${answered.correct === true ? 'correct' : answered.correct === false ? 'wrong' : 'hint'}`}>
          {answered.correct === true  && <CheckCircle />}
          {answered.correct === false && <XCircle />}
          <span>{answered.explanation}</span>
        </div>
      )}
    </div>
  );
}
