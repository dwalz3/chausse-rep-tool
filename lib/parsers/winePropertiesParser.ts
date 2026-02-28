/**
 * Wine Properties Parser — CSV or XLSX format
 * Columns: Wine Code, Wine Name (full), Producer, Importer, Country, Category/Type
 */

import * as XLSX from 'xlsx';
import { WinePropertyRow, WineType } from '@/types';
import { parseWineName } from './parseWineName';

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findCol(headers: string[], ...keywords: string[]): number {
  for (const kw of keywords) {
    const idx = headers.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseWineType(raw: string): WineType {
  const s = raw.trim().toLowerCase();
  if (s.includes('sparkling') || s.includes('champagne') || s.includes('prosecco') || s.includes('cava') || s.includes('crémant'))
    return 'Sparkling';
  if (s.includes('orange')) return 'Orange';
  if (s.includes('ros')) return 'Rosé';
  if (s.includes('red') || s.includes('rouge') || s.includes('tinto') || s.includes('rosso')) return 'Red';
  if (s.includes('white') || s.includes('blanc') || s.includes('bianco') || s.includes('blanco')) return 'White';
  if (s.includes('vermouth') || s.includes('aperitif')) return 'Vermouth';
  if (s.includes('tea') || s.includes('n/a') || s.includes('non-alc') || s.includes('dealc')) return 'Tea/NA';
  return 'Other';
}

function parseFarmingFlags(name: string, importer: string): { isNatural: boolean; isBiodynamic: boolean } {
  const combined = `${name} ${importer}`.toLowerCase();
  return {
    isNatural: combined.includes('natural') || combined.includes('nature'),
    isBiodynamic: combined.includes('biodynamic') || combined.includes('biodynamique') || combined.includes('demeter'),
  };
}

export interface WinePropertiesParseResult {
  rows: WinePropertyRow[];
  rowCount: number;
  errors: string[];
  filename: string;
}

export function parseWineProperties(file: File): Promise<WinePropertiesParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;

        // Try XLSX first, fall back to CSV text parsing
        if (file.name.match(/\.(xlsx|xls)$/i)) {
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          resolveFromRows(raw, file.name, resolve);
        } else {
          // CSV text
          const text = data as string;
          const lines = text.split(/\r?\n/).filter((l) => l.trim());
          if (lines.length < 2) {
            resolve({ rows: [], rowCount: 0, errors: ['File has no data rows'], filename: file.name });
            return;
          }
          const firstLine = lines[0];
          const delim = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

          function splitLine(line: string): string[] {
            const result: string[] = [];
            let inQuote = false;
            let cell = '';
            for (let i = 0; i < line.length; i++) {
              const ch = line[i];
              if (ch === '"') { inQuote = !inQuote; }
              else if (ch === delim && !inQuote) { result.push(cell.trim()); cell = ''; }
              else { cell += ch; }
            }
            result.push(cell.trim());
            return result;
          }

          const rawRows: unknown[][] = lines.map((l) => splitLine(l));
          resolveFromRows(rawRows, file.name, resolve);
        }
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

    if (file.name.match(/\.(xlsx|xls)$/i)) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'utf-8');
    }
  });
}

function resolveFromRows(
  raw: unknown[][],
  filename: string,
  resolve: (r: WinePropertiesParseResult) => void
): void {
  if (raw.length < 2) {
    resolve({ rows: [], rowCount: 0, errors: ['File has no data rows'], filename });
    return;
  }

  const headers = (raw[0] as unknown[]).map(norm);
  const colCode = findCol(headers, 'wine code', 'item code', 'code', 'sku');
  const colName = findCol(headers, 'wine name', 'name', 'description', 'item name');
  const colProducer = findCol(headers, 'producer', 'supplier', 'winery');
  const colImporter = findCol(headers, 'importer');
  const colCountry = findCol(headers, 'country', 'origin');
  const colRegion = findCol(headers, 'region', 'area', 'appellation');
  const colPallet = findCol(headers, 'cases/pallet', 'cases per pallet', 'pallet', 'cs/plt');
  const colType = findCol(headers, 'category', 'type', 'product type', 'varietal type', 'wine type');
  const colVintage = findCol(headers, 'vintage', 'year');

  const rows: WinePropertyRow[] = [];

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const wineCode = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
    if (!wineCode) continue;

    const rawName = colName >= 0 ? String(r[colName] ?? '').trim() : '';
    const parsed = parseWineName(rawName);

    const producer = colProducer >= 0 ? String(r[colProducer] ?? '').trim() : parsed.producer;
    const importer = colImporter >= 0 ? String(r[colImporter] ?? '').trim() : '';
    const country = colCountry >= 0 ? String(r[colCountry] ?? '').trim() : '';
    const region = colRegion >= 0 ? String(r[colRegion] ?? '').trim() : '';
    const casesPerPallet = colPallet >= 0 ? Math.max(1, Number(r[colPallet]) || 56) : 56;
    const typeRaw = colType >= 0 ? String(r[colType] ?? '').trim() : '';
    const wineType = parseWineType(typeRaw || rawName);
    const vintage = colVintage >= 0 ? String(r[colVintage] ?? '').trim() : parsed.vintage;

    const { isNatural, isBiodynamic } = parseFarmingFlags(rawName, importer);

    rows.push({
      wineCode,
      name: rawName,
      wineName: parsed.wineName || rawName,
      producer,
      importer,
      country,
      region,
      wineType,
      vintage,
      caseSize: parsed.caseSize,
      bottleSize: parsed.bottleSize,
      isNatural,
      isBiodynamic,
      isDirect: importer.toLowerCase().includes('chausse'),
      casesPerPallet,
    });
  }

  resolve({ rows, rowCount: rows.length, errors: rows.length === 0 ? ['No data rows found'] : [], filename });
}
