
import express from 'express';
import { v4 as uuid } from 'uuid';

type Job = {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  createdAt: number;
  payload: any;
  result?: any;
  error?: string;
};

const jobs = new Map<string, Job>();
const router = express.Router();

router.post('/analyze-filing', async (req, res) => {
  const { cik, accessionNumber, primaryDocument, symbol, form } = req.body || {};
  if (!cik || !accessionNumber || !primaryDocument || !symbol || !form) {
    return res.status(400).json({ error: 'cik, accessionNumber, primaryDocument, symbol, form are required' });
  }
  const id = uuid();
  const job: Job = {
    id, status: 'queued', createdAt: Date.now(), payload: { cik, accessionNumber, primaryDocument, symbol, form }
  };
  jobs.set(id, job);

  // simulate async processing
  setTimeout(() => {
    const j = jobs.get(id);
    if (!j) return;
    j.status = 'done';
    j.result = {
      summary: `AI summary placeholder for ${symbol} ${form}.`,
      sections: [
        { title: 'Growth & Profitability', text: 'Key growth metrics and margin commentary will appear here.' },
        { title: 'Balance Sheet', text: 'Assets, liabilities, equity trends extracted from XBRL.' },
        { title: 'Cash Flow', text: 'Operating cash flow vs. capex; derived FCF; quality of earnings.' },
        { title: 'Risks & Outlook', text: 'Risk factors and guidance parsing.' },
      ]
    };
    jobs.set(id, j);
  }, 500); // quick placeholder

  res.json({ jobId: id, status: job.status });
});

router.get('/jobs/:id', (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json({ error: 'job not found' });
  res.json({ id: j.id, status: j.status, createdAt: j.createdAt, result: j.result, error: j.error });
});

export default router;
