/**
 * Viskora – Global App State (React Context + useReducer)
 * Structured so the mock AI layer can be replaced with real calls.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  MISCONCEPTION_CATALOGUE,
  PREREQUISITES,
  CHATBOT_RESPONSES,
} from '../data/catalogue.js';
import { generateChatbotResponse } from '../data/chatbot.js';
import { accountRequest } from '../data/accountApi.js';

/* ── Initial State ──────────────────────────────────────── */
const initialState = {
  studentId: 'student',
  attempts: [],
  selectedAttemptId: null,
  selectedMethodId: null,
  selectedStepId: null,
  mastery: {},
  prereqStatus: {}, // keyed by prereq id -> 'good' | 'needs-review'

  // Understanding check state
  checkState: {
    active: false,
    questionIndex: 0,
    answers: [],          // { qIndex, answer, correct, misconceptionId }
    confidence: 'medium', // live-updated from answers
    verdict: null,        // null | 'confirmed' | 'slip' | 'revised'
    complete: false,
  },

  // Chat state
  chatMessages: {}, // keyed by stepId

  // Upload modal
  uploadModalOpen: false,
  uploadPreview: null,
  transcriptionRaw: '',

  // View
  currentView: 'tutor', // 'tutor' | 'progress'
};

const STORAGE_KEY = 'viskora.learning-data.v1';

function loadLearningData(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`${STORAGE_KEY}.${userId}`) || 'null');
    if (!saved || typeof saved !== 'object') return initialState;
    return {
      ...initialState,
      attempts: Array.isArray(saved.attempts) ? saved.attempts : [],
      mastery: saved.mastery && typeof saved.mastery === 'object' ? saved.mastery : {},
      prereqStatus: saved.prereqStatus && typeof saved.prereqStatus === 'object' ? saved.prereqStatus : {},
    };
  } catch {
    return initialState;
  }
}

