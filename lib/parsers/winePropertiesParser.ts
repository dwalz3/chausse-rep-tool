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

// Score-based header row detection: try rows 0-5, pick the one with most recognized column keywords
const HEADER_SCORE_KEYWORDS = [
  'wine code', 'item code', 'code', 'sku',
  'wine name', 'item name', 'name', 'description',
  'producer', 'supplier', 'importer',
  'country', 'region', 'vintage',
  'wine type', 'product type', 'type', 'category',
  'price', 'cost',
];

function findHeaderRow(raw: unknown[][]): number {
  let bestRow = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(6, raw.length); i++) {
    const row = (raw[i] as unknown[]).map(norm);
    let score = 0;
    for (const h of row) {
      if (h && HEADER_SCORE_KEYWORDS.some((kw) => h.includes(kw))) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }
  return bestRow;
}

function isJunkRow(code: string, name: string): boolean {
  const s = (code + ' ' + name).toLowerCase();
  return (
    s.includes('delivery fee') ||
    s.includes('freight') ||
    s.includes('surcharge') ||
    s.includes('handling fee') ||
    s.includes('under minimum') ||
    s.includes('minimum order') ||
    s.includes('service fee') ||
    /^[-=*#]+$/.test(code.trim())
  );
}

function parseWineType(raw: string): WineType {
  const s = raw.trim().toLowerCase();
  if (!s) return 'Other';
  // Sparkling first — catches "sparkling red", "pét nat", etc.
  if (s.includes('sparkling') || s.includes('champagne') || s.includes('prosecco') ||
      s.includes('cava') || s.includes('crémant') || s.includes('cremant') ||
      s.includes('pét nat') || s.includes('pét-nat') || s.includes('pet nat') || s.includes('pet-nat') || s.includes('pétillant') ||
      s.includes('petillant') || s.includes('mousseux') || s.includes('frizzante') ||
      s.includes('lambrusco') || s === 'sp' || s === 'bubbly')
    return 'Sparkling';
  // Orange / skin-contact before white
  if (s.includes('orange') || s.includes('skin contact') || s.includes('skin-contact') ||
      s.includes('amber') || s.includes('ramato') || s === 'sk')
    return 'Orange';
  // Rosé
  if (s.includes('ros') || s === 'pink' || s === 'rz')
    return 'Rosé';
  // Vermouth / aperitif / fortified
  if (s.includes('vermouth') || s.includes('aperitif') || s.includes('apéritif') ||
      s.includes('amaro') || s.includes('liqueur') || s.includes('fortified') ||
      s.includes('porto') || s.includes('sherry') || s.includes('madeira') ||
      s.includes('sake') || s.includes('mead') || s.includes('cider'))
    return 'Vermouth';
  // Non-alcoholic
  if (s.includes('tea') || s === 'n/a' || s === 'na' || s.includes('non-alc') ||
      s.includes('dealc') || s.includes('non alcoholic') || s.includes('nonalcoholic') ||
      s.includes('alcohol free') || s.includes('alcohol-free') || s.includes('kombucha') ||
      s.includes('zero') || s === 'na wine')
    return 'Tea/NA';
  // Red — after orange/rosé checks
  if (s.includes('red') || s.includes('rouge') || s.includes('tinto') || s.includes('rosso') ||
      s.includes('nero') || s.includes('noir') || s === 'r' || s === 'rd')
    return 'Red';
  // White
  if (s.includes('white') || s.includes('blanc') || s.includes('bianco') || s.includes('blanco') ||
      s.includes('weiss') || s.includes('grüner') || s.includes('gruner') ||
      s === 'w' || s === 'wh')
    return 'White';
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
  // Debug: what was detected during parse
  detectedCodeCol: string;
  sampleCodes: string[];
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
            resolve({ rows: [], rowCount: 0, errors: ['File has no data rows'], filename: file.name, detectedCodeCol: '(none)', sampleCodes: [] });
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
          detectedCodeCol: '(error)',
          sampleCodes: [],
        });
      }
    };

    reader.onerror = () => resolve({ rows: [], rowCount: 0, errors: ['File read error'], filename: file.name, detectedCodeCol: '(error)', sampleCodes: [] });

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
    resolve({ rows: [], rowCount: 0, errors: ['File has no data rows'], filename, detectedCodeCol: '(none)', sampleCodes: [] });
    return;
  }

  const headerRowIdx = findHeaderRow(raw);
  const headers = (raw[headerRowIdx] as unknown[]).map(norm);
  const colCode = findCol(headers, 'wine code', 'item code', 'item number', 'item no', 'product code', 'code', 'sku', 'item #');
  const colName = findCol(headers, 'wine name', 'item name', 'item description', 'product name', 'product description', 'full name', 'name', 'description', 'item');
  const colProducer = findCol(headers, 'producer', 'producer name', 'supplier', 'winery', 'estate', 'brand');
  const colImporter = findCol(headers, 'importer', 'importer name', 'distributor', 'broker');
  const colCountry = findCol(headers, 'country', 'country of origin', 'origin');
  const colRegion = findCol(headers, 'region', 'appellation', 'area', 'sub-region', 'subregion');
  const colPallet = findCol(headers, 'cases/pallet', 'cases per pallet', 'cs/plt', 'pallet');
  const colType = findCol(headers,
    'wine type', 'product type', 'varietal type', 'beverage type',
    'wine category', 'item type', 'product group', 'subcategory',
    'category', 'style', 'color', 'type', 'kind', 'varietal', 'grape'
  );
  const colVintage = findCol(headers, 'vintage', 'vintage year', 'year', 'vy');

  const rows: WinePropertyRow[] = [];

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const wineCode = colCode >= 0 ? String(r[colCode] ?? '').trim() : '';
    if (!wineCode || isJunkRow(wineCode, colName >= 0 ? String(r[colName] ?? '') : '')) continue;

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

  const detectedCodeCol = colCode >= 0 ? headers[colCode] : '(not found)';
  const sampleCodes = rows.slice(0, 5).map((r) => r.wineCode);

  resolve({ rows, rowCount: rows.length, errors: rows.length === 0 ? ['No data rows found'] : [], filename, detectedCodeCol, sampleCodes });
}
