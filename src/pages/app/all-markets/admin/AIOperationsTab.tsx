import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Price } from '@/components/ds/NumberDisplay';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertTriangle, DollarSign, Loader2, RefreshCw, Cpu, XCircle, CheckCircle2, ShieldOff } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CostByService { service: string; usd: number; count: number; }
interface CostDay { day: string; usd: number; count: number; }
interface CostData {
  todayUsd: number; budgetUsd: number; budgetRemainingUsd: number;
  callsToday: number; byService: CostByService[]; last7d: CostDay[];
  cacheHitRate: number | null; cacheCalls: number;
  killSwitch: boolean; budgetExceeded: boolean; generatedAt: string;
}
interface ServiceInfo {
  name: string; enabled: boolean; runtimeOverride: boolean | null;
  todayUsd: number; callsToday: number; envVar: string;
}
interface ServiceData {
  services: ServiceInfo[]; killSwitch: boolean; budgetExceeded: boolean;
  dailySpendUsd: number; dailyBudgetUsd: number; generatedAt: string;
}
interface ErrorEntry { ts: string; path: string; status: number; message: string; requestId?: string; }
interface ErrorsData { errors: ErrorEntry[]; count: number; generatedAt: string; }

// ---------------------------------------------------------------------------
// Auth helper + utility
// ---------------------------------------------------------------------------

async function adminFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { error?: string; message?: string }));
    throw new Error(body.error || body.message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function formatServiceName(name: string): string {
  return name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function CostSkeleton() {
  return (
    <div className="space-y-ds-3">
      <div className="grid grid-cols-3 gap-ds-3">
        <Skeleton className="h-24 rounded-[12px]" />
        <Skeleton className="h-24 rounded-[12px]" />
        <Skeleton className="h-24 rounded-[12px]" />
      </div>
      <Skeleton className="h-48 rounded-[12px]" />
    </div>
  );
}

function ServicesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-ds-3">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-32 rounded-[12px]" />)}
    </div>
  );
}

function ErrorsSkeleton() {
  return (
    <div className="space-y-ds-2">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-md" />)}
    </div>
  );
}

function ErrorAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-ds-4 rounded-[12px] bg-red-500/10 border-[0.5px] border-red-500/20 flex items-center justify-between">
      <div className="flex items-center gap-ds-2">
        <XCircle className="w-4 h-4 text-red-400" />
        <span className="text-red-400 text-[13px]">{message}</span>
      </div>
      <Button variant="ghost" size="sm" showArrow={false} onClick={onRetry} className="text-[12px]">Retry</Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AIOperationsTab() {
  const [costData, setCostData] = useState<CostData | null>(null);
  const [servicesData, setServicesData] = useState<ServiceData | null>(null);
  const [errorsData, setErrorsData] = useState<ErrorsData | null>(null);
  const [loading, setLoading] = useState({ cost: true, services: true, errors: true });
  const [error, setError] = useState<{ cost: string | null; services: string | null; errors: string | null }>({ cost: null, services: null, errors: null });
  const [togglingService, setTogglingService] = useState<string | null>(null);
  const [errorMinStatus, setErrorMinStatus] = useState<number>(0);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    service: ServiceInfo | null;
    newEnabled: boolean;
    typedName: string;
  }>({ open: false, service: null, newEnabled: false, typedName: '' });

  const closeConfirmModal = useCallback(() => {
    setConfirmModal({ open: false, service: null, newEnabled: false, typedName: '' });
  }, []);

  const fetchCost = useCallback(async () => {
    setLoading(s => ({ ...s, cost: true }));
    setError(e => ({ ...e, cost: null }));
    try {
      const data = await adminFetch<CostData>('/api/admin/ai-ops/cost');
      setCostData(data);
    } catch (e) {
      setError(s => ({ ...s, cost: e instanceof Error ? e.message : 'Failed to load cost data' }));
    } finally {
      setLoading(s => ({ ...s, cost: false }));
    }
  }, []);

  const fetchServices = useCallback(async () => {
    setLoading(s => ({ ...s, services: true }));
    setError(e => ({ ...e, services: null }));
    try {
      const data = await adminFetch<ServiceData>('/api/admin/ai-ops/services');
      setServicesData(data);
    } catch (e) {
      setError(s => ({ ...s, services: e instanceof Error ? e.message : 'Failed to load services' }));
    } finally {
      setLoading(s => ({ ...s, services: false }));
    }
  }, []);

  const fetchErrors = useCallback(async (minStatus: number) => {
    setLoading(s => ({ ...s, errors: true }));
    setError(e => ({ ...e, errors: null }));
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (minStatus > 0) params.set('minStatus', String(minStatus));
      const data = await adminFetch<ErrorsData>(`/api/admin/ai-ops/errors?${params}`);
      setErrorsData(data);
    } catch (e) {
      setError(s => ({ ...s, errors: e instanceof Error ? e.message : 'Failed to load errors' }));
    } finally {
      setLoading(s => ({ ...s, errors: false }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    void fetchCost();
    void fetchServices();
    void fetchErrors(0);
  }, [fetchCost, fetchServices, fetchErrors]);

  // Auto-refresh every 30s. Cleanup runs when parent unmounts component
  // (parent uses conditional render: {activeTab === 'ai-ops' && <AIOperationsTab />})
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchCost();
      void fetchServices();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchCost, fetchServices]);

  // Refetch errors when filter changes
  useEffect(() => {
    void fetchErrors(errorMinStatus);
  }, [errorMinStatus, fetchErrors]);

  const toggleService = useCallback(async (name: string, newEnabled: boolean) => {
    setTogglingService(name);
    try {
      await adminFetch('/api/admin/ai-ops/kill-switch', {
        method: 'POST',
        body: JSON.stringify({ service: name, enabled: newEnabled }),
      });
      await fetchServices();
    } catch (e) {
      setError(s => ({ ...s, services: e instanceof Error ? e.message : 'Toggle failed' }));
    } finally {
      setTogglingService(null);
    }
  }, [fetchServices]);

  const clearOverride = useCallback(async (name: string) => {
    setTogglingService(name);
    try {
      await adminFetch('/api/admin/ai-ops/kill-switch', {
        method: 'POST',
        body: JSON.stringify({ service: name, clear: true }),
      });
      await fetchServices();
    } catch (e) {
      setError(s => ({ ...s, services: e instanceof Error ? e.message : 'Clear override failed' }));
    } finally {
      setTogglingService(null);
    }
  }, [fetchServices]);

  const handleConfirmToggle = useCallback(async () => {
    if (!confirmModal.service) return;
    const { service, newEnabled } = confirmModal;
    closeConfirmModal();
    await toggleService(service.name, newEnabled);
  }, [confirmModal, closeConfirmModal, toggleService]);

  return (
    <div className="space-y-ds-5">

      {/* ------------------------------------------------------------------ */}
      {/* Cost Panel                                                          */}
      {/* ------------------------------------------------------------------ */}
      <Card variant="default" padding="default">
        <header className="flex items-center justify-between mb-ds-4">
          <div className="flex items-center gap-ds-2">
            <DollarSign className="w-5 h-5 text-gold-primary" />
            <h3 className="text-[18px] font-medium text-ink-primary">AI Cost Overview</h3>
          </div>
          {costData && (
            <span className="text-[11px] text-ink-tertiary font-mono">
              Updated {new Date(costData.generatedAt).toLocaleTimeString()}
            </span>
          )}
        </header>

        {loading.cost && !costData && <CostSkeleton />}
        {error.cost && <ErrorAlert message={error.cost} onRetry={() => void fetchCost()} />}

        {costData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-ds-3 mb-ds-4">
              <div className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] p-ds-4">
                <div className="text-[11px] uppercase tracking-[1.5px] text-ink-tertiary mb-ds-2">Today's Spend</div>
                <div className="flex items-baseline gap-ds-1 mb-ds-2">
                  <Price value={costData.todayUsd} size="large" format="currency" decimals={2} />
                  <span className="text-ink-tertiary text-[13px] font-mono">/ ${costData.budgetUsd.toFixed(2)}</span>
                </div>
                <Progress value={Math.min(100, (costData.todayUsd / Math.max(costData.budgetUsd, 0.01)) * 100)} className="h-1.5" />
              </div>
              <div className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] p-ds-4">
                <div className="text-[11px] uppercase tracking-[1.5px] text-ink-tertiary mb-ds-2">Calls Today</div>
                <div className="font-mono tabular-nums text-[28px] text-ink-primary leading-none">
                  {costData.callsToday.toLocaleString()}
                </div>
              </div>
              <div className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] p-ds-4">
                <div className="text-[11px] uppercase tracking-[1.5px] text-ink-tertiary mb-ds-2">Cache Hit Rate</div>
                <div className="font-mono tabular-nums text-[28px] text-ink-primary leading-none">
                  {costData.cacheHitRate !== null ? `${(costData.cacheHitRate * 100).toFixed(1)}%` : 'N/A'}
                </div>
                <div className="text-[11px] text-ink-tertiary mt-ds-1">{costData.cacheCalls} cached</div>
              </div>
            </div>

            {costData.killSwitch && (
              <div className="mb-ds-4 p-ds-3 rounded-[12px] bg-red-500/10 border-[0.5px] border-red-500/20 flex items-center gap-ds-2">
                <ShieldOff className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-[13px] font-medium">GLOBAL KILL SWITCH ACTIVE — All AI services disabled</span>
              </div>
            )}
            {costData.budgetExceeded && !costData.killSwitch && (
              <div className="mb-ds-4 p-ds-3 rounded-[12px] bg-amber-500/10 border-[0.5px] border-amber-500/20 flex items-center gap-ds-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-[13px] font-medium">DAILY BUDGET EXCEEDED</span>
              </div>
            )}

            <div className="mb-ds-4">
              <div className="text-[11px] uppercase tracking-[1.5px] text-ink-tertiary mb-ds-3">7-Day Spend</div>
              <div className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] p-ds-3">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={costData.last7d}>
                    {/* Recharts SVG attrs require literal colors — these match var(--gold-primary) and DS surface tokens */}
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                      tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                      tickFormatter={(v: number) => `$${Number(v).toFixed(2)}`}
                    />
                    <Tooltip
                      contentStyle={{ background: 'rgba(20,20,20,0.95)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff' }}
                      formatter={(v: number) => [`$${v.toFixed(4)}`, 'Spend']}
                    />
                    <Area type="monotone" dataKey="usd" stroke="#C9A646" fill="#C9A646" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[1.5px] text-ink-tertiary mb-ds-3">By Service</div>
              {costData.byService.length === 0 ? (
                <div className="text-ink-secondary text-[13px] py-ds-4 text-center">No AI calls today</div>
              ) : (
                <div className="space-y-ds-1">
                  {costData.byService.map((row) => (
                    <div key={row.service} className="flex items-center justify-between p-ds-3 bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-md hover:border-border-ds-default transition-colors">
                      <span className="text-ink-primary text-[13px]">{formatServiceName(row.service)}</span>
                      <div className="flex items-center gap-ds-4">
                        <span className="text-ink-tertiary text-[11px] font-mono tabular-nums">{row.count} calls</span>
                        <Price value={row.usd} size="small" format="currency" decimals={4} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Services Panel                                                      */}
      {/* ------------------------------------------------------------------ */}
      <Card variant="default" padding="default">
        <header className="flex items-center justify-between mb-ds-4">
          <div className="flex items-center gap-ds-2">
            <Cpu className="w-5 h-5 text-gold-primary" />
            <h3 className="text-[18px] font-medium text-ink-primary">Service Status</h3>
          </div>
          {servicesData && (
            <div className="flex items-center gap-ds-2">
              {servicesData.killSwitch && <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Kill Switch</Badge>}
              {servicesData.budgetExceeded && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Over Budget</Badge>}
            </div>
          )}
        </header>

        {loading.services && !servicesData && <ServicesSkeleton />}
        {error.services && <ErrorAlert message={error.services} onRetry={() => void fetchServices()} />}

        {servicesData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-ds-3">
            {servicesData.services.map((svc) => (
              <div key={svc.name} className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] p-ds-4 hover:border-border-ds-default transition-colors">
                <div className="flex items-start justify-between mb-ds-3">
                  <div>
                    <div className="text-ink-primary text-[14px] font-medium mb-ds-1">{formatServiceName(svc.name)}</div>
                    <div className="flex items-center gap-ds-1">
                      <Badge className={svc.enabled ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
                        {svc.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {svc.runtimeOverride !== null && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Override</Badge>}
                    </div>
                  </div>
                  {togglingService === svc.name ? (
                    <Loader2 className="w-4 h-4 text-ink-tertiary animate-spin" />
                  ) : (
                    <Switch
                      checked={svc.enabled}
                      onCheckedChange={(checked) => setConfirmModal({ open: true, service: svc, newEnabled: checked, typedName: '' })}
                      disabled={togglingService !== null}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-tertiary mb-ds-2">
                  <span className="font-mono">{svc.callsToday} calls today</span>
                  <Price value={svc.todayUsd} size="small" format="currency" decimals={4} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-ink-tertiary font-mono">{svc.envVar}</span>
                  {svc.runtimeOverride !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      showArrow={false}
                      onClick={() => void clearOverride(svc.name)}
                      disabled={togglingService !== null}
                      className="text-[11px] h-6 px-ds-2"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Errors Panel                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Card variant="default" padding="default">
        <header className="flex items-center justify-between mb-ds-4">
          <div className="flex items-center gap-ds-2">
            <AlertTriangle className="w-5 h-5 text-gold-primary" />
            <h3 className="text-[18px] font-medium text-ink-primary">Recent Errors</h3>
          </div>
          <div className="flex items-center gap-ds-2">
            <Select value={String(errorMinStatus)} onValueChange={(v) => setErrorMinStatus(Number(v))}>
              <SelectTrigger className="w-[120px] h-8 text-[12px] bg-surface-1 border-border-ds-subtle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All</SelectItem>
                <SelectItem value="400">4xx+</SelectItem>
                <SelectItem value="500">5xx+</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              showArrow={false}
              onClick={() => void fetchErrors(errorMinStatus)}
              disabled={loading.errors}
              className="h-8 px-ds-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading.errors ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>

        {loading.errors && !errorsData && <ErrorsSkeleton />}
        {error.errors && <ErrorAlert message={error.errors} onRetry={() => void fetchErrors(errorMinStatus)} />}

        {errorsData && (
          errorsData.errors.length === 0 ? (
            <div className="flex flex-col items-center py-ds-7 text-ink-secondary">
              <CheckCircle2 className="w-10 h-10 text-green-400 mb-ds-2" />
              <span className="text-[14px]">No recent errors — all systems operational</span>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-ds-1">
              {errorsData.errors.map((err, i) => (
                <div key={`${err.ts}-${i}`} className="p-ds-3 bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-md">
                  <div className="flex items-center gap-ds-2 mb-ds-1">
                    <Badge className={err.status >= 500 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}>
                      {err.status}
                    </Badge>
                    <span className="text-ink-secondary text-[12px] font-mono truncate flex-1">{err.path}</span>
                    <span className="text-ink-tertiary text-[11px] font-mono">{new Date(err.ts).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-ink-secondary text-[12px] mb-ds-1">{err.message}</div>
                  {err.requestId && <div className="text-ink-tertiary text-[10px] font-mono">req: {err.requestId}</div>}
                </div>
              ))}
            </div>
          )
        )}
      </Card>

      <Dialog open={confirmModal.open} onOpenChange={(open) => { if (!open) closeConfirmModal(); }}>
        <DialogContent className="bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] max-w-md">
          {confirmModal.service && (
            <>
              <DialogHeader>
                <DialogTitle className="text-ink-primary text-[18px] font-medium">
                  {confirmModal.newEnabled ? 'Confirm Enable' : 'Confirm Disable'}
                </DialogTitle>
                <DialogDescription className="text-ink-secondary text-[13px] mt-ds-2">
                  You are about to{' '}
                  <span className={confirmModal.newEnabled ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                    {confirmModal.newEnabled ? 'enable' : 'disable'}
                  </span>
                  {' '}the service{' '}
                  <span className="font-mono text-gold-primary">{formatServiceName(confirmModal.service.name)}</span>
                  .
                </DialogDescription>
              </DialogHeader>

              {!confirmModal.newEnabled && (
                <div className="bg-red-500/10 border-[0.5px] border-red-500/20 rounded-[12px] p-ds-3 mt-ds-3">
                  <div className="flex items-start gap-ds-2 mb-ds-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="text-red-400 text-[13px]">
                      This will stop all AI calls to <span className="font-mono">{confirmModal.service.name}</span>.
                      Type the service name below to confirm.
                    </div>
                  </div>
                  <Input
                    type="text"
                    value={confirmModal.typedName}
                    onChange={(e) => setConfirmModal((m) => ({ ...m, typedName: e.target.value }))}
                    placeholder={confirmModal.service.name}
                    className="bg-surface-base border-border-ds-subtle text-ink-primary font-mono mt-ds-2"
                    autoFocus
                  />
                </div>
              )}

              {confirmModal.newEnabled && (
                <div className="bg-amber-500/10 border-[0.5px] border-amber-500/20 rounded-[12px] p-ds-3 mt-ds-3 flex items-start gap-ds-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="text-amber-400 text-[13px]">
                    Re-enabling will resume AI calls to <span className="font-mono">{confirmModal.service.name}</span>.
                    Confirm to apply.
                  </div>
                </div>
              )}

              <DialogFooter className="gap-ds-2 mt-ds-4">
                <Button
                  variant="ghost"
                  size="sm"
                  showArrow={false}
                  onClick={closeConfirmModal}
                >
                  Cancel
                </Button>
                <Button
                  variant={confirmModal.newEnabled ? 'gold' : 'destructive'}
                  size="sm"
                  showArrow={false}
                  disabled={!confirmModal.newEnabled && confirmModal.typedName !== confirmModal.service.name}
                  onClick={() => void handleConfirmToggle()}
                >
                  {confirmModal.newEnabled ? 'Enable' : 'Disable'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
