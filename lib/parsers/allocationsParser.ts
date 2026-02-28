import * as XLSX from 'xlsx';
import { AllocationRow } from '@/types';

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

export interface AllocationsParseResult {
  rows: AllocationRow[];
  rowCount: number;
  errors: string[];
  filename: string;
}

export function parseAllocations(file: File): Promise<AllocationsParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName =
          workbook.SheetNames.find((n) => /alloc/i.test(n)) ?? workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (raw.length < 2) {
          resolve({ rows: [], rowCount: 0, errors: ['File has no data rows'], filename: file.name });
          return;
        }

        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(10, raw.length); i++) {
          const normalized = (raw[i] as unknown[]).map(norm);
          if (normalized.some((h) => h === 'wine code' || h.includes('alloc') || h === 'account')) {
            headerRowIdx = i;
            break;
          }
        }

        const headers = (raw[headerRowIdx] as unknown[]).map(norm);
        const colCode = findCol(headers, 'wine code', 'item code', 'code', 'sku');
        const colAccount = findCol(headers, 'account', 'customer', 'client');
        const colCases = findCol(headers, 'allocated cases', 'cases allocated', 'alloc cases', 'cases', 'qty');
        const colDeadline = findCol(headers, 'deadline', 'expiry', 'expires', 'date');

        const rows: AllocationRow[] = [];

        for (let i = headerRowIdx + 1; i < raw.length; i++) {
          const r = raw[i] as unknown[];
          const code = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
          if (!code) continue;

          rows.push({
            wineCode: code,
            account: colAccount >= 0 ? String(r[colAccount] ?? '').trim() : '',
            allocatedCases: colCases >= 0 ? num(r[colCases]) : 0,
            deadline: colDeadline >= 0 ? String(r[colDeadline] ?? '').trim() || undefined : undefined,
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
