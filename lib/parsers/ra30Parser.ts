/**
 * RA30 — New Placements parser
 * Tracks when wines were first placed at accounts.
 * Computes daysAgo and tags rows as recentPlacements (daysAgo <= 90).
 */

import * as XLSX from 'xlsx';
import { Ra30Data, Ra30Row } from '@/types/reports';

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normCode(s: string): string {
  return s.toString().trim().toUpperCase();
}

function findCol(headers: string[], ...keywords: string[]): number {
  for (const kw of keywords) {
    const idx = headers.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

const HEADER_SCORE_KEYWORDS = [
  'account', 'customer', 'client',
  'wine code', 'item code', 'code', 'sku',
  'wine name', 'item name', 'name', 'description',
  'placement date', 'first order', 'date', 'placed',
  'importer', 'supplier',
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

function parseDate(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  // Try direct parse first
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  // Excel serial number
  const n = parseFloat(s);
  if (isFinite(n) && n > 1000) {
    // Excel epoch: Jan 1, 1900 = 1
    const excelDate = new Date((n - 25569) * 86400000);
    if (!isNaN(excelDate.getTime())) return excelDate.toISOString().split('T')[0];
  }
  return null;
}

function computeDaysAgo(dateStr: string | null, now: Date): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

export interface Ra30ParseResult {
  data: Ra30Data;
  rowCount: number;
  errors: string[];
  filename: string;
  allHeaders: string[];
}

function resolveFromRows(
  raw: unknown[][],
  filename: string,
  resolve: (r: Ra30ParseResult) => void
): void {
  const empty = (errors: string[]): Ra30ParseResult => ({
    data: { rows: [], recentPlacements: [], byWineCode: {}, rowCount: 0, parsedAt: new Date().toISOString() },
    rowCount: 0, errors, filename, allHeaders: [],
  });

  if (raw.length < 2) { resolve(empty(['File has no data rows'])); return; }

  const headerRowIdx = findHeaderRow(raw);
  const headers = (raw[headerRowIdx] as unknown[]).map(norm);

  const colAccount  = findCol(headers, 'account', 'customer', 'client', 'buyer');
  const colCode     = findCol(headers, 'wine code', 'item code', 'product code', 'code', 'sku');
  const colName     = findCol(headers, 'wine name', 'item name', 'item description', 'description', 'name', 'item');
  const colImporter = findCol(headers, 'importer', 'supplier', 'vendor', 'brand');
  const colDate     = findCol(headers, 'placement date', 'first order date', 'first order', 'date placed', 'date', 'placed');

  const now = new Date();
  const rows: Ra30Row[] = [];
  const byWineCode: Record<string, Ra30Row[]> = {};

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const account  = colAccount >= 0 ? String(r[colAccount] ?? '').trim() : '';
    const wineCode = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
    const wineName = colName >= 0 ? String(r[colName] ?? '').trim() : '';
    if (!account && !wineCode) continue;

    const placementDate = colDate >= 0 ? parseDate(r[colDate]) : null;
    const daysAgo = computeDaysAgo(placementDate, now);

    const row: Ra30Row = {
      wineCode,
      wineName,
      account,
      importer: colImporter >= 0 ? String(r[colImporter] ?? '').trim() : '',
      placementDate,
      daysAgo,
    };

    rows.push(row);

    if (wineCode) {
      const key = normCode(wineCode);
      if (!byWineCode[key]) byWineCode[key] = [];
      byWineCode[key].push(row);
    }
  }

  const recentPlacements = rows
    .filter((r) => r.daysAgo !== null && r.daysAgo <= 90)
    .sort((a, b) => (a.daysAgo ?? 999) - (b.daysAgo ?? 999));

  resolve({
    data: {
      rows,
      recentPlacements,
      byWineCode,
      rowCount: rows.length,
      parsedAt: new Date().toISOString(),
    },
    rowCount: rows.length,
    errors: rows.length === 0 ? ['No rows found'] : [],
    filename,
    allHeaders: headers,
  });
}

export function parseRa30(file: File): Promise<Ra30ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const fail = (msg: string): Ra30ParseResult => ({
      data: { rows: [], recentPlacements: [], byWineCode: {}, rowCount: 0, parsedAt: new Date().toISOString() },
      rowCount: 0, errors: [msg], filename: file.name, allHeaders: [],
    });

    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const sheetName =
          workbook.SheetNames.find((n) => /ra30|placement|new account/i.test(n)) ??
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
