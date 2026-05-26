// src/types/upcomingEvents.ts
// =====================================================
// Upcoming Events — TypeScript shapes
// =====================================================
// Mirrors the server contract in upcomingEvents.js route handler:
//   - publicShape() at routes/upcomingEvents.js drops cost fields
//   - admin endpoints return full row including cost fields
// =====================================================

export type EventType = 'investor_day' | 'product_launch' | 'earnings';
export type EventConfidence = 'confirmed' | 'expected' | 'rumored';
export type RangeDays = 3 | 7 | 30;

/**
 * Public-facing event shape as returned by:
 *   GET /api/upcoming-events/list
 *   GET /api/upcoming-events/:id
 *
 * Note: server omits cost fields (ai_thesis_cost_usd, *_tokens) from public reads.
 */
export interface UpcomingEvent {
  id: string;
  event_date: string;             // 'YYYY-MM-DD'
  event_time: string | null;      // 'HH:MM' or null
  event_type: EventType;
  primary_ticker: string | null;
  affected_tickers: string[];
  title: string;
  description: string | null;
  source_url: string | null;
  confidence: EventConfidence;
  admin_added: boolean;
  ai_thesis_generated_at: string | null;
  has_thesis: boolean;            // server-shaped: true if ai_thesis is non-null
}

/**
 * Admin-only fields returned by admin endpoints.
 * Extends UpcomingEvent with internal/cost columns.
 */
export interface UpcomingEventAdmin extends UpcomingEvent {
  external_id: string | null;
  last_scan_at: string | null;
  published: boolean;
  ai_thesis: string | null;
  ai_thesis_model: string | null;
  ai_thesis_input_tokens: number | null;
  ai_thesis_output_tokens: number | null;
  ai_thesis_cost_usd: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Response shape from GET /api/upcoming-events/list
 */
export interface ListEventsResponse {
  events: UpcomingEvent[];
  meta: {
    days: number;
    type: EventType | null;
    ticker: string | null;
    count: number;
  };
}

/**
 * Response shape from GET /api/upcoming-events/:id/thesis
 * (and POST /admin/:id/regenerate)
 */
export interface ThesisResponse {
  thesis: string;
  cached: boolean;
  generated_at: string;
}

/**
 * Response shape from POST /admin/scan
 */
export interface ScanResponse {
  scanned: number;
  inserted: number;
  updated: number;
  skipped: number;
  meta: {
    daysAhead: number;
    eventTypes: EventType[];
    triggeredBy: string;
  };
}

/**
 * Patch body for PATCH /admin/:id (all fields optional)
 */
export type UpcomingEventPatch = Partial<Pick<
  UpcomingEventAdmin,
  | 'event_date'
  | 'event_time'
  | 'event_type'
  | 'primary_ticker'
  | 'affected_tickers'
  | 'title'
  | 'description'
  | 'source_url'
  | 'confidence'
  | 'published'
>>;

/**
 * Body for POST /admin/create (subset of fields required)
 */
export interface UpcomingEventCreate {
  event_date: string;             // 'YYYY-MM-DD' — required
  event_type: EventType;          // required
  title: string;                  // required
  event_time?: string | null;
  primary_ticker?: string | null;
  affected_tickers?: string[];
  description?: string | null;
  source_url?: string | null;
  confidence?: EventConfidence;
  published?: boolean;
}

// ─── UI labels (for badges, dropdowns, etc.) ─────────────────────────────

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  investor_day: 'Investor Day',
  product_launch: 'Product Launch',
  earnings: 'Earnings',
};

export const CONFIDENCE_LABELS: Record<EventConfidence, string> = {
  confirmed: 'Confirmed',
  expected: 'Expected',
  rumored: 'Rumored',
};

export const RANGE_OPTIONS: { value: RangeDays; label: string }[] = [
  { value: 3, label: '3d' },
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
];
