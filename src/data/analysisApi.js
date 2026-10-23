export async function submitAnalysis({ question, text, file }) {
  let image;
  let mimeType;
  if (file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / bitmap.width, 1800 / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const resized = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not prepare the image.')), 'image/jpeg', 0.88));
    image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Could not read the selected image.'));
      reader.readAsDataURL(resized);
    });
    mimeType = 'image/jpeg';
  }
  let response;
  try {
    response = await fetch('/api/analyze', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    // Image transcription and the AI math review are two sequential Gemini calls.
    signal: AbortSignal.timeout(130000),
    body: JSON.stringify({ question, text, image, mimeType }),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('Analysis took too long. Please retry.');
    throw new Error('Cannot reach the analysis API. Start the app with `npm run dev` from the project folder, then retry.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Analysis request failed (${response.status}).`);
  return body;
}
