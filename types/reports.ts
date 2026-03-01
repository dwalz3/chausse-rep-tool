// ── RA23 — Account + Wine Detail ───────────────────────────────────────────────
// Row-level: account x wine x revenue. The replacement for RA25 wine detail.

export interface Ra23Row {
  account: string;
  wineCode: string;
  wineName: string;
  importer: string;
  salesRep: string;
  qty: number;       // cases (or bottles — depends on report config)
  revenue: number;
}

// byAccount and byWineCode are computed Maps — NOT stored in Zustand (Maps can't serialize).
// Rebuild in useMemo inside components from the raw rows array.
export interface Ra23Data {
  rows: Ra23Row[];
  rowCount: number;
  parsedAt: string;
}

// ── RA21 — Top Wines Sold ───────────────────────────────────────────────────────

export interface Ra21Row {
  rank: number;      // 1-based; assigned as rowIndex+1 if no rank column present
  wineCode: string;
  wineName: string;
  importer: string;
  revenue: number;
  qty: number;
  accountCount: number;  // number of distinct accounts, if available
}

export interface Ra21Data {
  rows: Ra21Row[];
  rowCount: number;
  parsedAt: string;
}

// ── RA27 — Points of Distribution ──────────────────────────────────────────────

export interface Ra27Row {
  wineCode: string;
  wineName: string;
  accountCount: number;  // # distinct accounts carrying this wine
}

// byWineCode stored as plain Record (not Map) for localStorage compat.
export interface Ra27Data {
  rows: Ra27Row[];
  byWineCode: Record<string, number>;  // normCode → accountCount
  rowCount: number;
  parsedAt: string;
}

// ── RB6Rep — Velocity + Inventory ──────────────────────────────────────────────

export interface Rb6RepRow {
  wineCode: string;
  wineName: string;
  supplier: string;
  onHandBottles: number;
  avgMonthlyVelocity: number;   // bottles sold per month (rolling avg)
  isLowStock: boolean;          // onHandBottles < 12
  isCritical: boolean;          // onHandBottles < 6
  isOutOfStock: boolean;        // onHandBottles === 0
}

// byWineCode stored as plain Record for localStorage compat.
export interface Rb6RepData {
  rows: Rb6RepRow[];
  byWineCode: Record<string, Rb6RepRow>;  // normCode → row
  rowCount: number;
  parsedAt: string;
}

// ── RA30 — New Placements ───────────────────────────────────────────────────────

export interface Ra30Row {
  wineCode: string;
  wineName: string;
  account: string;
  importer: string;
  placementDate: string | null;  // ISO date string or null if unparseable
  daysAgo: number | null;        // computed from placementDate vs parsedAt
}

// byWineCode: normCode → Ra30Row[]
export interface Ra30Data {
  rows: Ra30Row[];
  recentPlacements: Ra30Row[];  // rows where daysAgo <= 90
  byWineCode: Record<string, Ra30Row[]>;
  rowCount: number;
  parsedAt: string;
}

// ── RC3 — Unloved Accounts ──────────────────────────────────────────────────────

export interface Rc3Row {
  account: string;
  accountCode: string;
  salesRep: string;
  lastOrderDate: string | null;   // ISO date or null
  daysSinceOrder: number | null;  // computed
  ltmRevenue: number;             // last 12 months revenue
  priority: 'High' | 'Medium' | 'Low';
  priorityScore: number;          // ltmRevenue / Math.log(daysSinceOrder + 1)
}

export interface Rc3Data {
  rows: Rc3Row[];  // sorted by priorityScore descending
  rowCount: number;
  parsedAt: string;
}

// ── RA3 — Period Comparison ─────────────────────────────────────────────────────

export type Ra3Trend = 'Growing' | 'Stable' | 'Declining' | 'New' | 'Lost';

export interface Ra3Row {
  wineCode: string;
  wineName: string;
  importer: string;
  currentPeriodRevenue: number;
  priorPeriodRevenue: number;
  changePct: number;        // ((current - prior) / prior) * 100, or Infinity if prior=0
  trend: Ra3Trend;
}

export interface Ra3Data {
  rows: Ra3Row[];
  currentPeriodLabel: string;  // e.g. "Jan 2025 – Dec 2025"
  priorPeriodLabel: string;    // e.g. "Jan 2024 – Dec 2024"
  rowCount: number;
  parsedAt: string;
}
