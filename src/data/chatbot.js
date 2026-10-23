/**
 * Viskora – Intelligent Chatbot Fallback Engine
 * Provides contextual, scannable responses and suggestions
 * dynamically derived from the actual step, method, and attempt data.
 */

import { CHATBOT_RESPONSES } from './catalogue.js';

/**
 * Generate a scannable, structured response for the student.
 * If a matching pre-seeded response exists, use it.
 * Otherwise, generate a contextual fallback based on user query and step data.
 */
export function generateChatbotResponse({
  userMessage,
  step,
  stepIndex,
  method,
  attempt,
  misconception,
  chatHistory = [],
}) {
  const query = (userMessage || '').toLowerCase().trim();
  const stepNum = (stepIndex ?? 0) + 1;
  const latexStr = step?.latex || '';
  const isWrong = step?.verdict === 'wrong';
  const isCorrect = step?.verdict === 'correct';
  const isValidAlt = step?.verdict === 'valid-alt';

  // 1. Check if pre-seeded response pool has an unconsumed pair for this misconception
  const misconceptionId = method?.misconceptionId;
  const pool = CHATBOT_RESPONSES[misconceptionId] || [];
  const existingBotCount = chatHistory.filter(m => m.role === 'bot').length;

  // If this is an exact match for one of the pre-seeded questions, pick that
  const seededMatch = pool.find((item, idx) => {
    if (item.role === 'user' && pool[idx + 1]?.role === 'bot') {
      const q = item.text.toLowerCase();
      if (query.includes(q) || q.includes(query)) {
        return true;
      }
    }
    return false;
  });

  if (seededMatch) {
    const matchIdx = pool.indexOf(seededMatch);
    if (pool[matchIdx + 1]?.role === 'bot') {
      return formatScannableText(pool[matchIdx + 1].text);
    }
  }

  // 2. Intelligent dynamic fallback response engine based on actual data
  if (isWrong) {
    // A) Student asks "why" or "what's wrong" or "mistake" or "error"
    if (query.includes('why') || query.includes('wrong') || query.includes('error') || query.includes('mistake') || query.includes('incorrect')) {
      const issueNote = step?.note || misconception?.description || 'The standard differentiation/integration rule was not applied completely.';
      const ruleText = misconception?.description || `Check the formula for ${attempt?.concept || 'this topic'}.`;
      const correctForm = method?.correctAnswer || misconception?.probingAnswer || '';

      return [
        `**Diagnosis for Step ${stepNum}:**`,
        `• **Your step:** \`${latexStr}\``,
        `• **The error:** ${issueNote}`,
        `• **Key rule:** ${ruleText}`,
        correctForm ? `• **Correct form:** \`${correctForm}\`` : null,
      ].filter(Boolean).join('\n\n');
    }

    // B) Student asks for a hint or clue or how to fix
    if (query.includes('hint') || query.includes('clue') || query.includes('help') || query.includes('how') || query.includes('stuck')) {
      const hintText = misconception?.followUp?.q2?.hint || (step?.note ? `Watch out: ${step.note}` : 'Identify each component before executing the operation.');

      return [
        `💡 **Hint for Step ${stepNum}:**`,
        `• **Current expression:** \`${latexStr}\``,
        `• **Next move:** ${hintText}`,
        `• **Guiding check:** Write down the general formula first, then identify what each part corresponds to before multiplying or differentiating.`,
      ].join('\n\n');
    }

    // C) Student asks for an example
    if (query.includes('example') || query.includes('show me') || query.includes('sample')) {
      const exampleQ = misconception?.probingQuestion || `a simpler ${attempt?.concept || 'problem'}`;
      const exampleA = misconception?.probingAnswer || 'applied term by term';

      return [
        `📝 **Illustrative Example:**`,
        `• **Test case:** ${exampleQ}`,
        `• **Correct result:** \`${exampleA}\``,
        `• **Takeaway:** Notice how every factor is handled systematically rather than using isolated shortcuts.`,
      ].join('\n\n');
    }

    // D) Student asks for the formula or rule
    if (query.includes('formula') || query.includes('rule') || query.includes('theorem') || query.includes('definition')) {
      return [
        `📌 **Core Mathematical Rule:**`,
        `• **Concept:** ${attempt?.concept || 'Calculus Rule'}`,
        misconception?.name ? `• **Theorem:** ${misconception.name}` : null,
        `• **Statement:** ${misconception?.description || 'Every dependent variable and factor must be differentiated according to its operational law.'}`,
      ].filter(Boolean).join('\n\n');
    }

    // E) General fallback for wrong step
    const defaultNote = step?.note || misconception?.description || 'A conceptual step was missed here.';
    return [
      `**Analyzing Step ${stepNum}:** \`${latexStr}\``,
      `• **Key observation:** ${defaultNote}`,
      `• **Recommendation:** Check if you need to apply the product, quotient, or chain rule rather than operating term-by-term.`,
      `• **Ask me:** You can ask for a hint, the formula, or a step-by-step example!`,
    ].join('\n\n');
  }

  if (isCorrect) {
    if (query.includes('why') || query.includes('correct') || query.includes('how')) {
      return [
        `✅ **Step ${stepNum} is Correct:**`,
        `• **Expression:** \`${latexStr}\``,
        `• **Verification:** ${step?.note || 'This line accurately preserves mathematical equivalence and follows the rule.'}`,
        `• **Next step:** Check how this expression transitions into the next line of working.`,
      ].join('\n\n');
    }

    return [
      `✅ **Step ${stepNum} verified:** \`${latexStr}\``,
      `• You applied the steps accurately here. ${step?.note || ''}`,
      `• Need help checking the subsequent step or understanding why an alternative method might also work?`,
    ].join('\n\n');
  }

  // Fallback for valid-alt or unclassified step
  return [
    `**Regarding Step ${stepNum}:** \`${latexStr}\``,
    `• ${step?.note || 'This represents a valid intermediate step.'}`,
    `• Feel free to ask: *"What rule applies here?"*, *"Can you give me a hint?"*, or *"Show me an example."*`,
  ].join('\n\n');
}

