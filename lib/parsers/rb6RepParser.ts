/**
 * RB6Rep — Velocity + Inventory parser (adapted from Command Center)
 * Key fields: wine code, on-hand bottles, avg monthly velocity.
 * Computes: isLowStock (<12 btl), isCritical (<6 btl), isOutOfStock (=0 btl).
 * Builds byWineCode as plain Record for localStorage compat.
 */

import * as XLSX from 'xlsx';
import { Rb6RepData, Rb6RepRow } from '@/types/reports';

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
  'on hand', 'available', 'inventory', 'bottles',
  'velocity', 'avg', 'monthly', 'sold',
  'supplier', 'producer',
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

export interface Rb6RepParseResult {
  data: Rb6RepData;
  rowCount: number;
  errors: string[];
  filename: string;
  detectedCodeCol: string;
  detectedInvCol: string;
  detectedVelocityCol: string;
  allHeaders: string[];
}

function resolveFromRows(
  raw: unknown[][],
  filename: string,
  resolve: (r: Rb6RepParseResult) => void
): void {
  const empty = (errors: string[]): Rb6RepParseResult => ({
    data: { rows: [], byWineCode: {}, rowCount: 0, parsedAt: new Date().toISOString() },
    rowCount: 0, errors, filename,
    detectedCodeCol: '(none)', detectedInvCol: '(none)', detectedVelocityCol: '(none)',
    allHeaders: [],
  });

  if (raw.length < 2) { resolve(empty(['File has no data rows'])); return; }

  const headerRowIdx = findHeaderRow(raw);
  const headers = (raw[headerRowIdx] as unknown[]).map(norm);

  const colCode = findCol(headers, 'wine code', 'item code', 'product code', 'item #', 'code', 'sku');
  const colName = findCol(headers, 'wine name', 'item name', 'item description', 'description', 'name', 'item');
  const colSupplier = findCol(headers, 'supplier', 'producer', 'vendor', 'winery', 'brand');

  // On-hand bottles: prefer "available" (Vinosmith), then other bottle columns
  const colOnHand = findCol(headers,
    'available',
    'on hand', 'on-hand', 'in stock', 'inventory', 'qty',
    'total bottles', 'btl on hand', 'bottles on hand', 'total btl',
    'bottles', 'quantity'
  );

  // Average monthly velocity
  const colVelocity = findCol(headers,
    'avg monthly', 'monthly avg', 'avg velocity', 'velocity',
    'avg sold', 'monthly velocity', 'bottles/mo', 'btl/mo',
    'avg bottles', 'avg cases'
  );

  const rows: Rb6RepRow[] = [];
  const byWineCode: Record<string, Rb6RepRow> = {};

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const wineCode = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
    if (!wineCode) continue;
    const wineName = colName >= 0 ? String(r[colName] ?? '').trim() : '';
    const onHandBottles = colOnHand >= 0 ? num(r[colOnHand]) : 0;
    const avgMonthlyVelocity = colVelocity >= 0 ? num(r[colVelocity]) : 0;

    const row: Rb6RepRow = {
      wineCode,
      wineName,
      supplier: colSupplier >= 0 ? String(r[colSupplier] ?? '').trim() : '',
      onHandBottles,
      avgMonthlyVelocity,
      isOutOfStock: colOnHand >= 0 ? onHandBottles === 0 : false,
      isCritical: colOnHand >= 0 ? (onHandBottles > 0 && onHandBottles < 6) : false,
      isLowStock: colOnHand >= 0 ? (onHandBottles >= 6 && onHandBottles < 12) : false,
    };

    rows.push(row);
    byWineCode[normCode(wineCode)] = row;
  }

  resolve({
    data: { rows, byWineCode, rowCount: rows.length, parsedAt: new Date().toISOString() },
    rowCount: rows.length,
    errors: rows.length === 0
      ? [`No rows found — code col: "${colCode >= 0 ? headers[colCode] : 'not found'}"`]
      : [],
    filename,
    detectedCodeCol: colCode >= 0 ? headers[colCode] : '(not found)',
    detectedInvCol: colOnHand >= 0 ? headers[colOnHand] : '(not found)',
    detectedVelocityCol: colVelocity >= 0 ? headers[colVelocity] : '(not found)',
    allHeaders: headers,
  });
}

export function parseRb6Rep(file: File): Promise<Rb6RepParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const fail = (msg: string): Rb6RepParseResult => ({
      data: { rows: [], byWineCode: {}, rowCount: 0, parsedAt: new Date().toISOString() },
      rowCount: 0, errors: [msg], filename: file.name,
      detectedCodeCol: '(error)', detectedInvCol: '(error)', detectedVelocityCol: '(error)',
      allHeaders: [],
    });

    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const sheetName =
          workbook.SheetNames.find((n) => /rb6|inventor|velocity/i.test(n)) ??
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
