/**
 * RA21 — Top Wines Sold parser
 * Ranked list of wines by revenue/cases in a period.
 * Assigns rank from row order if no explicit rank column.
 */

import * as XLSX from 'xlsx';
import { Ra21Data, Ra21Row } from '@/types/reports';

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace(/[$,]/g, ''));
  return isFinite(n) ? n : 0;
}

function findCol(headers: string[], ...keywords: string[]): number {
  for (const kw of keywords) {
    const idx = headers.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

const HEADER_SCORE_KEYWORDS = [
  'rank', '#',
  'wine code', 'item code', 'code', 'sku',
  'wine name', 'item name', 'description', 'name',
  'revenue', 'sales', 'amount',
  'qty', 'quantity', 'cases',
  'importer', 'accounts', 'account count',
];

function findHeaderRow(raw: unknown[][]): number {
  let bestRow = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(8, raw.length); i++) {
    const row = (raw[i] as unknown[]).map(norm);
    let score = 0;
    for (const h of row) {
      if (h && HEADER_SCORE_KEYWORDS.some((kw) => h.includes(kw))) score++;
    }
    if (score > bestScore) { bestScore = score; bestRow = i; }
  }
  return bestRow;
}

export interface Ra21ParseResult {
  data: Ra21Data;
  rowCount: number;
  errors: string[];
  filename: string;
  allHeaders: string[];
}

function resolveFromRows(
  raw: unknown[][],
  filename: string,
  resolve: (r: Ra21ParseResult) => void
): void {
  const empty = (errors: string[]): Ra21ParseResult => ({
    data: { rows: [], rowCount: 0, parsedAt: new Date().toISOString() },
    rowCount: 0, errors, filename, allHeaders: [],
  });

  if (raw.length < 2) { resolve(empty(['File has no data rows'])); return; }

  const headerRowIdx = findHeaderRow(raw);
  const headers = (raw[headerRowIdx] as unknown[]).map(norm);

  const colRank    = findCol(headers, 'rank', '#', 'no.', 'position');
  const colCode    = findCol(headers, 'wine code', 'item code', 'product code', 'code', 'sku');
  const colName    = findCol(headers, 'wine name', 'item name', 'item description', 'description', 'name', 'item');
  const colImporter = findCol(headers, 'importer', 'supplier', 'vendor', 'brand');
  const colRevenue = findCol(headers, 'revenue', 'sales', 'amount', 'total');
  const colQty     = findCol(headers, 'qty', 'quantity', 'cases', 'units');
  const colAccounts = findCol(headers, 'account count', 'accounts', 'door count', 'doors', 'placements');

  const rows: Ra21Row[] = [];

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const wineCode = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
    const wineName = colName >= 0 ? String(r[colName] ?? '').trim() : '';
    if (!wineCode && !wineName) continue;
    const revenue = colRevenue >= 0 ? num(r[colRevenue]) : 0;
    const qty = colQty >= 0 ? num(r[colQty]) : 0;
    if (revenue === 0 && qty === 0) continue;

    rows.push({
      rank: colRank >= 0 ? Math.round(num(r[colRank])) || (rows.length + 1) : rows.length + 1,
      wineCode,
      wineName,
      importer: colImporter >= 0 ? String(r[colImporter] ?? '').trim() : '',
      revenue,
      qty,
      accountCount: colAccounts >= 0 ? Math.round(num(r[colAccounts])) : 0,
    });
  }

  // Sort by rank ascending
  rows.sort((a, b) => a.rank - b.rank);

  resolve({
    data: { rows, rowCount: rows.length, parsedAt: new Date().toISOString() },
    rowCount: rows.length,
    errors: rows.length === 0 ? ['No rows found'] : [],
    filename,
    allHeaders: headers,
  });
}

export function parseRa21(file: File): Promise<Ra21ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const fail = (msg: string): Ra21ParseResult => ({
      data: { rows: [], rowCount: 0, parsedAt: new Date().toISOString() },
      rowCount: 0, errors: [msg], filename: file.name, allHeaders: [],
    });

    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const sheetName =
          workbook.SheetNames.find((n) => /ra21|top wine|top item/i.test(n)) ??
          workbook.SheetNames[0];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(
          workbook.Sheets[sheetName], { header: 1, defval: '' }
        );
        resolveFromRows(raw, file.name, resolve);
      } catch (err) {
        resolve(fail(err instanceof Error ? err.message : 'Parse error'));
      }
    };
    reader.onerror = () => resolve(fail('File read error'));
    reader.readAsArrayBuffer(file);
  });
}
