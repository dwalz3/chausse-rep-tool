/**
 * RB1 — Inventory by Supplier parser
 * Columns: Item Code, Item Name/Description, Supplier/Producer, Cases on Hand, Bottles on Hand
 *
 * The report groups rows by supplier with subtotal rows in between.
 * Junk rows (subtotals, grand totals, blank codes) are filtered out.
 */

import * as XLSX from 'xlsx';
import { InventoryRow } from '@/types';

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return isFinite(n) ? n : 0;
}

function findCol(headers: string[], ...keywords: string[]): number {
  for (const kw of keywords) {
    const idx = headers.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

// Score-based header row detection (same pattern as winePropertiesParser)
const HEADER_SCORE_KEYWORDS = [
  'item code', 'wine code', 'product code', 'code', 'sku',
  'item', 'description', 'name', 'wine',
  'supplier', 'producer', 'vendor',
  'cases', 'bottles', 'on hand', 'quantity', 'qty', 'inventory',
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

function isJunkRow(code: string, name: string): boolean {
  const s = (code + ' ' + name).toLowerCase();
  return (
    s.includes('total') ||
    s.includes('subtotal') ||
    s.includes('grand') ||
    s.includes('page') ||
    s.includes('report') ||
    /^[-=*#]+$/.test(code.trim())
  );
}

export interface Rb1ParseResult {
  rows: InventoryRow[];
  rowCount: number;
  errors: string[];
  filename: string;
  detectedCodeCol: string;
  detectedCasesCol: string;
  detectedBottlesCol: string;
  sampleCodes: string[];
  allHeaders: string[];   // every column from the header row — shown in upload debug panel
}

function resolveFromRows(
  raw: unknown[][],
  filename: string,
  resolve: (r: Rb1ParseResult) => void
): void {
  const empty = (errors: string[]): Rb1ParseResult => ({
    rows: [], rowCount: 0, errors, filename,
    detectedCodeCol: '(none)', detectedCasesCol: '(none)', detectedBottlesCol: '(none)',
    sampleCodes: [], allHeaders: [],
  });

  if (raw.length < 2) { resolve(empty(['File has no data rows'])); return; }

  const headerRowIdx = findHeaderRow(raw);
  const headers = (raw[headerRowIdx] as unknown[]).map(norm);

  // Code column
  const colCode = findCol(headers,
    'item code', 'wine code', 'product code', 'item #', 'item no',
    'item number', 'code', 'sku'
  );

  // Name column
  const colName = findCol(headers,
    'item description', 'wine name', 'item name', 'product name',
    'description', 'name', 'item'
  );

  // Supplier column
  const colSupplier = findCol(headers,
    'supplier', 'producer', 'vendor', 'winery', 'brand', 'importer'
  );

  // Total bottles column — if the file reports inventory as bottles directly (preferred)
  const colTotalBottles = findCol(headers,
    'total bottles', 'btl on hand', 'bottles on hand', 'available btl',
    'avail btl', 'qty btl', 'bottle qty', 'total btl'
  );

  // Cases on hand — full cases (used when no total-bottles col found)
  const colCases = findCol(headers,
    'cases on hand', 'avail cases', 'available cases', 'total cases',
    'cs on hand', 'cases avail', 'qty cases', 'case qty',
    'cases', 'cs', 'qty', 'quantity', 'on hand', 'available', 'inventory'
  );

  // Loose bottles (individual bottles not making a full case)
  const colLooseBottles = findCol(headers,
    'loose bottles', 'loose btl', 'btl', 'bottles', 'bots'
  );

  const detectedCodeCol = colCode >= 0 ? headers[colCode] : '(not found)';
  const detectedCasesCol = colCases >= 0 ? headers[colCases] : '(not found)';
  const detectedBottlesCol = colTotalBottles >= 0 ? headers[colTotalBottles] : '(not found)';

  const rows: InventoryRow[] = [];

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const code = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
    if (!code) continue;

    const name = colName >= 0 ? String(r[colName] ?? '').trim() : '';
    if (isJunkRow(code, name)) continue;

    // If the file has a dedicated "total bottles" col, use it directly as bottlesOnHand
    // and leave casesOnHand = 0 (so buildPortfolioRows won't double-multiply)
    let casesOnHand = 0;
    let bottlesOnHand = 0;
    if (colTotalBottles >= 0) {
      bottlesOnHand = num(r[colTotalBottles]);
    } else {
      casesOnHand = colCases >= 0 ? num(r[colCases]) : 0;
      bottlesOnHand = colLooseBottles >= 0 ? num(r[colLooseBottles]) : 0;
    }

    rows.push({
      wineCode: code,
      wineName: name,
      supplier: colSupplier >= 0 ? String(r[colSupplier] ?? '').trim() : '',
      casesOnHand,
      bottlesOnHand,
    });
  }

  const sampleCodes = rows.slice(0, 5).map((r) => r.wineCode);

  resolve({
    rows,
    rowCount: rows.length,
    errors: rows.length === 0
      ? [`No inventory rows found — code col: "${detectedCodeCol}", cases col: "${detectedCasesCol}"`]
      : [],
    filename,
    detectedCodeCol,
    detectedCasesCol,
    detectedBottlesCol,
    sampleCodes,
    allHeaders: headers,
  });
}

export function parseRb1(file: File): Promise<Rb1ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    const fail = (msg: string) =>
      resolve({ rows: [], rowCount: 0, errors: [msg], filename: file.name,
        detectedCodeCol: '(error)', detectedCasesCol: '(error)', detectedBottlesCol: '(error)', sampleCodes: [], allHeaders: [] });

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        // Prefer a sheet with "inventory" or "rb1" in the name, else first sheet
        const sheetName =
          workbook.SheetNames.find((n) => /inventor|rb1/i.test(n)) ??
          workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        resolveFromRows(raw, file.name, resolve);
      } catch (err) {
        fail(err instanceof Error ? err.message : 'Parse error');
      }
    };

    reader.onerror = () => fail('File read error');
    reader.readAsArrayBuffer(file);
  });
}
