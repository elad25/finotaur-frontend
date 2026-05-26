// src/pages/app/admin/PatternLibrary.tsx
// ─────────────────────────────────────────────────────────────────────────
// Pattern Library admin form — Catalyst Intelligence Deck (Tree #2).
// Created 2026-05-26.
//
// Flow: admin types ticker → POST /analyze (Claude pipeline ~20-40s) →
// review the AI's catalyst chain breakdown → click "Save to Library" →
// the pattern feeds back into the scanner as few-shot calibration.
//
// Auth: x-admin-key from localStorage (one-time prompt on first use).
// Route guard: <ProtectedAdminRoute> in App.tsx.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Loader2, Save, Sparkles, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import {
  analyzePattern,
  savePattern,
  getAdminKey,
  setAdminKey,
  type AnalysisResult,
} from '../../../services/patternLibrary.api';

export default function PatternLibrary() {
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [hasKey, setHasKey] = useState<boolean>(!!getAdminKey());
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const onSaveKey = () => {
    if (!adminKeyInput.trim()) return;
    setAdminKey(adminKeyInput);
    setHasKey(true);
    setAdminKeyInput('');
  };

  const onAnalyze = async () => {
    setError(null);
    setSuccess(null);
    setResult(null);
    if (!ticker.trim()) {
      setError('Enter a ticker symbol');
      return;
    }
    setLoading(true);
    try {
      const data = await analyzePattern(ticker);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!result || !result.analysis.first_catalyst) {
      setError('No first catalyst detected — cannot save');
      return;
    }
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const costUsd = Math.round(
        ((result.cost?.anthropic_duration_ms || 0) +
          (result.cost?.perplexity_duration_ms || 0)) *
          0 // placeholder until we surface real cost
      );
      await savePattern({
        ticker: result.move.ticker,
        move_start_date: result.move.moveStartDate,
        move_end_date: result.move.moveEndDate,
        return_pct: result.move.returnPct,
        direction: result.move.direction,
        first_catalyst: result.analysis.first_catalyst,
        second_catalyst: result.analysis.second_catalyst,
        mechanism: result.analysis.mechanism,
        replication_signals: result.analysis.replication_signals,
        admin_reviewed: true,
        admin_notes: adminNotes || null,
        analysis_cost_usd: costUsd || null,
      });
      setSuccess(`Pattern saved for ${result.move.ticker}`);
      setResult(null);
      setTicker('');
      setAdminNotes('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Admin key gate ────────────────────────────────────────────────────
  if (!hasKey) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <KeyRound className="w-5 h-5" style={{ color: '#C9A646' }} />
          <h2 className="text-xl font-semibold text-white">Admin Key Required</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Paste your <code className="px-1 bg-[#0a0a0a] rounded">ADMIN_API_KEY</code>{' '}
          (from Railway env) once. Stored in localStorage only.
        </p>
        <input
          type="password"
          placeholder="Admin key"
          value={adminKeyInput}
          onChange={(e) => setAdminKeyInput(e.target.value)}
          className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white"
        />
        <button
          onClick={onSaveKey}
          disabled={!adminKeyInput.trim()}
          className="mt-4 w-full px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #C9A646 0%, #B8963F 100%)',
            color: '#0F0F0F',
          }}
        >
          Save Key
        </button>
      </div>
    );
  }

  // ─── Main page ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6" style={{ color: '#C9A646' }} />
          Pattern Library — Admin
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Analyze a ticker that delivered a strong move. Claude identifies the
          catalyst chain (first + second catalyst), and the result is saved as
          few-shot calibration for the Catalyst Deck scanner.
        </p>
      </header>

      {/* Analyze form */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Ticker (any US-listed symbol)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. LMT, NVDA, TSLA"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white disabled:opacity-50"
          />
          <button
            onClick={onAnalyze}
            disabled={loading || !ticker.trim()}
            className="px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #B8963F 100%)',
              color: '#0F0F0F',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Claude scans the past 90 days for the biggest move (≥15%) and
          synthesizes the catalyst chain. Takes ~20-40 seconds.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-300 p-3 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Result viewer */}
      {result && <AnalysisViewer result={result} />}

      {/* Save section */}
      {result && result.analysis.first_catalyst && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Admin notes (optional)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Any context the AI missed? Why is this pattern significant?"
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white resize-y"
            />
          </div>
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #B8963F 100%)',
              color: '#0F0F0F',
            }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save to Library
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Viewer ─────────────────────────────────────────────────────────────
function AnalysisViewer({ result }: { result: AnalysisResult }) {
  const a = result.analysis;
  const m = result.move;
  const directionColor = m.direction === 'LONG' ? 'text-green-400' : 'text-red-400';

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 space-y-5">
      {/* Move header */}
      <div className="flex items-baseline justify-between border-b border-[#2a2a2a] pb-4">
        <div>
          <span className="text-2xl font-bold text-white">{m.ticker}</span>
          <span className={`ml-3 text-lg font-semibold ${directionColor}`}>
            {m.direction} {m.returnPct >= 0 ? '+' : ''}
            {m.returnPct}%
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {m.moveStartDate} → {m.moveEndDate} · ${m.startPrice} → ${m.endPrice}
        </div>
      </div>

      {/* First catalyst */}
      {a.first_catalyst ? (
        <CatalystBlock label="First Catalyst" catalyst={a.first_catalyst} />
      ) : (
        <div className="text-yellow-400 text-sm">
          ⚠ No environment catalyst identified — the move may be earnings/M&A/analyst-driven.
        </div>
      )}

      {/* Second catalyst */}
      {a.second_catalyst && (
        <CatalystBlock
          label={`Second Catalyst (${a.second_catalyst.role})`}
          catalyst={{
            date: a.second_catalyst.date,
            category: a.second_catalyst.category,
            summary: a.second_catalyst.summary,
            source_url: a.second_catalyst.source_url,
            earliest_signal: '',
            sector: null,
          }}
          hideSignal
        />
      )}

      {/* Mechanism */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-1">Mechanism</h3>
        <p className="text-white">{a.mechanism}</p>
      </div>

      {/* Replication signals */}
      {a.replication_signals.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            Replication Signals (what to scan for next time)
          </h3>
          <ul className="space-y-1">
            {a.replication_signals.map((s, i) => (
              <li key={i} className="text-white text-sm flex gap-2">
                <span style={{ color: '#C9A646' }}>•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cost cap info */}
      <div className="text-xs text-gray-500 pt-2 border-t border-[#2a2a2a]">
        Usage today: {result.used}/{result.cap} analyses · {result.newsEventsCount}{' '}
        news events collected
      </div>
    </div>
  );
}

interface CatalystBlockProps {
  label: string;
  catalyst: {
    date: string;
    category: string;
    sector?: string | null;
    summary: string;
    earliest_signal: string;
    source_url?: string | null;
  };
  hideSignal?: boolean;
}

function CatalystBlock({ label, catalyst, hideSignal }: CatalystBlockProps) {
  return (
    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-3 text-xs">
        <span
          className="px-2 py-0.5 rounded uppercase tracking-wide font-medium"
          style={{ background: '#C9A64633', color: '#C9A646' }}
        >
          {label}
        </span>
        <span className="text-gray-400">{catalyst.date}</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-300">{catalyst.category}</span>
        {catalyst.sector && (
          <>
            <span className="text-gray-400">·</span>
            <span className="text-gray-300">{catalyst.sector}</span>
          </>
        )}
      </div>
      <p className="text-white text-sm">{catalyst.summary}</p>
      {!hideSignal && catalyst.earliest_signal && (
        <div className="text-xs">
          <span className="text-gray-400">Earliest signal: </span>
          <span className="text-gray-200">{catalyst.earliest_signal}</span>
        </div>
      )}
      {catalyst.source_url && (
        <a
          href={catalyst.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline"
          style={{ color: '#C9A646' }}
        >
          → Source
        </a>
      )}
    </div>
  );
}
