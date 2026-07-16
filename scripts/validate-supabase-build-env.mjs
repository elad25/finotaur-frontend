import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLACEHOLDER_URL = 'https://your-project.supabase.co';
const PLACEHOLDER_KEY = 'your-anon-key';

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  const body = readFileSync(path, 'utf8');
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    out[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
}

function loadViteProductionEnv() {
  const cwd = process.cwd();
  return {
    ...readEnvFile(resolve(cwd, '.env')),
    ...readEnvFile(resolve(cwd, '.env.local')),
    ...readEnvFile(resolve(cwd, '.env.production')),
    ...readEnvFile(resolve(cwd, '.env.production.local')),
    ...process.env,
  };
}

function fail(message) {
  console.error(`[predeploy:supabase] ${message}`);
  process.exit(1);
}

const env = loadViteProductionEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === PLACEHOLDER_URL) {
  fail('VITE_SUPABASE_URL is missing or still set to the placeholder.');
}

if (!supabaseAnonKey || supabaseAnonKey === PLACEHOLDER_KEY) {
  fail('VITE_SUPABASE_ANON_KEY is missing or still set to the placeholder.');
}

if (!supabaseAnonKey.startsWith('sb_publishable_')) {
  fail('VITE_SUPABASE_ANON_KEY must be a Supabase publishable key, not a legacy JWT or service key.');
}

try {
  new URL(supabaseUrl);
} catch {
  fail('VITE_SUPABASE_URL is not a valid URL.');
}

let response;
try {
  response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });
} catch (error) {
  fail(`Could not reach Supabase to validate VITE_SUPABASE_ANON_KEY: ${error.message}`);
}

const body = await response.text();
const lowerBody = body.toLowerCase();
const errorCode = response.headers.get('sb-error-code')?.toLowerCase() ?? '';

if (
  errorCode.includes('unregistered_api_key') ||
  lowerBody.includes('unregistered api key') ||
  lowerBody.includes('legacy api keys are disabled') ||
  lowerBody.includes('invalid api key')
) {
  fail('Supabase rejected VITE_SUPABASE_ANON_KEY. Refusing to build or deploy a broken production bundle.');
}

console.log(`[predeploy:supabase] OK: ${supabaseUrl} accepted the configured publishable key.`);
