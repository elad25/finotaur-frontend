// src/features/automation/tabs/CopierRoutesTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// List of CopierRouteCards + "Add route" button.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { DataState } from '@/components/ds/DataState';
import { CopierRouteCard } from '../components/CopierRouteCard';
import type { CopierRouteCardProps } from '../components/CopierRouteCard';
import { useCopierRoutes } from '../hooks/useCopierRoutes';
import type { CopierRoute } from '../lib/automationTypes';

function newRouteDefaults(): CopierRoute {
  return {
    id: `new-${Date.now()}`,
    user_id: '',
    source_account_id: '',
    source_account_name: '',
    source_broker: null,
    source_environment: null,
    label: 'New route',
    symbol_filter: [],
    copy_opens: true,
    copy_closes: true,
    reverse: false,
    is_active: true,
    automation_copier_route_targets: [],
  };
}

export default function CopierRoutesTab() {
  const { routes, isLoading, isError, error, refetch, upsertRoute, deleteRoute } =
    useCopierRoutes();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingNew, setPendingNew] = useState<CopierRoute[]>([]);

  const handleAddRoute = () => {
    setPendingNew((prev) => [...prev, newRouteDefaults()]);
  };

  const handleSave: CopierRouteCardProps['onSave'] = async (params) => {
    const isPending = pendingNew.some((r) => r.id === params.routeId);
    setSavingId(params.routeId ?? 'new');
    const result = await upsertRoute({
      routeId: isPending ? undefined : params.routeId,
      sourceAccountId: params.sourceAccountId,
      sourceAccountName: params.sourceAccountName,
      sourceBroker: params.sourceBroker,
      sourceEnvironment: params.sourceEnvironment,
      label: params.label,
      symbolFilter: params.symbolFilter,
      copyOpens: params.copyOpens,
      copyCloses: params.copyCloses,
      reverse: params.reverse,
      isActive: params.isActive,
      targets: params.targets,
    });
    setSavingId(null);
    if (result.success && isPending) {
      setPendingNew((prev) => prev.filter((r) => r.id !== params.routeId));
    }
  };

  const handleDelete = async (routeId: string) => {
    if (pendingNew.some((r) => r.id === routeId)) {
      setPendingNew((prev) => prev.filter((r) => r.id !== routeId));
      return;
    }
    await deleteRoute(routeId);
  };

  const allRoutes = [...routes, ...pendingNew];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Copier Routes
        </h2>
        <Button
          variant="goldOutline"
          size="compact"
          showArrow={false}
          onClick={handleAddRoute}
        >
          <Plus className="h-3.5 w-3.5" />
          Add route
        </Button>
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={allRoutes}
        onRetry={refetch}
        empty={
          <p className="text-sm text-zinc-500 py-6 text-center">
            No copier routes yet. Click "Add route" to configure one.
          </p>
        }
      >
        {(data) => (
          <div className="space-y-3">
            {data.map((route) => (
              <CopierRouteCard
                key={route.id}
                route={route}
                onSave={handleSave}
                onDelete={handleDelete}
                isSaving={savingId === route.id || savingId === 'new'}
              />
            ))}
          </div>
        )}
      </DataState>

      <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-800 mt-2">
        Source and target accounts are your journal-connected broker accounts (OAuth). Execution
        runs locally in your trading platform via the Finotaur desktop agent — no orders are
        placed from this page.
      </p>
    </div>
  );
}
