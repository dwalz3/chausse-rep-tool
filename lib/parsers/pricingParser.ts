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
  // Debug: what was detected during parse
  detectedCodeCol: string;
  detectedPriceCol: string;
  sampleCodes: string[];
}

const EMPTY_DEBUG: Pick<PricingParseResult, 'detectedCodeCol' | 'detectedPriceCol' | 'sampleCodes'> = {
  detectedCodeCol: '(none)',
  detectedPriceCol: '(none)',
  sampleCodes: [],
};

function resolveFromRows(
  raw: unknown[][],
  filename: string,
  resolve: (r: PricingParseResult) => void
): void {
  if (raw.length < 2) {
    resolve({ rows: [], rowCount: 0, errors: ['File has no data rows'], filename, ...EMPTY_DEBUG });
    return;
  }

  // Find header row: scan first 10 rows for one that contains a recognized code or price keyword
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const normalized = (raw[i] as unknown[]).map(norm);
    if (normalized.some((h) =>
      h === 'wine code' || h === 'item code' || h === 'code' || h === 'sku' ||
      h.includes('price') || h.includes('item no') || h.includes('item number')
    )) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = (raw[headerRowIdx] as unknown[]).map(norm);

  // Code column: ordered from most specific → least specific
  // 'item' is last-resort — safe in a pricing file where there's no separate description column
  const colCode = findCol(headers,
    'wine code', 'item code', 'item number', 'item no', 'item #',
    'product code', 'code', 'sku', 'item'
  );
  const colDefault = findCol(headers, 'default price', 'retail price', 'price', 'unit price', 'btl price', 'bottle price');
  const colFob = findCol(headers, 'fob price', 'fob', 'laid-in', 'laid in', 'cost');

  const detectedCodeCol = colCode >= 0 ? headers[colCode] : '(not found)';
  const detectedPriceCol = colDefault >= 0 ? headers[colDefault] : '(not found)';

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

  const sampleCodes = rows.slice(0, 5).map((r) => r.wineCode);

  resolve({
    rows,
    rowCount: rows.length,
    errors: rows.length === 0 ? [`No data rows — code col: "${detectedCodeCol}", price col: "${detectedPriceCol}"`] : [],
    filename,
    detectedCodeCol,
    detectedPriceCol,
    sampleCodes,
  });
}

export function parsePricingDetailed(file: File): Promise<PricingParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    const fail = (msg: string) =>
      resolve({ rows: [], rowCount: 0, errors: [msg], filename: file.name, ...EMPTY_DEBUG });

    reader.onload = (e) => {
      try {
        const data = e.target?.result;

        if (file.name.match(/\.(xlsx|xls)$/i)) {
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName =
            workbook.SheetNames.find((n) => /price/i.test(n)) ?? workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          resolveFromRows(raw, file.name, resolve);
        } else {
          // CSV fallback
          const text = data as string;
          const lines = text.split(/\r?\n/).filter((l) => l.trim());
          if (lines.length < 2) { fail('File has no data rows'); return; }
          const firstLine = lines[0];
          const delim = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
          const rawRows: unknown[][] = lines.map((l) => {
            const result: string[] = [];
            let inQuote = false;
            let cell = '';
            for (const ch of l) {
              if (ch === '"') { inQuote = !inQuote; }
              else if (ch === delim && !inQuote) { result.push(cell.trim()); cell = ''; }
              else { cell += ch; }
            }
            result.push(cell.trim());
            return result;
          });
          resolveFromRows(rawRows, file.name, resolve);
        }
      } catch (err) {
        fail(err instanceof Error ? err.message : 'Parse error');
      }
    };

    reader.onerror = () => fail('File read error');

    if (file.name.match(/\.(xlsx|xls)$/i)) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'utf-8');
    }
  });
}
