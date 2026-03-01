import * as XLSX from 'xlsx';
import { Ra25Row, Ra25Data, Ra25AccountSummary, Ra25WineRow } from '@/types';

function toNum(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function normCode(s: string): string {
  return s.toString().trim().toUpperCase();
}

export async function parseRa25(file: File): Promise<{
  data: Ra25Data;
  rowCount: number;
  errors: string[];
  filename: string;
  allHeaders: string[];
  detectedWineNameCol: string;
  detectedWineCodeCol: string;
  hasWineDetail: boolean;
}> {
  const errors: string[] = [];

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName = wb.SheetNames.find((n) => n.trim().toLowerCase() === 'accounts');
  if (!sheetName) {
    return {
      data: { rows: [], accountTotals: [], wineTotals: [], parsedAt: new Date().toISOString() },
      rowCount: 0,
      errors: [`Sheet "Accounts" not found. Available sheets: ${wb.SheetNames.join(', ')}`],
      filename: file.name,
      allHeaders: [],
      detectedWineNameCol: '(no sheet)',
      detectedWineCodeCol: '(no sheet)',
      hasWineDetail: false,
    };
  }

  const ws = wb.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  if (raw.length < 3) {
    return {
      data: { rows: [], accountTotals: [], wineTotals: [], parsedAt: new Date().toISOString() },
      rowCount: 0,
      errors: ['Sheet has fewer than 3 rows'],
      filename: file.name,
      allHeaders: [],
      detectedWineNameCol: '(no data)',
      detectedWineCodeCol: '(no data)',
      hasWineDetail: false,
    };
  }

  // Try row index 1 first, fall back to row 0
  let headerRowIdx = 1;
  const row0Normalized = (raw[0] as unknown[]).map((h) => String(h ?? '').trim().toLowerCase());
  const row1Normalized = (raw[1] as unknown[]).map((h) => String(h ?? '').trim().toLowerCase());
  if (row0Normalized.some((h) => h.includes('account') || h.includes('revenue') || h.includes('qty'))) {
    headerRowIdx = 0;
  }
  const headerRow = raw[headerRowIdx] as unknown[];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void row1Normalized;

  function findCol(names: string[]): number {
    for (const name of names) {
      const idx = headerRow.findIndex(
        (h) => typeof h === 'string' && h.trim().toLowerCase().includes(name.toLowerCase())
      );
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const colAccount = findCol(['account name', 'account']);
  const colImporter = findCol(['importer name', 'importer', 'supplier', 'vendor']);
  const colRep = findCol(['sales rep', 'salesrep', 'rep']);
  const colQty = findCol(['total qty', 'quantity', 'total quantity', 'qty', 'bottles']);
  const colRevenue = findCol(['total revenue', 'revenue', 'total', 'amount', 'sales']);
  // Wine/item columns — these may or may not exist
  const colWineName = findCol(['wine name', 'item name', 'item description', 'description', 'product name', 'wine', 'item', 'product']);
  const colWineCode = findCol(['wine code', 'item code', 'item number', 'item no', 'sku', 'product code', 'code']);

  if (colAccount === -1) {
    errors.push('Could not find "Account" column');
  }

  const rows: Ra25Row[] = [];

  for (let r = headerRowIdx + 1; r < raw.length; r++) {
    const row = raw[r] as unknown[];
    if (!row || row.every((v) => v == null)) continue;

    const account = String(row[colAccount] ?? '').trim();
    if (!account) continue;
    if (account.toLowerCase() === 'total') continue;
    if (/^\d+$/.test(account)) continue;
    // Skip rows that look like importer sub-headers (no revenue and no qty)
    const rev = colRevenue !== -1 ? toNum(row[colRevenue]) : 0;
    const qty = colQty !== -1 ? toNum(row[colQty]) : 0;
    if (rev === 0 && qty === 0) continue;

    const importer = colImporter !== -1 ? String(row[colImporter] ?? '').trim() : '';
    const salesRep = colRep !== -1 ? String(row[colRep] ?? '').trim() : '';
    const wineName = colWineName !== -1 ? String(row[colWineName] ?? '').trim() : '';
    const wineCode = colWineCode !== -1 ? String(row[colWineCode] ?? '').trim() : '';

    rows.push({
      account,
      importer,
      salesRep,
      totalQty: qty,
      totalRevenue: rev,
      ...(wineName ? { wineName } : {}),
      ...(wineCode ? { wineCode } : {}),
    });
  }

  // ── Account-level aggregation ────────────────────────────────────────────────
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

  // ── Wine-level aggregation ───────────────────────────────────────────────────
  // Only runs when the RA25 file has actual per-wine rows.
  // No importer fallback — importer names should never appear as wine names.
  const wineMap = new Map<string, {
    wineName: string;
    importer: string;
    revenue: number;
    casesSold: number;
    accounts: Set<string>;
  }>();

  const hasWineData = rows.some((r) => r.wineName || r.wineCode);

  if (hasWineData) {
    for (const row of rows) {
      // Only use actual wine name — do NOT fall back to importer
      const rawName = row.wineName || '';
      const key = row.wineCode ? normCode(row.wineCode) : rawName ? rawName.toUpperCase() : null;
      if (!key) continue;   // skip rows with no wine identity at all
      const ex = wineMap.get(key);
      if (ex) {
        ex.revenue += row.totalRevenue;
        ex.casesSold += row.totalQty;
        ex.accounts.add(row.account);
      } else {
        wineMap.set(key, {
          wineName: rawName || row.wineCode || key,
          importer: row.importer,
          revenue: row.totalRevenue,
          casesSold: row.totalQty,
          accounts: new Set([row.account]),
        });
      }
    }
  }
  // If hasWineData is false, wineTotals stays empty — the caller can show an appropriate message.

  const wineTotals: Ra25WineRow[] = Array.from(wineMap.entries())
    .map(([key, v]) => ({
      wineCode: key,
      wineName: v.wineName,
      importer: v.importer,
      revenue: v.revenue,
      casesSold: v.casesSold,
      accountCount: v.accounts.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const allHeaders = headerRow.map((h) => String(h ?? '').trim().toLowerCase());

  return {
    data: {
      rows,
      accountTotals,
      wineTotals,
      parsedAt: new Date().toISOString(),
    },
    rowCount: rows.length,
    errors,
    filename: file.name,
    allHeaders,
    detectedWineNameCol: colWineName >= 0 ? allHeaders[colWineName] : '(not found)',
    detectedWineCodeCol: colWineCode >= 0 ? allHeaders[colWineCode] : '(not found)',
    hasWineDetail: hasWineData,
  };
}
