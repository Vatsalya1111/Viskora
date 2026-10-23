import { handleAnalysisRequest } from './index.js';

export default function analysisApiPlugin() {
  return {
    name: 'viskora-analysis-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/api/analyze') return next();
        handleAnalysisRequest(request, response);
      });
    },
  };
}
