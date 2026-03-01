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
  samplePrices: number[];  // first 5 prices — if all 0, price col is wrong
}

const EMPTY_DEBUG: Pick<PricingParseResult, 'detectedCodeCol' | 'detectedPriceCol' | 'sampleCodes' | 'samplePrices'> = {
  detectedCodeCol: '(none)',
  detectedPriceCol: '(none)',
  sampleCodes: [],
  samplePrices: [],
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

  // Price column: exclude "price label", "price type", "price code", "price group" —
  // those are Vinosmith/distributor text metadata columns, not dollar values.
  // After named keywords, fall back to scanning for the first numeric column.
  function findPriceCol(): number {
    // 1. Named keywords (exact intent)
    const named = findCol(headers, 'default price', 'retail price', 'unit price', 'btl price', 'bottle price', 'sell price', 'suggested price');
    if (named >= 0) return named;
    // 2. Any column containing 'price' EXCEPT those that are clearly text labels
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (h.includes('price') && !/price\s*(label|type|code|tier|group|level|class|name|id)/.test(h)) {
        return i;
      }
    }
    // 3. 'default', 'retail', 'wholesale' standalone
    const named2 = findCol(headers, 'default', 'retail', 'wholesale');
    if (named2 >= 0) return named2;
    // 4. Scan data rows — first column (after the code col) with consistently numeric, non-zero values
    if (raw.length > headerRowIdx + 1) {
      const dataRows = raw.slice(headerRowIdx + 1, headerRowIdx + 11) as unknown[][];
      for (let col = 0; col < headers.length; col++) {
        if (col === colCode) continue;
        const vals = dataRows.map((r) => Number((r as unknown[])[col]));
        const numericPositive = vals.filter((v) => isFinite(v) && v > 0).length;
        if (numericPositive >= Math.min(5, dataRows.length * 0.6)) return col;
      }
    }
    return -1;
  }

  const colDefault = findPriceCol();
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
  const samplePrices = rows.slice(0, 5).map((r) => r.defaultPrice);

  resolve({
    rows,
    rowCount: rows.length,
    errors: rows.length === 0 ? [`No data rows — code col: "${detectedCodeCol}", price col: "${detectedPriceCol}"`] : [],
    filename,
    detectedCodeCol,
    detectedPriceCol,
    sampleCodes,
    samplePrices,
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
