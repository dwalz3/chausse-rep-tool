/**
 * RA27 — Points of Distribution parser
 * Account count per wine (how many accounts carry each SKU).
 * Builds byWineCode as plain Record<normCode, accountCount> for localStorage compat.
 */

import * as XLSX from 'xlsx';
import { Ra27Data, Ra27Row } from '@/types/reports';

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normCode(s: string): string {
  return s.toString().trim().toUpperCase();
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
  'wine code', 'item code', 'code', 'sku',
  'wine name', 'item name', 'description', 'name',
  'account count', 'accounts', 'door count', 'doors', 'placements', 'distribution',
  'points of distribution', 'pod',
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

export interface Ra27ParseResult {
  data: Ra27Data;
  rowCount: number;
  errors: string[];
  filename: string;
  allHeaders: string[];
}

function resolveFromRows(
  raw: unknown[][],
  filename: string,
  resolve: (r: Ra27ParseResult) => void
): void {
  const empty = (errors: string[]): Ra27ParseResult => ({
    data: { rows: [], byWineCode: {}, rowCount: 0, parsedAt: new Date().toISOString() },
    rowCount: 0, errors, filename, allHeaders: [],
  });

  if (raw.length < 2) { resolve(empty(['File has no data rows'])); return; }

  const headerRowIdx = findHeaderRow(raw);
  const headers = (raw[headerRowIdx] as unknown[]).map(norm);

  const colCode     = findCol(headers, 'wine code', 'item code', 'product code', 'code', 'sku');
  const colName     = findCol(headers, 'wine name', 'item name', 'item description', 'description', 'name', 'item');
  const colAccounts = findCol(headers,
    'points of distribution', 'pod', 'account count', 'door count', 'accounts', 'doors', 'placements', 'distribution'
  );

  const rows: Ra27Row[] = [];
  const byWineCode: Record<string, number> = {};

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const wineCode = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
    const wineName = colName >= 0 ? String(r[colName] ?? '').trim() : '';
    if (!wineCode && !wineName) continue;
    const accountCount = colAccounts >= 0 ? Math.round(num(r[colAccounts])) : 0;

    rows.push({ wineCode, wineName, accountCount });
    if (wineCode) {
      byWineCode[normCode(wineCode)] = accountCount;
    }
  }

  resolve({
    data: { rows, byWineCode, rowCount: rows.length, parsedAt: new Date().toISOString() },
    rowCount: rows.length,
    errors: rows.length === 0 ? ['No rows found'] : [],
    filename,
    allHeaders: headers,
  });
}

export function parseRa27(file: File): Promise<Ra27ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const fail = (msg: string): Ra27ParseResult => ({
      data: { rows: [], byWineCode: {}, rowCount: 0, parsedAt: new Date().toISOString() },
      rowCount: 0, errors: [msg], filename: file.name, allHeaders: [],
    });

    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const sheetName =
          workbook.SheetNames.find((n) => /ra27|distribution|pod/i.test(n)) ??
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
