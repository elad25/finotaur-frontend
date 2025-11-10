/**
 * src/wire/secureFundamentals.ts
 * Single place to mount Finotaur fundamentals/SEC/quote routes.
 * Import and call from your existing server bootstrap (index.ts/server.ts):
 *
 *   import { wireSecureFundamentals } from "./wire/secureFundamentals";
 *   wireSecureFundamentals(app);
 */
import type { Express } from "express";
import secFilesRouter from "../routes/secFiles";
import secCompanyFactsRouter from "../routes/secCompanyFacts";
import fundamentalsRouter from "../routes/fundamentals";
import quoteRouter from "../routes/quote";

export function wireSecureFundamentals(app: Express) {
  app.use(secFilesRouter);
  app.use(secCompanyFactsRouter);
  app.use(fundamentalsRouter);
  app.use(quoteRouter);
}
