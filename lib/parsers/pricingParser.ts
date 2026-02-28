import * as XLSX from 'xlsx';
import { PricingRow } from '@/types';

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

export interface PricingParseResult {
  rows: PricingRow[];
  rowCount: number;
  errors: string[];
  filename: string;
}

export function parsePricingDetailed(file: File): Promise<PricingParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName =
          workbook.SheetNames.find((n) => /price/i.test(n)) ?? workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (raw.length < 2) {
          resolve({ rows: [], rowCount: 0, errors: ['File has no data rows'], filename: file.name });
          return;
        }

        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(10, raw.length); i++) {
          const normalized = (raw[i] as unknown[]).map(norm);
          if (normalized.some((h) => h === 'wine code' || h === 'item code' || h === 'code')) {
            headerRowIdx = i;
            break;
          }
        }

        const headers = (raw[headerRowIdx] as unknown[]).map(norm);
        const colCode = findCol(headers, 'wine code', 'item code', 'code', 'sku', 'item');
        const colDefault = findCol(headers, 'default price', 'retail price', 'price', 'unit price');
        const colFob = findCol(headers, 'fob price', 'fob', 'laid-in', 'laid in', 'cost');

        const rows: PricingRow[] = [];

        for (let i = headerRowIdx + 1; i < raw.length; i++) {
          const r = raw[i] as unknown[];
          const code = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
          if (!code) continue;

          rows.push({
            wineCode: code,
            defaultPrice: colDefault >= 0 ? num(r[colDefault]) : 0,
            fobPrice: colFob >= 0 ? num(r[colFob]) : 0,
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
