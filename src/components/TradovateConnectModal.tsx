// src/components/TradovateConnectModal.tsx
import { useState, useCallback } from 'react';
import { X, Link2, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, Zap, Shield, Pencil, Trash2, Check } from 'lucide-react';
import { useTradovate, type TradovateEnv } from '@/hooks/useTradovate';

interface Props {
  onClose: () => void;
  onAddConnection?: () => void;
  initialStep?: Step;
  env?: TradovateEnv;
}

type Step = 'select-env' | 'credentials' | 'connected' | 'manage';

export default function TradovateConnectModal({ onClose, onAddConnection, initialStep = 'select-env', env }: Props) {
  const { credentials, liveCredential, demoCredential, hasLiveConnection, hasDemoConnection,
          connect, disconnect, triggerSync, updateLabel, isLoading } = useTradovate();
  
  const [step, setStep] = useState<Step>(initialStep);
  const [selectedEnv, setSelectedEnv] = useState<TradovateEnv>(env ?? 'live');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connectionLabel, setConnectionLabel] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  // ── Manage state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const handleConnect = useCallback(async () => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    setError('');
    const result = await connect(selectedEnv, username.trim(), password, connectionLabel);
    if (result.success) {
      setStep('connected');
      setPassword('');
    } else {
      setError(result.error || 'Connection failed. Check your credentials.');
    }
  }, [connect, selectedEnv, username, password, connectionLabel]);

  const handleDisconnect = useCallback(async (env: TradovateEnv) => {
    await disconnect(env);
  }, [disconnect]);

  const handleAddConnection = useCallback(() => {
    if (onAddConnection) {
      onAddConnection();
      return;
    }
    setStep('select-env');
  }, [onAddConnection]);

  const credential = selectedEnv === 'live' ? liveCredential : demoCredential;
  const isAlreadyConnected = credential?.status === 'connected';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#111111] border border-[#C9A646]/20 rounded-[24px] shadow-[0_0_80px_rgba(201,166,70,0.12)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Tradovate Sync</h2>
              <p className="text-xs text-zinc-500">Auto-import your trades</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Security note */}
        <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs text-emerald-400">Credentials are encrypted with AES-256. We never store plaintext passwords.</span>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Environment selector */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">Environment</label>
            <div className="grid grid-cols-2 gap-2">
              {(['live', 'demo'] as TradovateEnv[]).map(env => {
                const cred = env === 'live' ? liveCredential : demoCredential;
                const connected = cred?.status === 'connected';
                return (
                  <button
                    key={env}
                    onClick={() => { setSelectedEnv(env); setError(''); }}
                    className={`relative flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      selectedEnv === env
                        ? 'bg-[#C9A646]/10 border-[#C9A646]/40 text-[#C9A646]'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span className="capitalize font-semibold">{env}</span>
                    {connected && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                    )}
                    {!connected && cred?.status === 'error' && (
                      <span className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                    {!connected && !cred && (
                      <span className="text-[10px] text-zinc-600">Not connected</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connected state for selected env */}
          {isAlreadyConnected ? (
            <div className="space-y-3">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">Connected</span>
                </div>
                {credential?.account_name && (
                  <p className="text-xs text-zinc-400">Account: <span className="text-white">{credential.account_name}</span></p>
                )}
                {credential?.last_sync_at && (
                  <p className="text-xs text-zinc-500">
                    Last sync: {new Date(credential.last_sync_at).toLocaleString('en-US')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => triggerSync(selectedEnv)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/20 text-[#C9A646] text-sm font-medium hover:bg-[#C9A646]/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Sync Now
                </button>
                <button
                  onClick={() => handleDisconnect(selectedEnv)}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-all disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            /* Credentials form */
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                  Connection Label <span className="normal-case text-zinc-600">(optional — e.g. "Live Account")</span>
                </label>
                <input
                  type="text"
                  value={connectionLabel}
                  onChange={e => setConnectionLabel(e.target.value)}
                  placeholder="My Live Account"
                  autoComplete="off"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#C9A646]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Tradovate Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your@email.com or username"
                  autoComplete="off"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#C9A646]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleConnect()}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#C9A646]/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-400">{error}</span>
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={isLoading || !username || !password}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#C9A646] to-[#E8C56A] text-black text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Connect {selectedEnv === 'live' ? 'Live' : 'Demo'} Account</>
                )}
              </button>
            </div>
          )}

          {/* Trade Copier section (if premium) */}
          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
            <p className="text-[11px] text-zinc-600">
              Trades sync every 5 minutes · Trade Copier available after connection
            </p>
            {credentials.length > 0 && (
              <button
                onClick={() => setStep('manage')}
                className="text-[11px] text-[#C9A646] hover:text-[#E5C158] transition-colors font-medium flex-shrink-0 ml-2"
              >
                Manage →
              </button>
            )}
          </div>

          {/* ── MANAGE VIEW — luxury overlay inside modal ── */}
          {step === 'manage' && (
            <div
              className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-[24px] border border-[#C9A646]/15 bg-[#101010] shadow-[0_26px_90px_rgba(0,0,0,0.62)]"
              style={{ background: 'linear-gradient(150deg, rgba(18,18,18,0.98) 0%, rgba(10,10,10,0.99) 100%)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 flex-shrink-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent)]"
                style={{ borderBottom: '1px solid rgba(201,166,70,0.12)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A646]/25 bg-[#C9A646]/10 shadow-[0_0_26px_rgba(201,166,70,0.12)]">
                    <Link2 className="w-4 h-4 text-[#C9A646]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold leading-tight text-white tracking-tight">Manage Connections</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {credentials.length} connection{credentials.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { onClose(); setEditingId(null); setEditingLabel(''); }}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-zinc-800"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Connections list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {credentials.map(cred => {
                  const isConnected = cred.status === 'connected';
                  const isExpired   = cred.status === 'expired';
                  const syncMins    = cred.last_sync_at
                    ? Math.floor((Date.now() - new Date(cred.last_sync_at).getTime()) / 60000)
                    : null;

                  return (
                    <div key={cred.id}
                      className="rounded-[18px] overflow-hidden transition-all duration-200"
                      style={{
                        background: isConnected
                          ? 'linear-gradient(135deg, rgba(30,52,41,0.42) 0%, rgba(15,15,15,0.96) 58%)'
                          : 'linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.012) 100%)',
                        border: isConnected
                          ? '1px solid rgba(74,210,149,0.28)'
                          : isExpired
                          ? '1px solid rgba(227,99,99,0.2)'
                          : '1px solid rgba(255,255,255,0.07)',
                        boxShadow: isConnected
                          ? '0 18px 36px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.035)',
                      }}
                    >
                      {/* Top status bar */}
                      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isConnected ? 'bg-emerald-400 animate-pulse' :
                          isExpired   ? 'bg-red-400' : 'bg-zinc-600'
                        }`} />
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide ${
                          cred.environment === 'live'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : 'bg-blue-500/12 text-blue-300'
                        }`}>
                          {cred.environment.toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-medium ${
                          isConnected ? 'text-emerald-400' :
                          isExpired   ? 'text-red-400' : 'text-zinc-500'
                        }`}>
                          {isConnected && syncMins !== null
                            ? syncMins < 1 ? 'Synced just now' : `Synced ${syncMins}m ago`
                            : cred.status}
                        </span>
                      </div>

                      {/* Label row */}
                      <div className="px-5 pb-4">
                        {editingId === cred.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              autoFocus
                              value={editingLabel}
                              onChange={e => setEditingLabel(e.target.value)}
                              onKeyDown={async e => {
                                if (e.key === 'Enter') {
                                  const res = await updateLabel(cred.id, editingLabel);
                                  if (res?.success) setEditingId(null);
                                }
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              placeholder="e.g. Live Account"
                              className="flex-1 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-colors"
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(201,166,70,0.5)',
                              }}
                            />
                            <button
                              onClick={async () => {
                                const res = await updateLabel(cred.id, editingLabel);
                                if (res?.success) setEditingId(null);
                              }}
                              disabled={isLoading || !editingLabel.trim()}
                              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl text-black font-bold transition-all hover:opacity-90 disabled:opacity-40"
                              style={{ background: 'linear-gradient(135deg, #C9A646, #E5C158)' }}
                            >
                              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <div className="min-w-0">
                              <div className="text-base font-semibold text-white truncate">
                                {cred.connection_label || `Tradovate (${cred.environment})`}
                              </div>
                              <div className="text-xs text-zinc-500 mt-1 truncate">
                                {cred.account_name || cred.account_id}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => { setEditingId(cred.id); setEditingLabel(cred.connection_label || ''); }}
                                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                                title="Rename"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm('Remove this connection? This cannot be undone.')) return;
                                  await disconnect(cred.environment as TradovateEnv, cred.id);
                                }}
                                disabled={isLoading}
                                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all text-zinc-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Remove"
                              >
                                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer — add new */}
              <div className="px-5 pb-5 flex-shrink-0">
                <button
                  onClick={handleAddConnection}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] text-sm font-semibold transition-all hover:bg-[#C9A646]/10"
                  style={{
                    background: 'rgba(201,166,70,0.06)',
                    border: '1px solid rgba(201,166,70,0.15)',
                    color: '#C9A646',
                  }}
                >
                  <span className="text-base font-bold leading-none">+</span>
                  Add New Connection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
