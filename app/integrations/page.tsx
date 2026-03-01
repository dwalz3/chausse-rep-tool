'use client';

import { useState, useRef } from 'react';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import { parseRc5 } from '@/lib/parsers/rc5Parser';
import { parseRa23 } from '@/lib/parsers/ra23Parser';
import { parseRa21 } from '@/lib/parsers/ra21Parser';
import { parseRa27 } from '@/lib/parsers/ra27Parser';
import { parseRb6Rep } from '@/lib/parsers/rb6RepParser';
import { parseWineProperties } from '@/lib/parsers/winePropertiesParser';
import { parseRa30 } from '@/lib/parsers/ra30Parser';
import { parseRc3 } from '@/lib/parsers/rc3Parser';
import { parseRa3 } from '@/lib/parsers/ra3Parser';
import { RepSyncKey } from '@/types/integrations';
import { UploadMeta } from '@/types';
import {
  RefreshCw, CheckCircle, AlertCircle, Loader, Upload, Clock, Zap,
} from 'lucide-react';

interface CardConfig {
  key: RepSyncKey;
  label: string;
  description: string;
  frequency: string;
  isCore: boolean;       // core = shown in DataStatus widget
  badge?: string;        // optional amber badge text
  badgeColor?: string;
}

const CARDS: CardConfig[] = [
  { key: 'rc5',            label: 'RC5 — Territory Revenue', description: '13-month account-level revenue by rep. Powers Dashboard, Accounts, and Dormant.', frequency: 'Weekly', isCore: true },
  { key: 'ra23',           label: 'RA23 — Account + Wine Detail', description: 'Row-level account × wine × revenue. Powers Focus, Account Detail top wines, and Territory Map.', frequency: 'Weekly', isCore: true, badge: 'Unlocks Focus', badgeColor: '#E3B341' },
  { key: 'ra21',           label: 'RA21 — Top Wines Sold', description: 'Ranked wine performance list. Powers Focus "Push These" and Dashboard top wine card.', frequency: 'Weekly', isCore: true },
  { key: 'ra27',           label: 'RA27 — Points of Distribution', description: 'Account count per wine. Powers Portfolio "Accounts" column.', frequency: 'Monthly', isCore: true },
  { key: 'rb6',            label: 'RB6 — Velocity + Inventory', description: 'On-hand bottles and avg monthly velocity. Powers Portfolio inventory warnings.', frequency: 'Weekly', isCore: true },
  { key: 'wineProperties', label: 'Wine Properties', description: 'Wine code, name, producer, type, country, varietal, pricing. Master reference data.', frequency: 'Monthly', isCore: false },
  { key: 'ra30',           label: 'RA30 — New Placements', description: 'When wines were first placed at accounts. Powers Focus "New Placements" section.', frequency: 'Weekly', isCore: false },
  { key: 'rc3',            label: 'RC3 — Unloved Accounts', description: 'Accounts inactive beyond threshold. Adds priority overlay to Dormant page.', frequency: 'Weekly', isCore: false },
  { key: 'ra3',            label: 'RA3 — Period Comparison', description: 'Current vs prior period wine revenue. Powers Focus "Watch List" declining SKUs.', frequency: 'Monthly', isCore: false },
];

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

