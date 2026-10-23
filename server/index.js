import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { analyzeSubmission, transcribeImage, verifyAttemptWithAI, tutorChat } from './analysis.js';

// Load private local settings from the project root without overriding shell env values.
const envPath = fileURLToPath(new URL('../.env', import.meta.url));
try {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

export async function handleAnalysisRequest(request, response) {
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
  const route = request.url?.split('?')[0];
  if (request.method !== 'POST' || !['/api/analyze', '/api/chat'].includes(route)) { response.writeHead(404).end(); return; }
  try {
    let raw = '';
    for await (const chunk of request) {
      raw += chunk;
      if (raw.length > 14 * 1024 * 1024) throw Object.assign(new Error('Request exceeds the 10 MB image limit.'), { statusCode: 413 });
    }
    const input = JSON.parse(raw || '{}');
    if (route === '/api/chat') {
      const answer = await tutorChat(input);
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ answer }));
      return;
    }
    let question = input.question;
    let text = input.text;
    let transcription = null;
    if (input.image) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(input.mimeType)) throw Object.assign(new Error('Use a PNG, JPG, or WebP image.'), { statusCode: 400 });
      const bytes = Buffer.from(input.image, 'base64');
      const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      const isWebp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
      if (bytes.length > 10 * 1024 * 1024) throw Object.assign(new Error('The image must be 10 MB or smaller.'), { statusCode: 413 });
      if (!(input.mimeType === 'image/png' && isPng || input.mimeType === 'image/jpeg' && isJpeg || input.mimeType === 'image/webp' && isWebp)) throw Object.assign(new Error('The image content does not match its file type.'), { statusCode: 400 });
    }
    if (input.image && !(question?.trim() && text?.trim())) {
      transcription = await transcribeImage({ image: input.image, mimeType: input.mimeType });
      if (transcriptionNeedsConfirmation(transcription)) {
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'needs_confirmation', transcription }));
        return;
      }
      question ||= transcription.question;
      text ||= transcription.steps.join('\n');
    }
    if (/^(?:(?:question|q)\.?\s*)?\d{1,4}\s*[).:]?$/i.test(String(question || '').trim())) {
      const pendingTranscription = transcription || { question, steps: String(text || '').split(/\r?\n/).filter(Boolean), confidence: null, unclear: true };
      pendingTranscription.unclear = true;
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'needs_confirmation', transcription: pendingTranscription }));
      return;
    }
    const attempt = analyzeSubmission({ question: question || '', text: text || '' });
    await verifyAttemptWithAI(attempt, { question: question || '', text: text || '' });
    attempt.transcriptionConfidence = transcription?.confidence ?? null;
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: attempt.analysisStatus, transcription: transcription || { question, steps: String(text || '').split(/\r?\n/).filter(Boolean), confidence: null, unclear: false }, attempt }));
  } catch (error) {
    const status = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
    if (status >= 500) console.error('Analysis request failed:', error.message);
    response.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message || 'Analysis failed.' }));
  }
}

export function transcriptionNeedsConfirmation(transcription) {
  return !transcription || transcription.unclear === true || Number(transcription.confidence) < 0.65
    || !Array.isArray(transcription.steps) || transcription.steps.length === 0
    || !String(transcription.question || '').trim()
    || /^(?:(?:question|q)\.?\s*)?\d{1,4}\s*[).:]?$/i.test(String(transcription.question || '').trim());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.API_PORT || 3001);
  createServer(handleAnalysisRequest).listen(port, () => console.log(`Viskora analysis API listening on ${port}`));
}
