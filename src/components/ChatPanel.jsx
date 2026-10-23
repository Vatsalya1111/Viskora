/* ── Chatbot Panel (Dynamic Data & Scannable Responses) ──── */
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { getDynamicSuggestions, queryGeminiTutor } from '../data/chatbot.js';
import './ChatPanel.css';

/* ── SVG Icons ────────────────────────────────────────────── */
const BotAvatar = () => (
  <div className="chat-avatar">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      <line x1="12" y1="3" x2="12" y2="7"/>
    </svg>
  </div>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const MinimizeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return ''; }
}

/**
 * Scannable message formatter for chatbot
 * Highlights bullet points, **bold** phrases, and `inline code`
 */
function ScannableChatMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="scannable-chat-body">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="chat-line-gap" />;
        }

        const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('- ');
        const content = isBullet ? trimmed.slice(2) : trimmed;

        return (
          <div key={idx} className={`chat-line ${isBullet ? 'chat-bullet-line' : ''}`}>
            {isBullet && <span className="chat-bullet-dot">•</span>}
            <span className="chat-line-text">
              {formatInlineText(content)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatInlineText(str) {
  // Split on bold (**...**) and inline code (`...`)
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = str.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="chat-highlight-strong">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="chat-highlight-code">{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ChatPanel() {
  const {
    state,
    dispatch,
    chatMessages,
    selectedStep,
    selectedMethod,
    selectedAttempt,
    misconception,
  } = useApp();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef(null);

  const stepId = state.selectedStepId;
  const messages = chatMessages;

  const stepIndex = selectedMethod?.steps.findIndex(s => s.id === stepId) ?? -1;
  const stepNumber = stepIndex >= 0 ? stepIndex + 1 : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  async function handleSend(customText) {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || !stepId) return;
    setInput('');
    setIsTyping(true);

    // 1. Immediately post student message in chat
    dispatch({ type: 'ADD_USER_CHAT', payload: { stepId, message: textToSend } });

    try {
      // 2. Query Google Gemini live with fallback
      const botResponse = await queryGeminiTutor({
        userMessage: textToSend,
        step: selectedStep,
        stepIndex,
        method: selectedMethod,
        attempt: selectedAttempt,
        misconception,
        chatHistory: messages,
      });

      dispatch({ type: 'ADD_BOT_CHAT', payload: { stepId, message: botResponse } });
    } catch (err) {
      console.error('Chat error:', err);
      dispatch({
        type: 'ADD_BOT_CHAT',
        payload: {
          stepId,
          message: "• **Rule reminder:** Check if you differentiated each component step by step.\n• Let's review the formula or try a simpler case!"
        }
      });
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Dynamic suggestions derived directly from the active step and attempt data
  const dynamicSuggestions = stepId
    ? getDynamicSuggestions({
        step: selectedStep,
        stepIndex,
        method: selectedMethod,
        attempt: selectedAttempt,
        misconception,
      })
    : [];

  return (
    <aside className="chat-panel" id="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-header-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <span className="chat-header-title">AI Tutor Assistant</span>
          </div>
          {stepNumber && (
            <span className="chat-scope-pill">Step {stepNumber}</span>
          )}
        </div>
        <button
          className="chat-minimize-btn"
          onClick={() => setMinimized(m => !m)}
          aria-label={minimized ? 'Expand chat' : 'Minimize chat'}
        >
          {minimized ? '+' : <MinimizeIcon />}
        </button>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="chat-messages" id="chat-messages">
            {!stepId ? (
              <div className="chat-empty">
                <div className="chat-empty-icon">💬</div>
                <strong>Select a step to inspect</strong>
                <p>Click any line in your working on the left to start a contextual discussion scoped to that step.</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-empty">
                <div className="chat-empty-icon">💡</div>
                <strong>Discussing Step {stepNumber}</strong>
                <p>Ask anything about this specific step — I will explain the mathematical reasoning, provide hints, and show examples.</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`chat-msg-row ${msg.role === 'user' ? 'user' : 'bot'}`}>
                  {msg.role === 'bot' && <BotAvatar />}
                  <div className="chat-msg-content">
                    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
                      {msg.role === 'bot' ? (
                        <ScannableChatMessage text={msg.text} />
                      ) : (
                        msg.text
                      )}
                    </div>
                    <div className={`chat-time ${msg.role === 'user' ? 'text-right' : ''}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}

            {isTyping && (
              <div className="chat-msg-row bot">
                <BotAvatar />
                <div className="chat-bubble chat-bubble-bot chat-typing">
                  <span/><span/><span/>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Dynamic Suggested Questions */}
          {stepId && messages.length <= 4 && (
            <div className="chat-suggestions">
              <div className="chat-suggestions-label">Suggested doubts:</div>
              <div className="chat-suggestions-list">
                {dynamicSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    className="chat-suggestion-btn"
                    onClick={() => handleSend(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="chat-input-row">
            <input
              id="chat-input"
              type="text"
              className="chat-input"
              placeholder={stepId ? `Ask about Step ${stepNumber}…` : "Select a step first…"}
              value={input}
              disabled={!stepId}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="btn-icon chat-send-btn"
              id="btn-chat-send"
              onClick={() => handleSend()}
              disabled={!stepId || !input.trim()}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
