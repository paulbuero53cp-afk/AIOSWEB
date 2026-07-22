// ─────────────────────────────────────────────────────────────
//  AIOS — Generischer CSV-Parser (Browser)
//  Erkennt Semikolon/Komma automatisch, versteht Quoted Fields
//  mit escaped "" und eingebetteten Zeilenumbrüchen.
// ─────────────────────────────────────────────────────────────

/** Parst CSV-Text in Zeilen-Objekte, Spaltenname → Wert (aus Header-Zeile) */
export function parseCsv(text: string): Record<string, string>[] {
  const sep = text.split('\n')[0].includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') { cell += '"'; i++; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === sep && !inQuotes) { row.push(cell); cell = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some(x => x.trim())) rows.push(row);
      row = []; cell = '';
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);

  const header = (rows.shift() ?? []).map(h => h.trim().replace(/^﻿/, ''));
  return rows.map(r => {
    const obj: Record<string, string> = {};
    header.forEach((key, i) => { obj[key] = String(r[i] ?? '').trim(); });
    return obj;
  });
}

/** Liest eine ausgewählte Datei als Text ein (utf-8) */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}
