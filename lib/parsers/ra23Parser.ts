/**
 * RA23 — Account + Wine Detail parser
 * The correct replacement for RA25 wine detail: row-level account × wine × revenue.
 * Columns detected: Account, Wine Code, Wine Name, Importer, Sales Rep, Qty, Revenue
 */

import * as XLSX from 'xlsx';
import { Ra23Data, Ra23Row } from '@/types/reports';

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
  'account', 'customer', 'client',
  'wine code', 'item code', 'product code', 'code', 'sku',
  'wine name', 'item name', 'description', 'name',
  'revenue', 'sales', 'amount',
  'qty', 'quantity', 'cases',
  'importer', 'supplier', 'vendor',
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

function isJunkRow(account: string, code: string): boolean {
  const s = (account + ' ' + code).toLowerCase();
  return (
    s.includes('total') ||
    s.includes('subtotal') ||
    s.includes('grand') ||
    s.includes('page') ||
    /^[-=*#]+$/.test(account.trim())
  );
}

function resolveFromRows(
  raw: unknown[][],
  filename: string,
  resolve: (r: Ra23ParseResult) => void
): void {
  const empty = (errors: string[]): Ra23ParseResult => ({
    data: { rows: [], rowCount: 0, parsedAt: new Date().toISOString() },
    rowCount: 0, errors, filename,
    detectedAccountCol: '(none)', detectedCodeCol: '(none)',
    detectedNameCol: '(none)', detectedRevenueCol: '(none)',
    allHeaders: [],
  });

  if (raw.length < 2) { resolve(empty(['File has no data rows'])); return; }

  const headerRowIdx = findHeaderRow(raw);
  const headers = (raw[headerRowIdx] as unknown[]).map(norm);

  const colAccount = findCol(headers, 'account', 'customer', 'client', 'buyer');
  const colCode    = findCol(headers, 'wine code', 'item code', 'product code', 'item #', 'code', 'sku');
  const colName    = findCol(headers, 'wine name', 'item name', 'item description', 'description', 'name', 'item');
  const colImporter = findCol(headers, 'importer', 'supplier', 'vendor', 'brand');
  const colRep     = findCol(headers, 'sales rep', 'rep', 'agent', 'salesperson');
  const colQty     = findCol(headers, 'qty', 'quantity', 'cases', 'units');
  const colRevenue = findCol(headers, 'revenue', 'sales', 'amount', 'total');

  const rows: Ra23Row[] = [];

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const account = colAccount >= 0 ? String(r[colAccount] ?? '').trim() : '';
    const wineCode = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
    const wineName = colName >= 0 ? String(r[colName] ?? '').trim() : '';
    if (!account && !wineCode) continue;
    if (isJunkRow(account, wineCode)) continue;
    const revenue = colRevenue >= 0 ? num(r[colRevenue]) : 0;
    const qty = colQty >= 0 ? num(r[colQty]) : 0;
    if (revenue === 0 && qty === 0) continue;

    rows.push({
      account,
      wineCode,
      wineName,
      importer: colImporter >= 0 ? String(r[colImporter] ?? '').trim() : '',
      salesRep: colRep >= 0 ? String(r[colRep] ?? '').trim() : '',
      qty,
      revenue,
    });
  }

  resolve({
    data: { rows, rowCount: rows.length, parsedAt: new Date().toISOString() },
    rowCount: rows.length,
    errors: rows.length === 0
      ? [`No rows found — account col: "${headers[colAccount] ?? '(not found)'}", code col: "${headers[colCode] ?? '(not found)'}"`]
      : [],
    filename,
    detectedAccountCol: colAccount >= 0 ? headers[colAccount] : '(not found)',
    detectedCodeCol: colCode >= 0 ? headers[colCode] : '(not found)',
    detectedNameCol: colName >= 0 ? headers[colName] : '(not found)',
    detectedRevenueCol: colRevenue >= 0 ? headers[colRevenue] : '(not found)',
    allHeaders: headers,
  });
}

export interface Ra23ParseResult {
  data: Ra23Data;
  rowCount: number;
  errors: string[];
  filename: string;
  detectedAccountCol: string;
  detectedCodeCol: string;
  detectedNameCol: string;
  detectedRevenueCol: string;
  allHeaders: string[];
}

export function parseRa23(file: File): Promise<Ra23ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const fail = (msg: string): Ra23ParseResult => ({
      data: { rows: [], rowCount: 0, parsedAt: new Date().toISOString() },
      rowCount: 0, errors: [msg], filename: file.name,
      detectedAccountCol: '(error)', detectedCodeCol: '(error)',
      detectedNameCol: '(error)', detectedRevenueCol: '(error)',
      allHeaders: [],
    });

    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const sheetName =
          workbook.SheetNames.find((n) => /ra23|account.*wine|wine.*account/i.test(n)) ??
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
