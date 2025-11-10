import 'dotenv/config';

function must(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env ${name}`);
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: must('PORT', '3000'),
  API_URL: must('API_URL', 'http://127.0.0.1:3000'),
  CLIENT_URL: must('CLIENT_URL', 'http://127.0.0.1:8080'),
  CORS_ORIGINS: must('CORS_ORIGINS', 'http://127.0.0.1:8080'),
  JWT_SECRET: must('JWT_SECRET', 'REPLACE_ME_STRONG'),
  TOKEN_EXPIRY: must('TOKEN_EXPIRY', '7d'),
  COOKIE_NAME: must('COOKIE_NAME', 'finotaur_session'),
  COOKIE_SECURE: must('COOKIE_SECURE', 'false'),
  COOKIE_DOMAIN: must('COOKIE_DOMAIN', ''),
  DATABASE_URL: must('DATABASE_URL'),
};