/* ── Reducer ────────────────────────────────────────────── */
function reducer(state, action) {
  switch (action.type) {

    case 'SELECT_ATTEMPT': {
      const attempt = state.attempts.find(a => a.id === action.payload);
      return {
        ...state,
        selectedAttemptId: action.payload,
        selectedMethodId: attempt?.problem.methods[0].id ?? null,
        selectedStepId: null,
        uploadPreview: null,
        checkState: initialState.checkState,
        chatMessages: {},
      };
    }

    case 'HYDRATE_REPORT':
      return {
        ...state,
        attempts: action.payload.attempts || [],
        selectedAttemptId: action.payload.attempts?.[0]?.id ?? null,
        selectedMethodId: action.payload.attempts?.[0]?.problem?.methods?.[0]?.id ?? null,
        mastery: action.payload.mastery || {},
        prereqStatus: action.payload.prereqStatus || {},
      };

    case 'SELECT_METHOD': {
      return { ...state, selectedMethodId: action.payload, selectedStepId: null, checkState: initialState.checkState };
    }

    case 'SELECT_STEP': {
      const stepId = action.payload;
      // Init chat for this step if not exists
      const attempt = state.attempts.find(a => a.id === state.selectedAttemptId);
      const method = attempt?.problem.methods.find(m => m.id === state.selectedMethodId);
      const step = method?.steps.find(s => s.id === stepId);
      const misconceptionId = method?.misconceptionId;
      let chatMessages = { ...state.chatMessages };
      if (stepId && step?.verdict === 'wrong' && !chatMessages[stepId]) {
        chatMessages[stepId] = (CHATBOT_RESPONSES[misconceptionId] ?? []).map((m, i) => ({
          ...m,
          id: `msg-seed-${i}`,
          timestamp: new Date(Date.now() - (3 - i) * 60 * 1000).toISOString(),
        }));
      }
      return { ...state, selectedStepId: stepId, chatMessages };
    }

    case 'START_CHECK': {
      const attempt = state.attempts.find(a => a.id === state.selectedAttemptId);
      const method = attempt?.problem.methods.find(m => m.id === state.selectedMethodId);
      return {
        ...state,
        checkState: {
          active: true,
          questionIndex: 0,
          answers: [],
          confidence: method?.confidence ?? 'medium',
          verdict: null,
          complete: false,
        },
      };
    }

    case 'ANSWER_CHECK_QUESTION': {
      const { qIndex, answer, correct, misconceptionId } = action.payload;
      const newAnswers = [...state.checkState.answers, { qIndex, answer, correct, misconceptionId }];
      const correctCount = newAnswers.filter(a => a.correct).length;
      const wrongCount   = newAnswers.filter(a => !a.correct).length;

      // Adaptive confidence update
      let confidence = state.checkState.confidence;
      let verdict = state.checkState.verdict;
      if (correct)  { if (confidence === 'medium') confidence = 'low';   if (confidence === 'high') confidence = 'medium'; }
      if (!correct) { if (confidence === 'medium') confidence = 'high';  if (confidence === 'low')  confidence = 'medium'; }

      // End conditions: 3 correct → slip; wrong keeps going (up to 3 Qs)
      const nextIndex = qIndex + 1;
      const maxQs = 3;
      let complete = false;
      if (correctCount >= 3) { verdict = 'slip'; confidence = 'low'; complete = true; }
      if (nextIndex >= maxQs) { verdict = complete ? verdict : (wrongCount >= 2 ? 'confirmed' : 'revised'); complete = true; }

      // Update mastery
      const attempt = state.attempts.find(a => a.id === state.selectedAttemptId);
      const method = attempt?.problem.methods.find(m => m.id === state.selectedMethodId);
      const concept = attempt?.concept ?? '';
      const mastery = { ...state.mastery };
      if (correct)  mastery[concept] = Math.min(100, (mastery[concept] ?? 50) + 5);
      if (!correct) mastery[concept] = Math.max(0,   (mastery[concept] ?? 50) - 5);

      // Update prerequisite status in the attempt (reflected in UI)
      let updatedAttempts = state.attempts;
      if (complete && verdict === 'slip') {
        // If slip, mark method as higher-confidence
        updatedAttempts = state.attempts.map(a =>
          a.id === state.selectedAttemptId
            ? {
                ...a,
                problem: {
                  ...a.problem,
                  methods: a.problem.methods.map(m =>
                    m.id === state.selectedMethodId ? { ...m, confidence: 'low' } : m
                  ),
                },
              }
            : a
        );
      }

      return {
        ...state,
        attempts: updatedAttempts,
        mastery,
        checkState: {
          ...state.checkState,
          questionIndex: complete ? nextIndex : nextIndex,
          answers: newAnswers,
          confidence,
          verdict,
          complete,
        },
      };
    }

    case 'ADD_USER_CHAT': {
      const { stepId, message } = action.payload;
      const userMsg = {
        id: `msg-u-${Date.now()}`,
        role: 'user',
        text: message,
        timestamp: new Date().toISOString(),
      };
      const prev = state.chatMessages[stepId] ?? [];
      return {
        ...state,
        chatMessages: { ...state.chatMessages, [stepId]: [...prev, userMsg] },
      };
    }

    case 'ADD_BOT_CHAT': {
      const { stepId, message } = action.payload;
      const botMsg = {
        id: `msg-b-${Date.now()}`,
        role: 'bot',
        text: message,
        timestamp: new Date().toISOString(),
      };
      const prev = state.chatMessages[stepId] ?? [];
      return {
        ...state,
        chatMessages: { ...state.chatMessages, [stepId]: [...prev, botMsg] },
      };
    }

    case 'SEND_CHAT': {
      const { stepId, message } = action.payload;
      const attempt = state.attempts.find(a => a.id === state.selectedAttemptId);
      const method = attempt?.problem.methods.find(m => m.id === state.selectedMethodId);
      const stepIndex = method?.steps.findIndex(s => s.id === stepId) ?? 0;
      const step = method?.steps[stepIndex];
      const misconception = MISCONCEPTION_CATALOGUE.find(m => m.id === method?.misconceptionId);

      const userMsg = {
        id: `msg-u-${Date.now()}`,
        role: 'user',
        text: message,
        timestamp: new Date().toISOString(),
      };

      const prev = state.chatMessages[stepId] ?? [];

      // Generate intelligent fallback response using actual problem/step data
      const botResponseText = generateChatbotResponse({
        userMessage: message,
        step,
        stepIndex,
        method,
        attempt,
        misconception,
        chatHistory: prev,
      });

      const botMsg = {
        id: `msg-b-${Date.now() + 1}`,
        role: 'bot',
        text: botResponseText,
        timestamp: new Date(Date.now() + 600).toISOString(),
      };

      return {
        ...state,
        chatMessages: { ...state.chatMessages, [stepId]: [...prev, userMsg, botMsg] },
      };
    }

    case 'TOGGLE_PREREQUISITE': {
      const { prereqId } = action.payload;
      const current = state.prereqStatus[prereqId];
      // Toggle between good and needs-review
      const nextStatus = current === 'good' ? 'needs-review' : 'good';
      return {
        ...state,
        prereqStatus: {
          ...state.prereqStatus,
          [prereqId]: nextStatus,
        },
      };
    }

    case 'OPEN_UPLOAD_MODAL':  return { ...state, uploadModalOpen: true };
    case 'CLOSE_UPLOAD_MODAL': return { ...state, uploadModalOpen: false, uploadPreview: null };
    case 'SET_UPLOAD_PREVIEW': return { ...state, uploadPreview: action.payload };
    case 'CONFIRM_TRANSCRIPTION': {
      const { attempt, imageUrl } = action.payload || {};
      if (!attempt) return state;
      const analysed = { ...attempt, uploadedImageUrl: imageUrl || null };
      const method = analysed.problem.methods[0];
      const focusStepId = method.steps.find(s => s.verdict === 'wrong')?.id
        ?? method.steps[0]?.id
        ?? null;
      let chatMessages = {};
      if (focusStepId && method.misconceptionId && CHATBOT_RESPONSES[method.misconceptionId]) {
        chatMessages[focusStepId] = CHATBOT_RESPONSES[method.misconceptionId].map((m, i) => ({
          ...m,
          id: `msg-seed-${i}`,
          timestamp: new Date(Date.now() - (3 - i) * 60 * 1000).toISOString(),
        }));
      }
      return {
        ...state,
        uploadModalOpen: false,
        uploadPreview: analysed.uploadedImageUrl,
        transcriptionRaw: analysed.transcriptionRaw,
        selectedAttemptId: analysed.id,
        selectedMethodId: method.id,
        selectedStepId: focusStepId,
        checkState: initialState.checkState,
        chatMessages,
        attempts: [analysed, ...state.attempts],
      };
    }

    case 'SET_VIEW': return { ...state, currentView: action.payload };

    default: return state;
  }
}

