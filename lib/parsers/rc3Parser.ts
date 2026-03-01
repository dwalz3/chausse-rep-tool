/**
 * RC3 — Unloved Accounts parser
 * Accounts that have gone quiet: computes daysSinceOrder, priorityScore, priority tier.
 * priorityScore = ltmRevenue / Math.log(daysSinceOrder + 1)  (higher = more urgent to re-engage)
 * Sorted by priorityScore descending.
 */

import * as XLSX from 'xlsx';
import { Rc3Data, Rc3Row } from '@/types/reports';
import { extractTableFromPdf } from './pdfTableExtractor';

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
  'account code', 'code', 'id',
  'sales rep', 'rep',
  'last order', 'last purchase', 'last sale', 'last invoice',
  'days', 'since',
  'ltm', 'last 12', 'revenue', 'amount',
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
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  const n = parseFloat(s);
  if (isFinite(n) && n > 1000) {
    const excelDate = new Date((n - 25569) * 86400000);
    if (!isNaN(excelDate.getTime())) return excelDate.toISOString().split('T')[0];
  }
  return null;
}

function computeDaysSince(dateStr: string | null, now: Date): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

function computePriority(score: number): 'High' | 'Medium' | 'Low' {
  if (score > 5000) return 'High';
  if (score > 1000) return 'Medium';
  return 'Low';
}

export interface Rc3ParseResult {
  data: Rc3Data;
  rowCount: number;
  errors: string[];
  filename: string;
  allHeaders: string[];
}

function resolveFromRows(
  raw: unknown[][],
  filename: string,
  resolve: (r: Rc3ParseResult) => void
): void {
  const empty = (errors: string[]): Rc3ParseResult => ({
    data: { rows: [], rowCount: 0, parsedAt: new Date().toISOString() },
    rowCount: 0, errors, filename, allHeaders: [],
  });

  if (raw.length < 2) { resolve(empty(['File has no data rows'])); return; }

  const headerRowIdx = findHeaderRow(raw);
  const headers = (raw[headerRowIdx] as unknown[]).map(norm);

  const colAccount = findCol(headers, 'account', 'customer', 'client');
  const colCode    = findCol(headers, 'account code', 'customer code', 'code', 'id');
  const colRep     = findCol(headers, 'sales rep', 'rep', 'agent', 'salesperson');
  const colLastDate = findCol(headers, 'last order date', 'last order', 'last purchase', 'last invoice date', 'last invoice', 'last sale date', 'last sale');
  const colDays    = findCol(headers, 'days since', 'days inactive', 'days since order', 'days since last');
  const colLtm     = findCol(headers, 'ltm revenue', 'last 12 months', 'last 12 mo', 'ltm', 'l12m', 'revenue', 'amount');

  const now = new Date();
  const rows: Rc3Row[] = [];

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const account = colAccount >= 0 ? String(r[colAccount] ?? '').trim() : '';
    if (!account) continue;
    const s = account.toLowerCase();
    if (s.includes('total') || s.includes('grand') || s.includes('page')) continue;

    const lastOrderDate = colLastDate >= 0 ? parseDate(r[colLastDate]) : null;
    let daysSinceOrder: number | null = null;
    if (colDays >= 0) {
      const d = Math.round(num(r[colDays]));
      if (d > 0) daysSinceOrder = d;
    }
    if (daysSinceOrder === null) {
      daysSinceOrder = computeDaysSince(lastOrderDate, now);
    }
    const ltmRevenue = colLtm >= 0 ? num(r[colLtm]) : 0;
    const effectiveDays = daysSinceOrder ?? 365;
    const priorityScore = ltmRevenue > 0
      ? ltmRevenue / Math.log(effectiveDays + 1)
      : 0;

    rows.push({
      account,
      accountCode: colCode >= 0 ? String(r[colCode] ?? '').trim() : '',
      salesRep: colRep >= 0 ? String(r[colRep] ?? '').trim() : '',
      lastOrderDate,
      daysSinceOrder,
      ltmRevenue,
      priorityScore,
      priority: computePriority(priorityScore),
    });
  }

  rows.sort((a, b) => b.priorityScore - a.priorityScore);

  resolve({
    data: { rows, rowCount: rows.length, parsedAt: new Date().toISOString() },
    rowCount: rows.length,
    errors: rows.length === 0 ? ['No rows found'] : [],
    filename,
    allHeaders: headers,
  });
}

export function parseRc3(file: File): Promise<Rc3ParseResult> {
  const fail = (msg: string): Rc3ParseResult => ({
    data: { rows: [], rowCount: 0, parsedAt: new Date().toISOString() },
    rowCount: 0, errors: [msg], filename: file.name, allHeaders: [],
  });

  const isPdf = file.name.toLowerCase().endsWith('.pdf');

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;

        if (isPdf) {
          const raw = await extractTableFromPdf(buffer);
          resolveFromRows(raw, file.name, resolve);
        } else {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName =
            workbook.SheetNames.find((n) => /rc3|unloved|dormant|inactive/i.test(n)) ??
            workbook.SheetNames[0];
          const raw: unknown[][] = XLSX.utils.sheet_to_json(
            workbook.Sheets[sheetName], { header: 1, defval: '' }
          );
          resolveFromRows(raw, file.name, resolve);
        }
      } catch (err) {
        resolve(fail(err instanceof Error ? err.message : 'Parse error'));
      }
    };
    reader.onerror = () => resolve(fail('File read error'));
    reader.readAsArrayBuffer(file);
  });
}
