'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  BarChart3,
} from 'lucide-react';
import {
  refreshMaterializedViews,
  manualResetTradeCounters,
  checkSystemHealth,
  getDatabaseSize,
  getTableSizes,
  getSlowQueries,
  cleanupOldData,
} from '@/lib/admin/adminMaintenance';

export default function MaintenancePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [dbSize, setDbSize] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [slowQueries, setSlowQueries] = useState<any[]>([]);

  const handleRefreshViews = async () => {
    setLoading('refresh');
    await refreshMaterializedViews();
    setLoading(null);
  };

  const handleResetCounters = async () => {
    setLoading('reset');
    await manualResetTradeCounters();
    setLoading(null);
  };

  const handleCheckHealth = async () => {
    setLoading('health');
    const result = await checkSystemHealth();
    if (result.success) {
      setHealth(result.health);
    }
    setLoading(null);
  };

  const handleGetDbSize = async () => {
    setLoading('dbsize');
    const result = await getDatabaseSize();
    if (result.success) {
      setDbSize(result.size);
    }
    setLoading(null);
  };

  const handleGetTables = async () => {
    setLoading('tables');
    const result = await getTableSizes();
    if (result.success) {
      setTables(result.tables || []);
    }
    setLoading(null);
  };

  const handleGetSlowQueries = async () => {
    setLoading('queries');
    const result = await getSlowQueries(10);
    if (result.success) {
      setSlowQueries(result.queries || []);
    }
    setLoading(null);
  };

  const handleCleanup = async () => {
    setLoading('cleanup');
    await cleanupOldData();
    setLoading(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Maintenance</h1>
          <p className="text-muted-foreground">Manual controls and system diagnostics</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Refresh Views</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRefreshViews}
              disabled={loading === 'refresh'}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading === 'refresh' ? 'animate-spin' : ''}`} />
              Refresh Now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reset Counters</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleResetCounters}
              disabled={loading === 'reset'}
              className="w-full"
              variant="secondary"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading === 'reset' ? 'animate-spin' : ''}`} />
              Reset Now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCheckHealth}
              disabled={loading === 'health'}
              className="w-full"
              variant="outline"
            >
              <Activity className={`w-4 h-4 mr-2 ${loading === 'health' ? 'animate-pulse' : ''}`} />
              Check Health
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cleanup Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCleanup}
              disabled={loading === 'cleanup'}
              className="w-full"
              variant="destructive"
            >
              <Trash2 className={`w-4 h-4 mr-2 ${loading === 'cleanup' ? 'animate-pulse' : ''}`} />
              Cleanup Now
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Health Status */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle>System Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(health).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center gap-2">
                  {value.status === 'healthy' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium capitalize">{key}</p>
                    <p className="text-xs text-muted-foreground">{value.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Size */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Database Size</CardTitle>
            <CardDescription>Current storage usage</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGetDbSize} disabled={loading === 'dbsize'} variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Check Size
            </Button>
            {dbSize && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Size (MB):</span>
                  <span className="font-mono font-bold">{dbSize.total_size_mb}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Size (GB):</span>
                  <span className="font-mono font-bold">{dbSize.total_size_gb}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Table Sizes</CardTitle>
            <CardDescription>Storage breakdown by table</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGetTables} disabled={loading === 'tables'} variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              Load Tables
            </Button>
            {tables.length > 0 && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {tables.slice(0, 10).map((table, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="font-mono">{table.table_name}</span>
                    <Badge variant="secondary">{table.size_mb} MB</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slow Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Slow Queries</CardTitle>
          <CardDescription>Top 10 slowest database queries</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGetSlowQueries} disabled={loading === 'queries'} variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Analyze Queries
          </Button>
          {slowQueries.length > 0 && (
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {slowQueries.map((query, idx) => (
                <div key={idx} className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <Badge variant="destructive">{query.mean_time_ms} ms</Badge>
                    <span className="text-xs text-muted-foreground">{query.calls} calls</span>
                  </div>
                  <code className="text-xs break-all">{query.query.substring(0, 100)}...</code>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}