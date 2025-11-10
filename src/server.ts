// finotaur-server/src/server.ts  — CLEAN MOUNT
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routers
import fundamentalsRouter from './routes/fundamentals';   // unified /all
import secRouter from './routes/sec';
import secFilingsRouter from './routes/secFilings';
import secLatestRouter from './routes/secLatest';
import secTickersRouter from './routes/secTickers';
import secFactsRouter from './routes/secFacts';
import secUtilsRouter from './routes/secUtils';
import secFilesRouter from './routes/secFiles';
import stocksRouter from './routes/stocks';
import quoteRouter from './routes/quote';
import fredRouter from './routes/fred';
import edgarRouter from './routes/edgar';
import analystRouter from './routes/analyst';
import newsCustomRouter from './routes/news.custom';

dotenv.config();

const app = express();

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : undefined, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health + whoami
app.get('/api/_whoami', (_req, res) => res.json({ version: 'server-consolidated-v1' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- ROUTES (single mounts) ----
app.use('/api/fundamentals', fundamentalsRouter); // => /api/fundamentals/all
app.use('/api/sec/files', secFilesRouter);
app.use('/api/sec', secTickersRouter);
app.use('/api/sec', secFilingsRouter);
app.use('/api/sec', secLatestRouter);
app.use('/api/sec', secFactsRouter);
app.use('/api/sec', secUtilsRouter);
app.use('/api/sec', secRouter);

app.use('/api', stocksRouter);
app.use(quoteRouter);
app.use('/api', fredRouter);
app.use('/api', edgarRouter);
app.use('/api/analyst', analystRouter);
app.use('/api/news', newsCustomRouter);

// 404
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => { console.log('[finotaur] server-consolidated-v1 listening on :' + PORT); });

export default app;
