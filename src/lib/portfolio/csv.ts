// src/lib/portfolio/csv.ts
// ═══════════════════════════════════════════════════════════════
// Pure, dependency-free CSV parser + validator for portfolio imports.
// No I/O, no npm packages. ~120 lines.
// ═══════════════════════════════════════════════════════════════

export interface CsvRow {
  ticker: string;
  quantity: number | null;
  costPerShare: number | null;
  purchaseDate: string | null;
}

export interface CsvParseError {
  rowIndex: number; // 1-based data row number (excludes header)
  field: string;
  message: string;
  raw: string;
}

export interface CsvParseResult {
  rows: CsvRow[];
  errors: CsvParseError[];
}

// ── Column name aliases (trim + lowercase before matching) ───────
const TICKER_ALIASES    = new Set(['ticker', 'symbol']);
const QUANTITY_ALIASES  = new Set(['quantity', 'qty', 'shares']);
const COST_ALIASES      = new Set(['cost per share', 'cost', 'cost/share', 'price']);
const DATE_ALIASES      = new Set(['purchase date', 'date']);

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Minimal CSV line splitter that handles double-quoted fields with
 * embedded commas and "" escape sequences. Does NOT handle multi-line
 * quoted fields (not needed for portfolio CSVs).
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead: "" → escaped quote
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Attempt to parse a date string as either:
 *   - YYYY-MM-DD (already canonical)
 *   - M/D/YYYY or MM/DD/YYYY
 * Returns canonical 'YYYY-MM-DD' on success, null on failure.
 *
 * Overflow guard: JS silently rolls over out-of-range dates (e.g.
 * 2023-02-30 → 2023-03-02).  After constructing the Date we verify
 * the month and day still match the parsed numbers; a mismatch means
 * the input was invalid and we return null.
 */
function parseDate(raw: string): string | null {
  const trimmed = raw.trim();

  // Already canonical YYYY-MM-DD?
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const dt = new Date(trimmed + 'T00:00:00');
    if (isNaN(dt.getTime())) return null;
    // Overflow check: verify the parsed components match what JS resolved.
    if (
      dt.getFullYear()  !== Number(y) ||
      dt.getMonth() + 1 !== Number(m) ||
      dt.getDate()      !== Number(d)
    ) return null;
    return trimmed;
  }

  // M/D/YYYY or MM/DD/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const padded = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const dt = new Date(padded + 'T00:00:00');
    if (isNaN(dt.getTime())) return null;
    // Overflow check: verify the parsed components match what JS resolved.
    if (
      dt.getFullYear()  !== Number(y) ||
      dt.getMonth() + 1 !== Number(m) ||
      dt.getDate()      !== Number(d)
    ) return null;
    return padded;
  }

  return null;
}

// ── Main export ───────────────────────────────────────────────────

export function parsePortfolioCsv(text: string): CsvParseResult {
  const rows: CsvRow[]       = [];
  const errors: CsvParseError[] = [];

  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return { rows, errors };

  // Find first non-blank line as header
  const headerLineIndex = lines.findIndex(l => l.trim() !== '');
  if (headerLineIndex === -1) return { rows, errors };

  const headerFields = splitCsvLine(lines[headerLineIndex]).map(h => h.trim().toLowerCase());

  // Resolve column indices; -1 = column absent
  const colTicker   = headerFields.findIndex(h => TICKER_ALIASES.has(h));
  const colQuantity = headerFields.findIndex(h => QUANTITY_ALIASES.has(h));
  const colCost     = headerFields.findIndex(h => COST_ALIASES.has(h));
  const colDate     = headerFields.findIndex(h => DATE_ALIASES.has(h));

  let dataRowIndex = 0; // 1-based counter for error reporting

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue; // skip blank lines

    dataRowIndex++;
    const fields = splitCsvLine(line);
    const rowErrors: CsvParseError[] = [];

    // ── ticker (required) ──────────────────────────────────────
    let ticker = '';
    if (colTicker === -1 || !fields[colTicker]?.trim()) {
      rowErrors.push({
        rowIndex: dataRowIndex,
        field: 'ticker',
        message: 'ticker is required and must not be empty',
        raw: fields[colTicker] ?? '',
      });
    } else {
      ticker = fields[colTicker].trim().toUpperCase();
    }

    // ── quantity (required, > 0) ────────────────────────────────
    let quantity: number | null = null;
    if (colQuantity === -1 || !fields[colQuantity]?.trim()) {
      rowErrors.push({
        rowIndex: dataRowIndex,
        field: 'quantity',
        message: 'quantity is required',
        raw: fields[colQuantity] ?? '',
      });
    } else {
      const raw = fields[colQuantity].trim();
      const parsed = Number(raw);
      if (!isFinite(parsed) || parsed <= 0) {
        rowErrors.push({
          rowIndex: dataRowIndex,
          field: 'quantity',
          message: `quantity must be a positive number, got "${raw}"`,
          raw,
        });
      } else {
        quantity = parsed;
      }
    }

    // ── costPerShare (optional, >= 0 if present) ───────────────
    let costPerShare: number | null = null;
    if (colCost !== -1 && fields[colCost]?.trim()) {
      const raw = fields[colCost].trim();
      const parsed = Number(raw);
      if (!isFinite(parsed) || parsed < 0) {
        rowErrors.push({
          rowIndex: dataRowIndex,
          field: 'costPerShare',
          message: `cost per share must be a non-negative number, got "${raw}"`,
          raw,
        });
      } else {
        costPerShare = parsed;
      }
    }

    // ── purchaseDate (optional, normalised to YYYY-MM-DD) ──────
    let purchaseDate: string | null = null;
    if (colDate !== -1 && fields[colDate]?.trim()) {
      const raw = fields[colDate].trim();
      const normalized = parseDate(raw);
      if (normalized === null) {
        rowErrors.push({
          rowIndex: dataRowIndex,
          field: 'purchaseDate',
          message: `purchase date must be YYYY-MM-DD or M/D/YYYY, got "${raw}"`,
          raw,
        });
      } else {
        purchaseDate = normalized;
      }
    }

    if (rowErrors.length > 0) {
      // Row has errors — exclude from rows, push all errors
      errors.push(...rowErrors);
    } else {
      rows.push({ ticker, quantity, costPerShare, purchaseDate });
    }
  }

  return { rows, errors };
}
