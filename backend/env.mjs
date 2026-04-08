import { existsSync } from 'node:fs';

import dotenv from 'dotenv';

const backendEnvPath = new URL('./.env', import.meta.url);
const backendEnvLocalPath = new URL('./.env.local', import.meta.url);

if (existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

if (existsSync(backendEnvLocalPath)) {
  dotenv.config({ override: true, path: backendEnvLocalPath });
}
