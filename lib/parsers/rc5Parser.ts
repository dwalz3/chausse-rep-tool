import * as XLSX from 'xlsx';
import { Rc5Row, Rc5Data } from '@/types';

function derivePrimaryRep(raw: string): Rc5Row['primaryRep'] {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  const hasAustin = lower.includes('austin');
  const hasJason = lower.includes('jason');
  const hasDave = lower.includes('dave');
  const hasAlejandra = lower.includes('alejandra');
  const count = [hasAustin, hasJason, hasDave, hasAlejandra].filter(Boolean).length;
  if (count > 1) return 'shared';
  if (hasAustin) return 'austin';
  if (hasJason) return 'jason';
  if (hasDave) return 'dave';
  if (hasAlejandra) return 'alejandra';
  return 'unknown';
}

function excelDateToYYYYMM(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === 'number') {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (!parsed) return null;
    const month = String(parsed.m).padStart(2, '0');
    return `${parsed.y}-${month}`;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${d.getFullYear()}-${month}`;
    }
  }
  return null;
}

function toNum(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export async function parseRc5(file: File): Promise<{ data: Rc5Data; rowCount: number; errors: string[]; filename: string }> {
  const errors: string[] = [];

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName = wb.SheetNames.find((n) => n.trim().toLowerCase() === 'sales');
  if (!sheetName) {
    return {
      data: { rows: [], monthLabels: [], totalRevenue: 0, parsedAt: new Date().toISOString() },
      rowCount: 0,
      errors: [`Sheet "Sales" not found. Available sheets: ${wb.SheetNames.join(', ')}`],
      filename: file.name,
    };
  }

  const ws = wb.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  if (raw.length < 2) {
    return {
      data: { rows: [], monthLabels: [], totalRevenue: 0, parsedAt: new Date().toISOString() },
      rowCount: 0,
      errors: ['Sheet has fewer than 2 rows'],
      filename: file.name,
    };
  }

  const headerRow = raw[0] as unknown[];

  const monthLabels: string[] = [];
  for (let c = 6; c <= 18 && c < headerRow.length; c++) {
    const label = excelDateToYYYYMM(headerRow[c]);
    monthLabels.push(label ?? `col-${c}`);
  }

  const rows: Rc5Row[] = [];

  for (let r = 1; r < raw.length; r++) {
    const row = raw[r] as unknown[];
    if (!row || row.every((v) => v == null)) continue;

    const account = String(row[0] ?? '').trim();
    if (!account) continue;
    if (account.toLowerCase() === 'total' || account.toLowerCase() === 'grand total') continue;

    const accountCode = String(row[1] ?? '').trim();
    const salesRep = String(row[2] ?? '').trim();
    const region = String(row[3] ?? '').trim();
    const accountType = String(row[4] ?? '').trim();

    const monthlyRevenue: number[] = [];
    for (let c = 6; c <= 18 && c < row.length; c++) {
      monthlyRevenue.push(toNum(row[c]));
    }
    while (monthlyRevenue.length < 13) monthlyRevenue.push(0);

    const totalRevenue = monthlyRevenue.reduce((s, v) => s + v, 0);
    const activeMonths = monthlyRevenue.filter((v) => v > 0).length;

    let lastActiveMonth: string | null = null;
    for (let i = 12; i >= 0; i--) {
      if (monthlyRevenue[i] > 0) {
        lastActiveMonth = monthLabels[i] ?? null;
        break;
      }
    }

    const last3Sum = monthlyRevenue[10] + monthlyRevenue[11] + monthlyRevenue[12];
    const first10Sum = monthlyRevenue.slice(0, 10).reduce((s, v) => s + v, 0);
    const isDormant = last3Sum === 0 && first10Sum > 0;
    const isNew = first10Sum === 0 && last3Sum > 0;

    const primaryRep = derivePrimaryRep(salesRep);

    rows.push({
      account,
      accountCode,
      salesRep,
      primaryRep,
      region,
      accountType,
      totalRevenue,
      monthlyRevenue,
      monthLabels,
      activeMonths,
      lastActiveMonth,
      isDormant,
      isNew,
    });
  }

  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);

  return {
    data: {
      rows,
      monthLabels,
      totalRevenue,
      parsedAt: new Date().toISOString(),
    },
    rowCount: rows.length,
    errors,
    filename: file.name,
  };
}
