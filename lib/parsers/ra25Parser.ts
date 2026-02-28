import * as XLSX from 'xlsx';
import { Ra25Row, Ra25Data, Ra25AccountSummary } from '@/types';

function toNum(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export async function parseRa25(file: File): Promise<{ data: Ra25Data; rowCount: number; errors: string[]; filename: string }> {
  const errors: string[] = [];

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName = wb.SheetNames.find((n) => n.trim().toLowerCase() === 'accounts');
  if (!sheetName) {
    return {
      data: { rows: [], accountTotals: [], parsedAt: new Date().toISOString() },
      rowCount: 0,
      errors: [`Sheet "Accounts" not found. Available sheets: ${wb.SheetNames.join(', ')}`],
      filename: file.name,
    };
  }

  const ws = wb.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  if (raw.length < 3) {
    return {
      data: { rows: [], accountTotals: [], parsedAt: new Date().toISOString() },
      rowCount: 0,
      errors: ['Sheet has fewer than 3 rows'],
      filename: file.name,
    };
  }

  const headerRow = raw[1] as unknown[];

  function findCol(names: string[]): number {
    for (const name of names) {
      const idx = headerRow.findIndex(
        (h) => typeof h === 'string' && h.trim().toLowerCase() === name.toLowerCase()
      );
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const colAccount = findCol(['Account', 'Account Name']);
  const colImporter = findCol(['Importer', 'Importer Name']);
  const colRep = findCol(['Sales Rep', 'SalesRep', 'Rep']);
  const colQty = findCol(['Total Qty', 'Qty', 'Quantity', 'Total Quantity']);
  const colRevenue = findCol(['Total Revenue', 'Revenue', 'Total', 'Amount']);

  if (colAccount === -1) {
    errors.push('Could not find "Account" column');
  }

  const rows: Ra25Row[] = [];

  for (let r = 2; r < raw.length; r++) {
    const row = raw[r] as unknown[];
    if (!row || row.every((v) => v == null)) continue;

    const account = String(row[colAccount] ?? '').trim();
    if (!account) continue;
    if (account.toLowerCase() === 'total') continue;
    if (/^\d+$/.test(account)) continue;

    const importer = colImporter !== -1 ? String(row[colImporter] ?? '').trim() : '';
    const salesRep = colRep !== -1 ? String(row[colRep] ?? '').trim() : '';
    const totalQty = colQty !== -1 ? toNum(row[colQty]) : 0;
    const totalRevenue = colRevenue !== -1 ? toNum(row[colRevenue]) : 0;

    rows.push({ account, importer, salesRep, totalQty, totalRevenue });
  }

  const accountMap = new Map<string, {
    totalRevenue: number;
    totalQty: number;
    importers: Map<string, number>;
    repCounts: Map<string, number>;
  }>();

  for (const row of rows) {
    if (!accountMap.has(row.account)) {
      accountMap.set(row.account, {
        totalRevenue: 0,
        totalQty: 0,
        importers: new Map(),
        repCounts: new Map(),
      });
    }
    const entry = accountMap.get(row.account)!;
    entry.totalRevenue += row.totalRevenue;
    entry.totalQty += row.totalQty;
    if (row.importer) {
      entry.importers.set(row.importer, (entry.importers.get(row.importer) ?? 0) + 1);
    }
    if (row.salesRep) {
      entry.repCounts.set(row.salesRep, (entry.repCounts.get(row.salesRep) ?? 0) + 1);
    }
  }

  const grandTotal = Array.from(accountMap.values()).reduce((s, e) => s + e.totalRevenue, 0);

  const unsorted: Ra25AccountSummary[] = [];
  for (const [account, entry] of accountMap.entries()) {
    if (entry.totalRevenue <= 0) continue;

    const importers = Array.from(entry.importers.keys());
    let primaryRep = '';
    let maxCount = 0;
    for (const [rep, count] of entry.repCounts.entries()) {
      if (count > maxCount) { maxCount = count; primaryRep = rep; }
    }
    const revenueShare = grandTotal > 0 ? (entry.totalRevenue / grandTotal) * 100 : 0;

    unsorted.push({
      account,
      totalRevenue: entry.totalRevenue,
      totalQty: entry.totalQty,
      importers,
      primaryRep,
      revenueShare,
      cumulativeShare: 0,
    });
  }

  unsorted.sort((a, b) => b.totalRevenue - a.totalRevenue);

  let cumulative = 0;
  const accountTotals: Ra25AccountSummary[] = unsorted.map((a) => {
    cumulative += a.revenueShare;
    return { ...a, cumulativeShare: cumulative };
  });

  return {
    data: {
      rows,
      accountTotals,
      parsedAt: new Date().toISOString(),
    },
    rowCount: rows.length,
    errors,
    filename: file.name,
  };
}
