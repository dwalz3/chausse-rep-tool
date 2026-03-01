// ── Integrations — Vinosmith sync endpoints ────────────────────────────────────

export type RepSyncKey =
  | 'rc5'
  | 'ra23'
  | 'ra21'
  | 'ra27'
  | 'rb6'
  | 'wineProperties'
  | 'ra30'
  | 'rc3'
  | 'ra3';

export interface RepSyncEntry {
  key: RepSyncKey;
  lastSyncedAt: string | null;   // ISO datetime
  rowCount: number | null;
  error: string | null;
  isSyncing: boolean;
}

export type RepSyncStatus = Partial<Record<RepSyncKey, RepSyncEntry>>;
