/**
 * CSV export.
 *
 * Two things here are easy to get wrong and both matter.
 *
 * Escaping: a style description containing a comma, a quote or a line break
 * will silently corrupt every column to its right if it is not quoted and
 * doubled.
 *
 * Injection: a cell beginning with `=`, `+`, `-`, `@`, tab or carriage
 * return is treated as a formula by Excel and Sheets. A bundle id or a buyer
 * name that starts with one of those becomes executable when the file is
 * opened. Since these exports carry data typed in by users and are then
 * opened on someone's laptop, every such value is prefixed with an
 * apostrophe, which Excel strips on display but does not execute.
 */

const RISKY_PREFIX = /^[=+\-@\t\r]/;

export function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  let text = String(value);

  // Neutralise formulas before quoting, never after.
  if (RISKY_PREFIX.test(text)) text = `'${text}`;

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCell).join(',')];
  rows.forEach((row) => lines.push(row.map(escapeCell).join(',')));
  // CRLF: Excel on Windows is the overwhelmingly common destination.
  return lines.join('\r\n');
}

/**
 * Triggers a download. The BOM matters: without it Excel misreads UTF-8, so
 * a buyer name with an accent arrives mangled.
 */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const csv = toCsv(headers, rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/** Stamps exports so two files from different days are never confused. */
export function exportFilename(base: string, from?: string, to?: string): string {
  const range = from && to ? `_${from}_to_${to}` : from ? `_${from}` : '';
  return `${base}${range}.csv`;
}
