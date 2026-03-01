/**
 * RA3 — Period Comparison parser
 * Compares current vs prior period revenue per wine.
 * Computes trend: Growing | Stable | Declining | New | Lost
 * Parses period labels from report header rows.
 */

import * as XLSX from 'xlsx';
import { Ra3Data, Ra3Row, Ra3Trend } from '@/types/reports';

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
  'wine code', 'item code', 'code', 'sku',
  'wine name', 'item name', 'name', 'description',
  'importer', 'supplier',
  'current', 'prior', 'period', 'change', 'trend', 'variance',
  'revenue', 'sales', 'amount',
];

function findHeaderRow(raw: unknown[][]): number {
  let bestRow = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const row = (raw[i] as unknown[]).map(norm);
    let score = 0;
    for (const h of row) {
      if (h && HEADER_SCORE_KEYWORDS.some((kw) => h.includes(kw))) score++;
    }
    if (score > bestScore) { bestScore = score; bestRow = i; }
  }
  return bestRow;
}

function computeTrend(current: number, prior: number, changePct: number): Ra3Trend {
  if (prior === 0 && current > 0) return 'New';
  if (current === 0 && prior > 0) return 'Lost';
  if (changePct > 15) return 'Growing';
  if (changePct < -15) return 'Declining';
  return 'Stable';
}

/** Scan first 5 rows for period label strings like "Jan 2024 – Dec 2024" */
function extractPeriodLabels(raw: unknown[][]): { current: string; prior: string } {
  const periodRe = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i;
  const rangeRe = /\b\d{4}\b/;
  const labels: string[] = [];

  for (let i = 0; i < Math.min(5, raw.length); i++) {
    for (const cell of raw[i] as unknown[]) {
      const s = String(cell ?? '').trim();
      if ((periodRe.test(s) || rangeRe.test(s)) && s.length > 4 && s.length < 60) {
        labels.push(s);
      }
    }
  }

  return {
    current: labels[0] ?? 'Current Period',
    prior: labels[1] ?? 'Prior Period',
  };
}

export interface Ra3ParseResult {
  data: Ra3Data;
  rowCount: number;
  errors: string[];
  filename: string;
  allHeaders: string[];
}

function resolveFromRows(
  raw: unknown[][],
  filename: string,
  resolve: (r: Ra3ParseResult) => void
): void {
  const empty = (errors: string[]): Ra3ParseResult => ({
    data: {
      rows: [], currentPeriodLabel: 'Current', priorPeriodLabel: 'Prior',
      rowCount: 0, parsedAt: new Date().toISOString(),
    },
    rowCount: 0, errors, filename, allHeaders: [],
  });

  if (raw.length < 2) { resolve(empty(['File has no data rows'])); return; }

  const { current: currentPeriodLabel, prior: priorPeriodLabel } = extractPeriodLabels(raw);

  const headerRowIdx = findHeaderRow(raw);
  const headers = (raw[headerRowIdx] as unknown[]).map(norm);

  const colCode     = findCol(headers, 'wine code', 'item code', 'product code', 'code', 'sku');
  const colName     = findCol(headers, 'wine name', 'item name', 'item description', 'description', 'name', 'item');
  const colImporter = findCol(headers, 'importer', 'supplier', 'vendor', 'brand');

  // Current period revenue — look for "current", "this period", "ytd", "selected"
  const colCurrent = findCol(headers,
    'current period', 'current', 'this period', 'this year', 'ytd', 'selected period', 'period 1'
  );
  // Prior period revenue
  const colPrior = findCol(headers,
    'prior period', 'prior', 'last period', 'last year', 'prior year', 'py', 'period 2', 'comparison'
  );
  // Change % column (optional — we compute ourselves if missing)
  const colChange = findCol(headers, 'change %', 'change pct', 'variance %', 'delta %', '% change', 'growth %');

  const rows: Ra3Row[] = [];

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const wineCode = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
    const wineName = colName >= 0 ? String(r[colName] ?? '').trim() : '';
    if (!wineCode && !wineName) continue;
    const s = (wineCode + wineName).toLowerCase();
    if (s.includes('total') || s.includes('grand')) continue;

    const current = colCurrent >= 0 ? num(r[colCurrent]) : 0;
    const prior = colPrior >= 0 ? num(r[colPrior]) : 0;
    let changePct: number;
    if (colChange >= 0) {
      changePct = num(r[colChange]);
      // Handle decimal format (0.15 = 15%)
      if (Math.abs(changePct) < 5 && changePct !== 0) changePct *= 100;
    } else {
      changePct = prior > 0 ? ((current - prior) / prior) * 100 : Infinity;
    }
    const trend = computeTrend(current, prior, isFinite(changePct) ? changePct : 100);

    rows.push({
      wineCode,
      wineName,
      importer: colImporter >= 0 ? String(r[colImporter] ?? '').trim() : '',
      currentPeriodRevenue: current,
      priorPeriodRevenue: prior,
      changePct,
      trend,
    });
  }

  resolve({
    data: {
      rows, currentPeriodLabel, priorPeriodLabel,
      rowCount: rows.length, parsedAt: new Date().toISOString(),
    },
    rowCount: rows.length,
    errors: rows.length === 0 ? ['No rows found'] : [],
    filename,
    allHeaders: headers,
  });
}

export function parseRa3(file: File): Promise<Ra3ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const fail = (msg: string): Ra3ParseResult => ({
      data: {
        rows: [], currentPeriodLabel: '(error)', priorPeriodLabel: '(error)',
        rowCount: 0, parsedAt: new Date().toISOString(),
      },
      rowCount: 0, errors: [msg], filename: file.name, allHeaders: [],
    });

    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const sheetName =
          workbook.SheetNames.find((n) => /ra3|period|comparison|compare/i.test(n)) ??
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
