import * as XLSX from 'xlsx';
import { ProducerRow, ProducersData } from '@/types';

function splitComma(val: unknown): string[] {
  if (!val) return [];
  return String(val).split(',').map((s) => s.trim()).filter(Boolean);
}

function toNum(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function str(val: unknown): string {
  return String(val ?? '').trim();
}

export async function parseProducers(file: File): Promise<{ data: ProducersData; rowCount: number; errors: string[]; filename: string }> {
  const errors: string[] = [];

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName = wb.SheetNames.find((n) => n.trim().toLowerCase() === 'producers');
  if (!sheetName) {
    return {
      data: { producers: [], byCountry: [], byImporter: [], byFarming: [], parsedAt: new Date().toISOString() },
      rowCount: 0,
      errors: [`Sheet "Producers" not found. Available: ${wb.SheetNames.join(', ')}`],
      filename: file.name,
    };
  }

  const ws = wb.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  if (raw.length < 2) {
    return {
      data: { producers: [], byCountry: [], byImporter: [], byFarming: [], parsedAt: new Date().toISOString() },
      rowCount: 0,
      errors: ['Sheet has fewer than 2 rows'],
      filename: file.name,
    };
  }

  const headerRow = raw[0] as unknown[];

  function findCol(names: string[]): number {
    for (const name of names) {
      const idx = headerRow.findIndex(
        (h) => typeof h === 'string' && h.trim().toLowerCase() === name.toLowerCase()
      );
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const colUploadType = 0;
  const colRecordId = findCol(['Record ID', 'ID', 'RecordId']);
  const colName = findCol(['Name', 'Producer Name', 'Producer']);
  const colRegion = findCol(['Region', 'Area']);
  const colCountry = findCol(['Country']);
  const colAbout = findCol(['About', 'Description', 'Notes']);
  const colFarming = findCol(['Farming Practices', 'Farming', 'Farming Practice']);
  const colImporter = findCol(['Importer', 'Importer Name']);
  const colMarket = findCol(['Market Jurisdictions', 'Markets', 'Market']);
  const colFda = findCol(['FDA Number', 'FDA #', 'FDA']);

  const producers: ProducerRow[] = [];

  for (let r = 1; r < raw.length; r++) {
    const row = raw[r] as unknown[];
    if (!row || row.every((v) => v == null)) continue;

    const uploadType = str(row[colUploadType]).toLowerCase();
    if (uploadType !== 'producers') continue;

    const name = colName !== -1 ? str(row[colName]) : '';
    if (!name) continue;

    const importer = colImporter !== -1 ? str(row[colImporter]) : '';

    producers.push({
      recordId: colRecordId !== -1 ? toNum(row[colRecordId]) : r,
      name,
      region: colRegion !== -1 ? str(row[colRegion]) : '',
      country: colCountry !== -1 ? str(row[colCountry]) : '',
      about: colAbout !== -1 ? str(row[colAbout]) : '',
      farmingPractices: colFarming !== -1 ? splitComma(row[colFarming]) : [],
      importer,
      marketJurisdictions: colMarket !== -1 ? splitComma(row[colMarket]) : [],
      fdaNumber: colFda !== -1 ? str(row[colFda]) : '',
      isDirectImport: importer.toLowerCase().includes('chausse'),
    });
  }

  const countryMap = new Map<string, Map<string, number>>();
  for (const p of producers) {
    const country = p.country || 'Unknown';
    if (!countryMap.has(country)) countryMap.set(country, new Map());
    const importerMap = countryMap.get(country)!;
    importerMap.set(p.importer, (importerMap.get(p.importer) ?? 0) + 1);
  }

  const byCountry = Array.from(countryMap.entries())
    .map(([country, importerMap]) => ({
      country,
      count: Array.from(importerMap.values()).reduce((s, v) => s + v, 0),
      importers: Array.from(importerMap.entries())
        .map(([importer, count]) => ({ importer, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);

  const importerMap = new Map<string, number>();
  for (const p of producers) {
    const imp = p.importer || 'Unknown';
    importerMap.set(imp, (importerMap.get(imp) ?? 0) + 1);
  }
  const byImporter = Array.from(importerMap.entries())
    .map(([importer, count]) => ({
      importer,
      count,
      isDirectImport: importer.toLowerCase().includes('chausse'),
    }))
    .sort((a, b) => b.count - a.count);

  const farmingMap = new Map<string, number>();
  for (const p of producers) {
    if (p.farmingPractices.length === 0) {
      farmingMap.set('Unknown', (farmingMap.get('Unknown') ?? 0) + 1);
    } else {
      for (const practice of p.farmingPractices) {
        farmingMap.set(practice, (farmingMap.get(practice) ?? 0) + 1);
      }
    }
  }
  const byFarming = Array.from(farmingMap.entries())
    .map(([practice, count]) => ({ practice, count }))
    .sort((a, b) => b.count - a.count);

  return {
    data: {
      producers,
      byCountry,
      byImporter,
      byFarming,
      parsedAt: new Date().toISOString(),
    },
    rowCount: producers.length,
    errors,
    filename: file.name,
  };
}
