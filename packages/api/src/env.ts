import { config } from 'dotenv';
import path from 'node:path';
import { existsSync } from 'node:fs';

/* Monorepo: load repo-root .env when dev runs from packages/api */
const rootEnv = path.resolve(process.cwd(), '..', '..', '.env');
const localEnv = path.resolve(process.cwd(), '.env');
if (existsSync(rootEnv)) config({ path: rootEnv });
if (existsSync(localEnv)) config({ path: localEnv, override: true });
