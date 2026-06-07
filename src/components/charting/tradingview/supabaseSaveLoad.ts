// Requires a `chart_layouts` table — migration is gated on DB approval (not created here).
//
// Expected schema (for reference — do NOT run without Elad's explicit approval):
//   CREATE TABLE chart_layouts (
//     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id     uuid NOT NULL,
//     name        text NOT NULL,
//     symbol      text,
//     resolution  text,
//     content     text NOT NULL,
//     updated_at  timestamptz NOT NULL DEFAULT now()
//   );

import { supabase } from '@/lib/supabase';
import type { TVSaveLoadAdapter } from './types.d';

interface SupabaseSaveLoadOptions {
  userId: string;
}

/**
 * Persists TradingView chart layouts to the `chart_layouts` Supabase table.
 *
 * - Study/drawing template methods are resolved-empty stubs until a dedicated
 *   schema is approved (TODO: implement per-user study/drawing template storage).
 * - All DB operations are filtered by `userId` so one user never reads another's layouts.
 */
export class SupabaseSaveLoadAdapter implements TVSaveLoadAdapter {
  private readonly userId: string;

  constructor(opts: SupabaseSaveLoadOptions) {
    this.userId = opts.userId;
  }

  async getAllCharts(): Promise<any[]> {
    const { data, error } = await supabase
      .from('chart_layouts')
      .select('id, name, symbol, resolution, updated_at')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`chart_layouts.getAllCharts: ${error.message}`);
    return data ?? [];
  }

  async saveChart(chartData: any): Promise<string> {
    const payload = {
      user_id: this.userId,
      name: chartData.name ?? 'Untitled',
      symbol: chartData.symbol ?? null,
      resolution: chartData.resolution ?? null,
      content: typeof chartData.content === 'string'
        ? chartData.content
        : JSON.stringify(chartData),
      updated_at: new Date().toISOString(),
    };

    if (chartData.id) {
      // Update existing layout
      const { error } = await supabase
        .from('chart_layouts')
        .update(payload)
        .eq('id', chartData.id)
        .eq('user_id', this.userId);

      if (error) throw new Error(`chart_layouts.saveChart (update): ${error.message}`);
      return String(chartData.id);
    }

    // Insert new layout
    const { data, error } = await supabase
      .from('chart_layouts')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw new Error(`chart_layouts.saveChart (insert): ${error.message}`);
    return String(data.id);
  }

  async removeChart(id: string | number): Promise<void> {
    const { error } = await supabase
      .from('chart_layouts')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) throw new Error(`chart_layouts.removeChart: ${error.message}`);
  }

  async getChartContent(id: string | number): Promise<string> {
    const { data, error } = await supabase
      .from('chart_layouts')
      .select('content')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single();

    if (error) throw new Error(`chart_layouts.getChartContent: ${error.message}`);
    return data.content;
  }

  // ── Study template stubs ──────────────────────────────────────────────────
  // TODO: implement per-user study template storage (requires schema approval)

  async getAllStudyTemplates(): Promise<any[]> {
    return [];
  }

  async removeStudyTemplate(_t: any): Promise<void> {
    // TODO: implement study template removal
  }

  async saveStudyTemplate(_t: any): Promise<void> {
    // TODO: implement study template save
  }

  async getStudyTemplateContent(_t: any): Promise<string> {
    return '';
  }

  // ── Drawing template stubs ────────────────────────────────────────────────
  // TODO: implement per-user drawing template storage (requires schema approval)

  async getDrawingTemplates(): Promise<string[]> {
    return [];
  }

  async loadDrawingTemplate(_toolName: string, _templateName: string): Promise<string> {
    return '';
  }

  async saveDrawingTemplate(
    _toolName: string,
    _templateName: string,
    _content: string,
  ): Promise<void> {
    // TODO: implement drawing template save
  }

  async removeDrawingTemplate(
    _toolName: string,
    _templateName: string,
  ): Promise<void> {
    // TODO: implement drawing template removal
  }
}
