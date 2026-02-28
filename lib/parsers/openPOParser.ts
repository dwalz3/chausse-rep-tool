import * as XLSX from 'xlsx';
import { OpenPORow } from '@/types';

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function num(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function findCol(headers: string[], ...keywords: string[]): number {
  for (const kw of keywords) {
    const idx = headers.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof v === 'number' && v > 10000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export interface OpenPOParseResult {
  rows: OpenPORow[];
  rowCount: number;
  errors: string[];
  filename: string;
}

export function parseOpenPOs(file: File): Promise<OpenPOParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });

        const sheetName =
          workbook.SheetNames.find((n) => /order|po|purchase/i.test(n)) ?? workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (raw.length < 2) {
          resolve({ rows: [], rowCount: 0, errors: ['File has no data rows'], filename: file.name });
          return;
        }

        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(10, raw.length); i++) {
          const normalized = (raw[i] as unknown[]).map(norm);
          if (normalized.some((h) => h === 'wine code' || h.includes('purchase') || h.includes('order'))) {
            headerRowIdx = i;
            break;
          }
        }

        const headers = (raw[headerRowIdx] as unknown[]).map(norm);
        const colCode = findCol(headers, 'wine code', 'item code', 'code', 'sku');
        const colProducer = findCol(headers, 'producer', 'supplier', 'vendor', 'winery');
        const colCases = findCol(headers, 'cases', 'qty', 'open cases', 'quantity', 'bottles');
        const colArrival = findCol(headers, 'expected arrival', 'arrival', 'eta', 'due date', 'expected date', 'delivery');

        const rows: OpenPORow[] = [];

        for (let i = headerRowIdx + 1; i < raw.length; i++) {
          const r = raw[i] as unknown[];
          const code = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
          if (!code) continue;

          rows.push({
            wineCode: code,
            producer: colProducer >= 0 ? String(r[colProducer] ?? '').trim() : '',
            openCases: colCases >= 0 ? num(r[colCases]) : 0,
            expectedArrival: colArrival >= 0 ? parseDate(r[colArrival]) : null,
          });
        }

        resolve({ rows, rowCount: rows.length, errors: rows.length === 0 ? ['No data rows found'] : [], filename: file.name });
      } catch (err) {
        resolve({
          rows: [],
          rowCount: 0,
          errors: [err instanceof Error ? err.message : 'Parse error'],
          filename: file.name,
        });
      }
    };

    reader.onerror = () => resolve({ rows: [], rowCount: 0, errors: ['File read error'], filename: file.name });
    reader.readAsArrayBuffer(file);
  });
}
