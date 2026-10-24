import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Keep local `.env` loading ahead of modules that select a database connection.
const envPath = fileURLToPath(new URL('../.env', import.meta.url));
try {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