interface CardState {
  syncState: SyncState;
  message: string;
  rowCount?: number;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function staleness(iso: string): { label: string; color: string } {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return { label: 'Today', color: '#3FB950' };
  if (days <= 3) return { label: `${days}d ago`, color: '#3FB950' };
  if (days <= 7) return { label: `${days}d ago`, color: '#E3B341' };
  return { label: `${days}d ago — stale`, color: '#F85149' };
}

export default function IntegrationsPage() {
  const store = useStore();
  const [cardStates, setCardStates] = useState<Partial<Record<RepSyncKey, CardState>>>({});

  function setCard(key: RepSyncKey, state: CardState) {
    setCardStates((prev) => ({ ...prev, [key]: state }));
  }

  async function handleSync(key: RepSyncKey) {
    setCard(key, { syncState: 'syncing', message: 'Fetching from Vinosmith…' });
    try {
      const res = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const json = await res.json() as { ok: boolean; base64?: string; filename?: string; error?: string };
      if (!json.ok || !json.base64) {
        throw new Error(json.error ?? 'Sync failed');
      }
      // Decode base64 to ArrayBuffer, create a fake File, parse it
      const bytes = Uint8Array.from(atob(json.base64), (c) => c.charCodeAt(0));
      const file = new File([bytes], json.filename ?? `${key}.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      await parseAndStore(key, file);
    } catch (err) {
      setCard(key, { syncState: 'error', message: err instanceof Error ? err.message : 'Sync failed' });
    }
  }

  // Shared file-upload fallback
  const fileInputRefs = useRef<Partial<Record<RepSyncKey, HTMLInputElement | null>>>({});

  async function parseAndStore(key: RepSyncKey, file: File) {
    const meta: UploadMeta = { filename: file.name, date: new Date().toISOString(), rowCount: 0 };

    if (key === 'rc5') {
      const r = await parseRc5(file);
      if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
      store.setRc5Data(r.data, { ...meta, rowCount: r.rowCount });
      setCard(key, { syncState: 'success', message: `${r.rowCount.toLocaleString()} rows`, rowCount: r.rowCount });
    } else if (key === 'ra23') {
      const r = await parseRa23(file);
      if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
      store.setRa23Data(r.data, { ...meta, rowCount: r.rowCount });
      setCard(key, { syncState: 'success', message: `${r.rowCount.toLocaleString()} rows`, rowCount: r.rowCount });
    } else if (key === 'ra21') {
      const r = await parseRa21(file);
      if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
      store.setRa21Data(r.data, { ...meta, rowCount: r.rowCount });
      setCard(key, { syncState: 'success', message: `${r.rowCount.toLocaleString()} rows`, rowCount: r.rowCount });
    } else if (key === 'ra27') {
      const r = await parseRa27(file);
      if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
      store.setRa27Data(r.data, { ...meta, rowCount: r.rowCount });
      setCard(key, { syncState: 'success', message: `${r.rowCount.toLocaleString()} rows`, rowCount: r.rowCount });
    } else if (key === 'rb6') {
      const r = await parseRb6Rep(file);
      if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
      store.setRb6RepData(r.data, { ...meta, rowCount: r.rowCount });
      setCard(key, { syncState: 'success', message: `${r.rowCount.toLocaleString()} rows`, rowCount: r.rowCount });
    } else if (key === 'wineProperties') {
      const r = await parseWineProperties(file);
      if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
      store.setWinePropertiesData(r.rows, { ...meta, rowCount: r.rowCount });
      setCard(key, { syncState: 'success', message: `${r.rowCount.toLocaleString()} rows`, rowCount: r.rowCount });
    } else if (key === 'ra30') {
      const r = await parseRa30(file);
      if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
      store.setRa30Data(r.data, { ...meta, rowCount: r.rowCount });
      setCard(key, { syncState: 'success', message: `${r.rowCount.toLocaleString()} rows`, rowCount: r.rowCount });
    } else if (key === 'rc3') {
      const r = await parseRc3(file);
      if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
      store.setRc3Data(r.data, { ...meta, rowCount: r.rowCount });
      setCard(key, { syncState: 'success', message: `${r.rowCount.toLocaleString()} rows`, rowCount: r.rowCount });
    } else if (key === 'ra3') {
      const r = await parseRa3(file);
      if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
      store.setRa3Data(r.data, { ...meta, rowCount: r.rowCount });
      setCard(key, { syncState: 'success', message: `${r.rowCount.toLocaleString()} rows`, rowCount: r.rowCount });
    }
  }

  function IntegrationCard({ card }: { card: CardConfig }) {
    const state = cardStates[card.key];
    const meta = store.uploadMeta[card.key];
    const isSyncing = state?.syncState === 'syncing';

    return (
      <div style={{
        backgroundColor: '#161B22',
        border: `1px solid ${state?.syncState === 'error' ? '#F85149' : state?.syncState === 'success' ? '#3FB950' : '#30363D'}`,
        borderRadius: 10,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#E6EDF3' }}>{card.label}</span>
              {card.badge && (
                <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#2D2000', color: card.badgeColor ?? '#E3B341', borderRadius: 4, padding: '2px 6px' }}>
                  {card.badge}
                </span>
              )}
              <span style={{ fontSize: 10, color: '#484F58', backgroundColor: '#21262D', borderRadius: 4, padding: '2px 6px' }}>
                {card.frequency}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7D8590', lineHeight: 1.5 }}>{card.description}</p>
          </div>
          {/* Status indicator */}
          <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 80 }}>
            {state?.syncState === 'success' && <CheckCircle size={16} color="#3FB950" />}
            {state?.syncState === 'error' && <AlertCircle size={16} color="#F85149" />}
            {state?.syncState === 'syncing' && (
              <Loader size={16} color="#7D8590" style={{ animation: 'spin 1s linear infinite' }} />
            )}
          </div>
        </div>

        {/* Last sync info */}
        {meta && !state && (
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#7D8590', alignItems: 'center' }}>
            <Clock size={12} />
            <span>{meta.rowCount.toLocaleString()} rows</span>
            <span>·</span>
            <span style={{ color: staleness(meta.date).color }}>{staleness(meta.date).label}</span>
            <span>·</span>
            <span>{fmt(meta.date)}</span>
          </div>
        )}
        {state?.syncState === 'success' && (
          <div style={{ fontSize: 12, color: '#3FB950' }}>{state.message} loaded</div>
        )}
        {state?.syncState === 'error' && (
          <div style={{ fontSize: 12, color: '#F85149' }}>{state.message}</div>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <button
            disabled={isSyncing}
            onClick={() => handleSync(card.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: isSyncing ? '#21262D' : '#1A3A2A',
              color: isSyncing ? '#484F58' : '#3FB950',
              border: `1px solid ${isSyncing ? '#30363D' : '#2D6B40'}`,
              borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: isSyncing ? 'not-allowed' : 'pointer',
            }}
          >
            {isSyncing ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
            Sync Now
          </button>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 6,
            backgroundColor: 'transparent',
            color: '#7D8590',
            border: '1px solid #30363D',
            borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>
            <Upload size={13} />
            Upload file
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              ref={(el) => { fileInputRefs.current[card.key] = el; }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setCard(card.key, { syncState: 'syncing', message: 'Parsing…' });
                try {
                  await parseAndStore(card.key, file);
                } catch (err) {
                  setCard(card.key, { syncState: 'error', message: err instanceof Error ? err.message : 'Parse failed' });
                }
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>
    );
  }

  const coreCards = CARDS.filter((c) => c.isCore);
  const supportingCards = CARDS.filter((c) => !c.isCore);

  return (
    <Shell>
      <div style={{ maxWidth: 900 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: '0 0 4px' }}>
          Integrations
        </h1>
        <p style={{ fontSize: 14, color: '#7D8590', margin: '0 0 28px' }}>
          Connect Vinosmith reports to keep your data current. Use &ldquo;Sync Now&rdquo; for automatic fetch or &ldquo;Upload file&rdquo; as a manual fallback.
        </p>

        {/* Core reports */}
        <h2 style={{ fontSize: 12, fontWeight: 700, color: '#7D8590', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
          Core Reports (5 / 5 needed)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12, marginBottom: 28 }}>
          {coreCards.map((c) => <IntegrationCard key={c.key} card={c} />)}
        </div>

        {/* Supporting reports */}
        <h2 style={{ fontSize: 12, fontWeight: 700, color: '#7D8590', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
          Supporting Reports
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
          {supportingCards.map((c) => <IntegrationCard key={c.key} card={c} />)}
        </div>

        {/* RA25 legacy notice */}
        <div style={{ marginTop: 28, padding: '14px 18px', backgroundColor: '#1C1610', border: '1px solid #3D2B00', borderRadius: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={15} color="#E3B341" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#E3B341' }}>RA25 — Legacy / Reference Only</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7D8590', lineHeight: 1.5 }}>
                RA25 contains importer totals only (no wine line items). Use the Upload page for RA25 reference data.
                All wine-level analytics now use RA23.
              </p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </Shell>
  );
}
