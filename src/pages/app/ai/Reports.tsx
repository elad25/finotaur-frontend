
import { PageTemplate } from '@/components/PageTemplate';
import { useLocation } from 'react-router-dom';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function AIReports() {
  const q = useQuery();
  const source = q.get('source') || '';
  const symbol = q.get('symbol') || '';
  const cik = q.get('cik') || '';
  const form = q.get('form') || '';
  const acc = q.get('acc') || '';
  const doc = q.get('doc') || '';

  const hasParams = source && symbol && form && acc && doc;

  const filingUrl = cik && acc && doc
    ? `https://www.sec.gov/Archives/edgar/data/${String(Number(cik))}/${acc.replace(/-/g, '')}/${doc}`
    : '';

  return (
    <PageTemplate
      title="AI Reports"
      description="Automated research reports and market analysis."
    >
      {!hasParams && (
        <div style={{ opacity: 0.7 }}>
          Select a filing from <strong>Stocks → Reports & PDFs</strong> and click <em>Analyze with AI</em>.
        </div>
      )}

      {hasParams && (
        <div style={{ border: '1px solid #2a2a2a', borderRadius: 12, padding: 16, background: '#0c0c0c' }}>
          <div style={{ fontSize: 18, marginBottom: 6 }}>
            Preparing analysis for <strong>{symbol}</strong> • <span style={{ opacity: 0.9 }}>{form}</span>
          </div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12 }}>
            CIK {cik} • Accession {acc}
          </div>
          {filingUrl && (
            <div style={{ marginBottom: 12 }}>
              Original filing:{" "}
              <a href={filingUrl} target="_blank" rel="noreferrer" style={{ color: '#c7a93d' }}>
                Open on EDGAR
              </a>
            </div>
          )}
          <div style={{ opacity: 0.8 }}>
            <em>Job queued…</em> When your server endpoint is ready,
            this page will fetch and render the AI summary.
          </div>
        </div>
      )}
    </PageTemplate>
  );
}
