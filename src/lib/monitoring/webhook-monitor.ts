// lib/monitoring/webhook-monitor.ts
interface WebhookMetrics {
  totalRequests: number;
  successfulTrades: number;
  failedTrades: number;
  avgResponseTime: number;
  errors: Map<string, number>;
}

export class WebhookMonitor {
  private static metrics = new Map<string, WebhookMetrics>();
  
  static recordRequest(userId: string, success: boolean, responseTime: number, error?: string) {
    // Track metrics for admin dashboard
  }
  
  static getMetrics(userId: string) {
    return this.metrics.get(userId);
  }
}