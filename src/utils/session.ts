/**
 * Detect trading session by hour (UTC-neutral heuristic).
 * Assumes input date in local time; tweak as needed.
 * Asia:   00:00–06:59
 * London: 07:00–12:59
 * NY:     13:00–20:59
 * Off:    otherwise
 */
export function detectSessionByLocal(date?: string | number | Date): "Asia"|"London"|"NY"|"Off" {
  if (!date) return "Off";
  const dt = new Date(date);
  if (isNaN(dt.getTime())) return "Off";
  const h = dt.getHours();
  if (h < 7) return "Asia";
  if (h < 13) return "London";
  if (h < 21) return "NY";
  return "Off";
}
