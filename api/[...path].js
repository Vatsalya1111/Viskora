import { handleAnalysisRequest } from '../server/index.js';

export default async function handler(request, response) {
  return handleAnalysisRequest(request, response);
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '4mb' },
  },
};
