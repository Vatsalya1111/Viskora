import './loadEnv.js';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { analyzeSubmission, transcribeImage, verifyAttemptWithAI, tutorChat } from './analysis.js';
import { register, login, authenticate, logout, currentProfile, createClass, joinClass, saveReport, ownReport, classReports } from './accountStore.js';

export async function handleAnalysisRequest(request, response) {
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
  const route = request.url?.split('?')[0];
  const accountRoutes = ['/api/auth/register', '/api/auth/login', '/api/auth/logout', '/api/me', '/api/classes', '/api/classes/join', '/api/reports/self', '/api/reports/classes'];
  if (!accountRoutes.includes(route) && (request.method !== 'POST' || !['/api/analyze', '/api/chat'].includes(route))) { response.writeHead(404).end(); return; }
  try {
    let input;
    if (request.body !== undefined) {
      input = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body;
    } else {
      let raw = '';
      for await (const chunk of request) {
        raw += chunk;
        if (raw.length > 14 * 1024 * 1024) throw Object.assign(new Error('Request exceeds the 10 MB image limit.'), { statusCode: 413 });
      }
      input = JSON.parse(raw || '{}');
    }
    if (route === '/api/auth/register' || route === '/api/auth/login') {
      const result = route.endsWith('register') ? await register(input) : await login(input);
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
      return;
    }
    const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const user = await authenticate(token);
    if (route === '/api/auth/logout' && request.method === 'POST') {
      await logout(token);
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ loggedOut: true }));
      return;
    } else if (route === '/api/me' && request.method === 'GET') {
      if (!user) throw Object.assign(new Error('Sign in to continue.'), { statusCode: 401 });
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(await currentProfile(user)));
      return;
    } else if (route === '/api/classes' && request.method === 'POST') {
      const item = await createClass(user, input);
      response.writeHead(201, { 'Content-Type': 'application/json' }).end(JSON.stringify(item));
      return;
    } else if (route === '/api/classes/join' && request.method === 'POST') {
      const item = await joinClass(user, input);
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(item));
      return;
    } else if (route === '/api/reports/self' && request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(await ownReport(user)));
      return;
    } else if (route === '/api/reports/self' && request.method === 'PUT') {
      const result = await saveReport(user, input);
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
      return;
    } else if (route === '/api/reports/classes' && request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(await classReports(user)));
      return;
    } else if (accountRoutes.includes(route)) {
      response.writeHead(405).end();
      return;
    }
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

const TRANSCRIPTION_STOPWORDS = /^(?:correct|incorrect|wrong|right|corrected|solution|working|answer|ans|step|steps|question|q|therefore|hence|thus|so|because|check|note|final|final answer|your answer|my answer)[\s:!.→➡➜-]*$/i;

export function cleanTranscriptionLine(value) {
  let line = String(value || '').trim()
    .replace(/^(?:[\u2192\u27a1\u2794➜➝]|->)+\s*/u, '')
    .replace(/^(?:step|line)\s*\d+\s*[:.)-]\s*/i, '')
    .replace(/^(?:correct|incorrect|wrong|right|corrected)\s*[:.-]\s*/i, '')
    .trim();
  if (!line || TRANSCRIPTION_STOPWORDS.test(line)) return '';
  return line;
}

function cleanTranscriptionQuestion(value) {
  const question = String(value || '').trim();
  if (!question || /^(?:transcribed working|handwritten working|solution|working|question)$/i.test(question)) return '';
  return question;
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
