/**
 * RB1 — Inventory by Supplier parser (Vinosmith format)
 * Key columns: code, available (= current bottles on hand), default price, fob price
 * Also handles older formats with cases/loose-bottles split.
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
  detectedCasesCol: string;   // the inventory column that was detected (available / on hand / etc.)
  detectedBottlesCol: string; // kept for compat
  detectedPriceCol: string;   // default price column if found
  sampleCodes: string[];
  allHeaders: string[];       // every column from the header row — shown in upload debug panel
}

function resolveFromRows(
  raw: unknown[][],
  filename: string,
  resolve: (r: Rb1ParseResult) => void
): void {
  const empty = (errors: string[]): Rb1ParseResult => ({
    rows: [], rowCount: 0, errors, filename,
    detectedCodeCol: '(none)', detectedCasesCol: '(none)', detectedBottlesCol: '(none)',
    detectedPriceCol: '(none)',
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

  // ── Inventory column detection ──────────────────────────────────────────────
  // Priority 1: "available" = Vinosmith's current-bottles-available column (exact keyword first)
  // Priority 2: other direct-bottles column names
  // Priority 3: cases fallback for non-Vinosmith formats
  // Note: deliberately excludes 'qty', 'quantity' — too broad, matches velocity columns like
  //       "qty sold: last 30 days"
  const colAvailable = findCol(headers,
    'available',
    'total bottles', 'btl on hand', 'bottles on hand', 'available btl',
    'avail btl', 'qty btl', 'bottle qty', 'total btl'
  );

  // Cases fallback (non-Vinosmith formats)
  const colCases = findCol(headers,
    'cases on hand', 'avail cases', 'available cases', 'total cases',
    'cs on hand', 'cases avail', 'qty cases', 'case qty',
    'cases', 'cs', 'on hand', 'inventory'
  );

  // Loose bottles (non-Vinosmith formats only)
  const colLooseBottles = findCol(headers,
    'loose bottles', 'loose btl', 'loose bots', 'partial case'
  );

  // ── Pricing columns (Vinosmith includes these in the same report) ───────────
  const colDefaultPrice = findCol(headers, 'default price', 'retail price', 'suggested retail');
  const colFobPrice = findCol(headers, 'fob price', 'fob');

  // ── Velocity: bottles sold in last 30 days ───────────────────────────────────
  // Use exact phrase match first to avoid accidentally matching other "qty" columns
  const colQtySold = findCol(headers, 'qty sold: last 30 days', 'qty sold last 30', 'sold last 30', 'qty sold');

  // For debug output
  const activeInvCol = colAvailable >= 0 ? colAvailable : colCases;
  const detectedCodeCol = colCode >= 0 ? headers[colCode] : '(not found)';
  const detectedCasesCol = activeInvCol >= 0 ? headers[activeInvCol] : '(not found)';
  const detectedBottlesCol = detectedCasesCol; // kept for compat
  const detectedPriceCol = colDefaultPrice >= 0 ? headers[colDefaultPrice] : '(not found)';

  const rows: InventoryRow[] = [];

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const code = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
    if (!code) continue;

    const name = colName >= 0 ? String(r[colName] ?? '').trim() : '';
    if (isJunkRow(code, name)) continue;

    let casesOnHand = 0;
    let bottlesOnHand = 0;
    if (colAvailable >= 0) {
      // Vinosmith: 'available' is bottles directly — no case multiplication needed
      bottlesOnHand = num(r[colAvailable]);
    } else {
      // Older formats: cases × caseSize + loose bottles (handled in buildPortfolioRows)
      casesOnHand = colCases >= 0 ? num(r[colCases]) : 0;
      bottlesOnHand = colLooseBottles >= 0 ? num(r[colLooseBottles]) : 0;
    }

    rows.push({
      wineCode: code,
      wineName: name,
      supplier: colSupplier >= 0 ? String(r[colSupplier] ?? '').trim() : '',
      casesOnHand,
      bottlesOnHand,
      defaultPrice: colDefaultPrice >= 0 ? num(r[colDefaultPrice]) || undefined : undefined,
      fobPrice: colFobPrice >= 0 ? num(r[colFobPrice]) || undefined : undefined,
      qtySoldLast30Days: colQtySold >= 0 ? num(r[colQtySold]) || undefined : undefined,
    });
  }

  const sampleCodes = rows.slice(0, 5).map((r) => r.wineCode);

  resolve({
    rows,
    rowCount: rows.length,
    errors: rows.length === 0
      ? [`No inventory rows found — code col: "${detectedCodeCol}", inv col: "${detectedCasesCol}"`]
      : [],
    filename,
    detectedCodeCol,
    detectedCasesCol,
    detectedBottlesCol,
    detectedPriceCol,
    sampleCodes,
    allHeaders: headers,
  });
}

export function parseRb1(file: File): Promise<Rb1ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    const fail = (msg: string) =>
      resolve({ rows: [], rowCount: 0, errors: [msg], filename: file.name,
        detectedCodeCol: '(error)', detectedCasesCol: '(error)', detectedBottlesCol: '(error)',
        detectedPriceCol: '(error)', sampleCodes: [], allHeaders: [] });

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