/**
 * Format bot text to ensure bullets and bold text are clean and scannable
 */
function formatScannableText(text) {
  if (!text) return '';
  // If text already has bullets or breaks, return clean
  return text.trim();
}

/**
 * Generate dynamic suggested questions based on the active step and actual data
 */
export function getDynamicSuggestions({ step, stepIndex, method, attempt, misconception }) {
  const stepNum = (stepIndex ?? 0) + 1;
  const isWrong = step?.verdict === 'wrong';

  if (isWrong) {
    return [
      `Why is Step ${stepNum} incorrect?`,
      `Give me a hint for this step`,
      `Show me an example of ${attempt?.concept || 'this rule'}`,
    ];
  }

  return [
    `Why is Step ${stepNum} correct?`,
    `What should I watch out for in the next step?`,
    `Can this be solved with another method?`,
  ];
}

/**
 * Asynchronously query the Google Gemini API using the provided API key,
 * with automatic fallback to the local response engine.
 */
export async function queryGeminiTutor({
  userMessage,
  step,
  stepIndex,
  method,
  attempt,
  misconception,
  chatHistory = [],
}) {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;

  if (apiKey) {
    try {
      const stepNum = (stepIndex ?? 0) + 1;
      const isWrong = step?.verdict === 'wrong';
      const prompt = `You are Viskora, an expert AI math tutor for university students.
The student is working through this problem:
- Problem: "${attempt?.problem?.displayText || 'Math problem'}"
- Concept: "${attempt?.concept || 'Calculus'}"
- Solution Method: "${method?.label || 'Method'}"
- Inspected Step (${stepNum}): "${step?.latex || step?.note || ''}"
- Status: ${isWrong ? `Contains error. Diagnosis: ${step?.note || misconception?.description || 'Error in rule application'}` : 'Correct line.'}
- Misconception diagnosis: "${misconception?.name || 'N/A'}"
- Target correct formulation: "${method?.correctAnswer || ''}"

Student asks: "${userMessage}"

Instructions:
1. Provide a concise, highly scannable response (max 4-5 short lines).
2. Use bullet points (•) and bold keywords (**keyword**) so the student can scan it in 3 seconds.
3. Use backticks (\`...\`) for formulas and algebraic terms.
4. Be Socratic and encouraging: guide their intuition without dumping unnecessary boilerplate.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 350,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return text.trim();
        }
      }
    } catch (err) {
      console.warn('Gemini live call error, falling back to local engine:', err);
    }
  }

  // Graceful fallback to built-in structured response engine
  return generateChatbotResponse({
    userMessage,
    step,
    stepIndex,
    method,
    attempt,
    misconception,
    chatHistory,
  });
}

