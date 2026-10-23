/**
 * MathRenderer – renders LaTeX using KaTeX (npm package).
 * Structured to swap to a server-side rendering API if needed.
 */
import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function renderKatex(latex, element, display = false) {
  if (!element || !latex) return;
  try {
    katex.render(latex, element, {
      throwOnError: false,
      displayMode: display,
      output: 'html',
      trust: false,
    });
  } catch (e) {
    if (element) element.textContent = latex;
  }
}

export function Math({ latex, display = false, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && latex) {
      renderKatex(latex, ref.current, display);
    }
  }, [latex, display]);

  return (
    <span
      ref={ref}
      className={`${display ? 'math-display' : 'math-inline'} ${className}`}
      aria-label={latex}
    />
  );
}

/** Renders a string that may contain **bold** markdown */
export function RichText({ text, className = '' }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
