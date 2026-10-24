import { handleAnalysisRequest } from '../server/index.js';

export function createApiHandler(route) {
  return async function apiHandler(request, response) {
    // Vercel invokes each file-backed function at its own URL. Set the canonical
    // route explicitly so the shared API handler sees the same path locally and
    // in production, regardless of how the runtime represents request.url.
    const originalUrl = request.url;
    request.url = `${route}${originalUrl?.includes('?') ? originalUrl.slice(originalUrl.indexOf('?')) : ''}`;
    return handleAnalysisRequest(request, response);
  };
}
