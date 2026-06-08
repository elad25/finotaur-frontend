/**
 * Build a report download filename.
 *
 * Avoids duplicating the type label when the report title already begins with
 * it. Without this, a "Weekly" report titled "Weekly Tactical Review" produced
 * `Finotaur_Weekly_Weekly_Tactical_Review_<date>.pdf` ("Weekly" twice).
 *
 * @param typeLabel  Short report-type label (e.g. "Weekly", "Daily", "Crypto").
 * @param titleSlug  Already-sanitized title/ticker slug (e.g. "Weekly_Tactical_Review").
 * @param dateStr    Date string (e.g. "2026-06-07").
 */
export function buildReportFilename(
  typeLabel: string,
  titleSlug: string,
  dateStr: string,
): string {
  const type = (typeLabel || '').replace(/[^a-zA-Z0-9]/g, '_');
  const slug = titleSlug || '';

  const typeLower = type.toLowerCase();
  const slugLower = slug.toLowerCase();

  // Drop the leading type label when the slug already starts with it (or equals
  // it), so the type is never repeated back-to-back in the filename.
  const redundant =
    typeLower.length > 0 &&
    (slugLower === typeLower || slugLower.startsWith(`${typeLower}_`));

  const prefix = type && !redundant ? `${type}_` : '';
  return `Finotaur_${prefix}${slug}_${dateStr}.pdf`;
}
