import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const assetsDir = join(distDir, 'assets');

function fail(message) {
  console.error(`[postbuild:supabase] ${message}`);
  process.exit(1);
}

if (!existsSync(assetsDir)) {
  fail('dist/assets does not exist. Run the client build before validating the production bundle.');
}

const jsFiles = readdirSync(assetsDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => join(assetsDir, name));

const supabaseUrls = new Set();
const publishableKeys = new Set();

for (const file of jsFiles) {
  const body = readFileSync(file, 'utf8');
  for (const match of body.matchAll(/https:\/\/[a-z0-9]{20}\.supabase\.co/g)) {
    supabaseUrls.add(match[0]);
  }
  for (const match of body.matchAll(/sb_publishable_[A-Za-z0-9_-]+/g)) {
    publishableKeys.add(match[0]);
  }
}

if (supabaseUrls.size !== 1) {
  fail(`Expected exactly one Supabase URL in the production bundle, found ${supabaseUrls.size}.`);
}

if (publishableKeys.size !== 1) {
  fail(`Expected exactly one Supabase publishable key in the production bundle, found ${publishableKeys.size}.`);
}

const supabaseUrl = [...supabaseUrls][0];
const publishableKey = [...publishableKeys][0];

let response;
try {
  response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
  });
} catch (error) {
  fail(`Could not reach Supabase to validate the built production bundle: ${error.message}`);
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
  fail('The built production bundle contains a Supabase key rejected by the target project.');
}

console.log(`[postbuild:supabase] OK: built bundle key is accepted by ${supabaseUrl}.`);
