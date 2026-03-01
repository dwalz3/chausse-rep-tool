// ── Identity & Auth ────────────────────────────────────────────────────────────

export type RepIdentity = 'austin' | 'jason' | 'dave' | 'alejandra';

export interface RepSession {
  rep: RepIdentity;
}

export interface SalesGoal {
  rep: RepIdentity;
  yearMonth: string;       // 'YYYY-MM'
  manualTarget?: number;   // manual override
  autoTarget: number;      // computed from same-month LY × multiplier
}

// ── RC5 — Account Monthly Sales (Territory module) ─────────────────────────────

export interface Rc5Row {
  account: string;
  accountCode: string;
  salesRep: string;           // raw string e.g. "Austin", "Jason"
  primaryRep: 'austin' | 'jason' | 'dave' | 'alejandra' | 'shared' | 'unknown'; // derived
  region: string;
  accountType: string;        // Restaurant, Bar, Wine Shop, Retail, etc.
  totalRevenue: number;
  monthlyRevenue: number[];   // length 13, index 0 = Dec 2024, index 12 = Dec 2025
  monthLabels: string[];      // ['2024-12', '2025-01', ..., '2025-12']
  activeMonths: number;       // count of months with revenue > 0
  lastActiveMonth: string | null;
  isDormant: boolean;
  isNew: boolean;
}

export interface Rc5Data {
  rows: Rc5Row[];
  monthLabels: string[];
  totalRevenue: number;
  parsedAt: string;
}

// ── RA25 — Account Summary ──────────────────────────────────────────────────────

export interface Ra25Row {
  account: string;
  importer: string;
  salesRep: string;
  totalQty: number;
  totalRevenue: number;
  wineName?: string;   // wine/item name if available in source file
  wineCode?: string;   // wine/item code if available in source file
}

export interface Ra25AccountSummary {
  account: string;
  totalRevenue: number;
  totalQty: number;
  importers: string[];
  primaryRep: string;
  revenueShare: number;
  cumulativeShare: number;
}

// Wine-level aggregation across all accounts
export interface Ra25WineRow {
  wineCode: string;    // normalized UPPERCASE or wineName key if no code
  wineName: string;
  importer: string;
  revenue: number;
  casesSold: number;
  accountCount: number;
}

export interface Ra25Data {
  rows: Ra25Row[];
  accountTotals: Ra25AccountSummary[];
  wineTotals: Ra25WineRow[];
  parsedAt: string;
}

// ── Producers ──────────────────────────────────────────────────────────────────

export interface ProducerRow {
  recordId: number;
  name: string;
  region: string;
  country: string;
  about: string;
  farmingPractices: string[];
  importer: string;
  marketJurisdictions: string[];
  fdaNumber: string;
  isDirectImport: boolean;
}

export interface ProducersData {
  producers: ProducerRow[];
  byCountry: { country: string; count: number; importers: { importer: string; count: number }[] }[];
  byImporter: { importer: string; count: number; isDirectImport: boolean }[];
  byFarming: { practice: string; count: number }[];
  parsedAt: string;
}

// ── Wine Properties ────────────────────────────────────────────────────────────

export type WineType =
  | 'Red'
  | 'White'
  | 'Rosé'
  | 'Sparkling'
  | 'Orange'
  | 'Vermouth'
  | 'Tea/NA'
  | 'Other';

export interface WinePropertyRow {
  wineCode: string;
  name: string;          // full raw name
  wineName: string;      // parsed wine name component
  producer: string;
  importer: string;
  country: string;
  region: string;
  wineType: WineType;
  vintage: string;
  varietal: string;
  caseSize: string;
  bottleSize: string;
  isNatural: boolean;
  isBiodynamic: boolean;
  isDirect: boolean;
  casesPerPallet: number;
}

// ── Pricing ────────────────────────────────────────────────────────────────────

export interface PricingRow {
  wineCode: string;
  defaultPrice: number;  // bottle price
  fobPrice: number;
}

// ── Allocations ────────────────────────────────────────────────────────────────

export interface AllocationRow {
  wineCode: string;
  account: string;
  allocatedCases: number;
  deadline?: string;
}

// ── RB1 — Inventory by Supplier ────────────────────────────────────────────────

export interface InventoryRow {
  wineCode: string;
  wineName: string;
  supplier: string;
  casesOnHand: number;    // full cases in warehouse
  bottlesOnHand: number;  // loose bottles (not making a full case)
}

// ── Open Purchase Orders ───────────────────────────────────────────────────────

export interface OpenPORow {
  wineCode: string;
  producer: string;
  openCases: number;
  expectedArrival: Date | null;
}

// ── Portfolio row (joined) ─────────────────────────────────────────────────────

export interface PortfolioRow {
  wineCode: string;
  name: string;
  wineName: string;
  producer: string;
  importer: string;
  country: string;
  region: string;
  wineType: WineType;
  vintage: string;
  varietal: string;
  caseSize: string;
  bottleSize: string;
  isNatural: boolean;
  isBiodynamic: boolean;
  isDirect: boolean;
  bottlePrice: number;
  fobPrice: number;
  inventoryCases: number;   // from RB1 — actual cases in warehouse
  inventoryBottles: number; // from RB1 — loose bottles
  allocatedCases: number;
  openPOCases: number;
  expectedArrival: Date | null;
  stockCases: number;
  accountCount: number;
}

// ── Upload meta ────────────────────────────────────────────────────────────────

export type UploadKey =
  | 'rc5'
  | 'ra25'
  | 'wineProperties'
  | 'pricing'
  | 'inventory'
  | 'allocations'
  | 'openPO'
  | 'producers';

export interface UploadMeta {
  filename: string;
  date: string;    // ISO
  rowCount: number;
}