/* ── Context ────────────────────────────────────────────── */
const AppContext = createContext(null);

export function AppProvider({ children, userId }) {
  const [state, dispatch] = useReducer(reducer, userId, loadLearningData);
  const reportReady = React.useRef(false);

  useEffect(() => {
    let active = true;
    reportReady.current = false;
    accountRequest('/api/reports/self').then(report => {
      if (!active) return;
      dispatch({ type: 'HYDRATE_REPORT', payload: report });
      reportReady.current = true;
    }).catch(error => {
      console.error('Could not load your saved learning report.', error);
    });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!reportReady.current) return;
    try {
      // Uploaded image object URLs expire on reload; retain the analysis and text only.
      const attempts = state.attempts.map(({ uploadedImageUrl, ...attempt }) => attempt);
      const report = { attempts, mastery: state.mastery, prereqStatus: state.prereqStatus };
      localStorage.setItem(`${STORAGE_KEY}.${userId}`, JSON.stringify(report));
      accountRequest('/api/reports/self', { method: 'PUT', body: report }).catch(error => console.error('Could not sync your learning report.', error));
    } catch (error) {
      console.warn('Could not save Viskora learning data locally.', error);
    }
  }, [state.attempts, state.mastery, state.prereqStatus, userId]);

  // Derived selectors
  const selectedAttempt = state.attempts.find(a => a.id === state.selectedAttemptId);
  const selectedMethod  = selectedAttempt?.problem.methods.find(m => m.id === state.selectedMethodId);
  const selectedStep    = selectedMethod?.steps.find(s => s.id === state.selectedStepId);
  const misconception   = selectedMethod?.diagnosis
    ? { name: selectedMethod.diagnosis, description: selectedMethod.diagnosis }
    : MISCONCEPTION_CATALOGUE.find(m => m.id === selectedMethod?.misconceptionId);

  // Resolve prerequisites dynamically based on actual method or attempt
  const rawPrerequisites = selectedMethod?.prerequisites ??
    (selectedMethod?.misconceptionId ? PREREQUISITES[selectedMethod.misconceptionId] : null) ??
    (misconception?.id ? PREREQUISITES[misconception.id] : null) ??
    (selectedAttempt?.concept ? PREREQUISITES[selectedAttempt.concept] : null) ??
    [];

  // Attach interactive toggle status from state
  const prerequisites = rawPrerequisites.map(p => ({
    ...p,
    status: state.prereqStatus[p.id] ?? p.status,
  }));

  const chatMessages = state.chatMessages[state.selectedStepId] ?? [];

  // Group attempts by topic for sidebar
  const attemptsByTopic = state.attempts.reduce((acc, a) => {
    if (!acc[a.topic]) acc[a.topic] = [];
    acc[a.topic].push(a);
    return acc;
  }, {});

  // Build questions for the current understanding check
  const buildQuestions = useCallback(() => {
    if (!misconception) return [];
    const qs = [];
    // Q1 – Confirm (probing distractor MCQ)
    qs.push({
      type: 'mcq',
      prompt: `Quick confirm: find **${misconception.probingQuestion}**`,
      options: [...misconception.probingDistractors].sort(() => Math.random() - 0.5),
      correctOption: misconception.probingDistractors.find(o => o.misconceptionId === null),
      explanation: `Correct! ${misconception.probingQuestion} = ${misconception.probingAnswer}. ${misconception.description || ''}`,
    });
    // Q2 – Variant
    if (misconception.followUp?.q2) {
      qs.push({
        type: 'short',
        prompt: `Variant: find **${misconception.followUp.q2.expr}**`,
        answer: misconception.followUp.q2.answer,
        hint: misconception.followUp.q2.hint,
        explanation: `Answer: ${misconception.followUp.q2.answer}. ${misconception.followUp.q2.hint}`,
      });
    }
    // Q3 – Transfer
    if (misconception.followUp?.q3) {
      qs.push({
        type: 'short',
        prompt: `Transfer: evaluate **${misconception.followUp.q3.expr}**`,
        answer: misconception.followUp.q3.answer,
        hint: misconception.followUp.q3.hint,
        explanation: `Answer: ${misconception.followUp.q3.answer}. ${misconception.followUp.q3.hint}`,
      });
    }
    return qs;
  }, [misconception]);

  const value = {
    state,
    dispatch,
    selectedAttempt,
    selectedMethod,
    selectedStep,
    misconception,
    prerequisites,
    chatMessages,
    attemptsByTopic,
    buildQuestions,
    // Confidence from live check state, fallback to method
    liveConfidence: state.checkState.active ? state.checkState.confidence : selectedMethod?.confidence,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
