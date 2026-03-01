'use client';

import { useRef, useState } from 'react';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import { parseRc5 } from '@/lib/parsers/rc5Parser';
import { parseRa25 } from '@/lib/parsers/ra25Parser';
import { parseRa23 } from '@/lib/parsers/ra23Parser';
import { parseRa21 } from '@/lib/parsers/ra21Parser';
import { parseRa27 } from '@/lib/parsers/ra27Parser';
import { parseRb6Rep } from '@/lib/parsers/rb6RepParser';
import { parseProducers } from '@/lib/parsers/producersParser';
import { parseWineProperties } from '@/lib/parsers/winePropertiesParser';
import { parsePricingDetailed } from '@/lib/parsers/pricingParser';
import { parseAllocations } from '@/lib/parsers/allocationsParser';
import { parseOpenPOs } from '@/lib/parsers/openPOParser';
import { parseRb1 } from '@/lib/parsers/rb1Parser';
import { parseRa30 } from '@/lib/parsers/ra30Parser';
import { parseRc3 } from '@/lib/parsers/rc3Parser';
import { parseRa3 } from '@/lib/parsers/ra3Parser';
import { UploadKey, UploadMeta } from '@/types';
import { Upload, CheckCircle, AlertCircle, Loader, ChevronDown, ChevronRight } from 'lucide-react';

type ZoneStatus = 'idle' | 'loading' | 'success' | 'error';

interface ZoneDebug {
  detectedCodeCol?: string;
  detectedPriceCol?: string;
  detectedInvCol?: string;
  sampleCodes?: string[];
  samplePrices?: number[];
  allHeaders?: string[];
}

interface ZoneState {
  status: ZoneStatus;
  message: string;
  rowCount?: number;
  debug?: ZoneDebug;
}

const PRIMARY_ZONES: { key: UploadKey; label: string; hint: string; accept: string }[] = [
  { key: 'rc5',  label: 'RC5 — Territory Revenue',        hint: '13 monthly revenue columns per account', accept: '.xlsx,.xls' },
  { key: 'ra23', label: 'RA23 — Account + Wine Detail',   hint: 'Account × Wine × Revenue rows (replaces RA25 for wine detail)', accept: '.xlsx,.xls' },
  { key: 'ra21', label: 'RA21 — Top Wines Sold',          hint: 'Ranked wine performance list', accept: '.xlsx,.xls' },
  { key: 'ra27', label: 'RA27 — Points of Distribution',  hint: 'Account count per wine code', accept: '.xlsx,.xls' },
  { key: 'rb6',  label: 'RB6 — Velocity + Inventory',     hint: 'On-hand bottles, avg monthly velocity', accept: '.xlsx,.xls' },
  { key: 'ra30', label: 'RA30 — New Placements',          hint: 'First placement date per account × wine', accept: '.xlsx,.xls' },
  { key: 'rc3',  label: 'RC3 — Unloved Accounts',         hint: 'Inactive accounts with days-since-order', accept: '.xlsx,.xls' },
  { key: 'ra3',  label: 'RA3 — Period Comparison',        hint: 'Current vs prior period revenue per wine', accept: '.xlsx,.xls' },
];

const REFERENCE_ZONES: { key: UploadKey; label: string; hint: string; accept: string }[] = [
  { key: 'wineProperties', label: 'Wine Properties',             hint: 'Wine Code, Name, Producer, Country, Type', accept: '.csv,.xlsx,.xls' },
  { key: 'pricing',        label: 'Pricing',                     hint: 'Wine Code, Default Price, FOB Price',       accept: '.xlsx,.xls' },
  { key: 'inventory',      label: 'RB1 — Inventory by Supplier', hint: 'Wine Code, Available (bottles)',            accept: '.xlsx,.xls' },
  { key: 'allocations',    label: 'Allocations',                 hint: 'Wine Code, Account, Allocated Cases',       accept: '.xlsx,.xls' },
  { key: 'openPO',         label: 'Open Purchase Orders',        hint: 'Wine Code, Cases, Expected Arrival',        accept: '.xlsx,.xls' },
  { key: 'producers',      label: 'Producers',                   hint: 'Producers sheet',                           accept: '.xlsx,.xls' },
];

const LEGACY_ZONES: { key: UploadKey; label: string; hint: string; accept: string }[] = [
  { key: 'ra25', label: 'RA25 — Account Summary (Legacy)', hint: 'Importer totals only — no wine line items. Use RA23 for wine detail.', accept: '.xlsx,.xls' },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

export default function UploadPage() {
  const store = useStore();
  const [zones, setZones] = useState<Partial<Record<UploadKey, ZoneState>>>({});

  function setZone(key: UploadKey, state: ZoneState) {
    setZones((z) => ({ ...z, [key]: state }));
  }

  async function handleFile(key: UploadKey, file: File) {
    setZone(key, { status: 'loading', message: 'Parsing…' });
    try {
      let rowCount = 0;
      const meta: UploadMeta = { filename: file.name, date: new Date().toISOString(), rowCount: 0 };

      if (key === 'rc5') {
        const r = await parseRc5(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setRc5Data(r.data, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
      } else if (key === 'ra23') {
        const r = await parseRa23(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setRa23Data(r.data, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
        setZone(key, {
          status: 'success',
          message: `${rowCount.toLocaleString()} rows loaded`,
          rowCount,
          debug: { detectedCodeCol: r.detectedCodeCol, allHeaders: r.allHeaders },
        });
        return;
      } else if (key === 'ra21') {
        const r = await parseRa21(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setRa21Data(r.data, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
      } else if (key === 'ra27') {
        const r = await parseRa27(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setRa27Data(r.data, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
      } else if (key === 'rb6') {
        const r = await parseRb6Rep(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setRb6RepData(r.data, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
        setZone(key, {
          status: 'success',
          message: `${rowCount.toLocaleString()} rows loaded`,
          rowCount,
          debug: { detectedCodeCol: r.detectedCodeCol, detectedInvCol: r.detectedInvCol, allHeaders: r.allHeaders },
        });
        return;
      } else if (key === 'ra30') {
        const r = await parseRa30(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setRa30Data(r.data, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
      } else if (key === 'rc3') {
        const r = await parseRc3(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setRc3Data(r.data, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
      } else if (key === 'ra3') {
        const r = await parseRa3(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setRa3Data(r.data, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
      } else if (key === 'ra25') {
        const r = await parseRa25(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setRa25Data(r.data, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
        setZone(key, {
          status: 'success',
          message: `${rowCount.toLocaleString()} rows loaded · no wine detail`,
          rowCount,
          debug: { allHeaders: r.allHeaders },
        });
        return;
      } else if (key === 'producers') {
        const r = await parseProducers(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setProducersData(r.data, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
      } else if (key === 'wineProperties') {
        const r = await parseWineProperties(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setWinePropertiesData(r.rows, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
        setZone(key, {
          status: 'success',
          message: `${rowCount.toLocaleString()} rows loaded`,
          rowCount,
          debug: { detectedCodeCol: r.detectedCodeCol, sampleCodes: r.sampleCodes },
        });
        return;
      } else if (key === 'pricing') {
        const r = await parsePricingDetailed(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0] + ` (cols: ${r.detectedCodeCol} / ${r.detectedPriceCol})`);
        store.setPricingData(r.rows, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
        setZone(key, {
          status: 'success',
          message: `${rowCount.toLocaleString()} rows loaded`,
          rowCount,
          debug: { detectedCodeCol: r.detectedCodeCol, detectedPriceCol: r.detectedPriceCol, sampleCodes: r.sampleCodes, samplePrices: r.samplePrices, allHeaders: r.allHeaders },
        });
        return;
      } else if (key === 'inventory') {
        const r = await parseRb1(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setInventoryData(r.rows, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
        setZone(key, {
          status: 'success',
          message: `${rowCount.toLocaleString()} rows loaded`,
          rowCount,
          debug: {
            detectedCodeCol: r.detectedCodeCol,
            detectedInvCol: r.detectedCasesCol,
            detectedPriceCol: r.detectedPriceCol !== '(not found)' ? r.detectedPriceCol : undefined,
            sampleCodes: r.sampleCodes,
            allHeaders: r.allHeaders,
          },
        });
        return;
      } else if (key === 'allocations') {
        const r = await parseAllocations(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setAllocationsData(r.rows, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
      } else if (key === 'openPO') {
        const r = await parseOpenPOs(file);
        if (r.errors.length && !r.rowCount) throw new Error(r.errors[0]);
        store.setOpenPOData(r.rows, { ...meta, rowCount: r.rowCount });
        rowCount = r.rowCount;
      }

      setZone(key, { status: 'success', message: `${rowCount.toLocaleString()} rows loaded`, rowCount });
    } catch (err) {
      setZone(key, { status: 'error', message: err instanceof Error ? err.message : 'Parse failed' });
    }
  }

  function UploadZone({ zone, isLegacy }: { zone: typeof PRIMARY_ZONES[0]; isLegacy?: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showDebug, setShowDebug] = useState(false);
    const state = zones[zone.key];
    const meta = store.uploadMeta[zone.key];
    const debug = state?.debug;

    return (
      <div style={{
        borderRadius: 10, overflow: 'hidden',
        border: `2px solid ${state?.status === 'error' ? '#F85149' : state?.status === 'success' ? '#3FB950' : isLegacy ? '#3D2B00' : '#30363D'}`,
        transition: 'border-color 0.15s',
        opacity: isLegacy ? 0.8 : 1,
      }}>
        <div
          style={{ backgroundColor: isLegacy ? '#1C1610' : '#161B22', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(zone.key, f); }}
        >
          <input ref={inputRef} type="file" accept={zone.accept} style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(zone.key, f); e.target.value = ''; }} />

          <div style={{ flexShrink: 0 }}>
            {state?.status === 'loading' && <Loader size={22} color="#7D8590" style={{ animation: 'spin 1s linear infinite' }} />}
            {state?.status === 'success' && <CheckCircle size={22} color="#3FB950" />}
            {state?.status === 'error' && <AlertCircle size={22} color="#F85149" />}
            {(!state || state.status === 'idle') && <Upload size={22} color={isLegacy ? '#484F58' : '#7D8590'} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isLegacy ? '#7D8590' : '#E6EDF3' }}>{zone.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#484F58' }}>{zone.hint}</p>
          </div>

          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            {state?.status === 'loading' && <span style={{ fontSize: 12, color: '#7D8590' }}>Parsing…</span>}
            {state?.status === 'success' && <span style={{ fontSize: 12, color: '#3FB950', fontWeight: 600 }}>{state.message}</span>}
            {state?.status === 'error' && <span style={{ fontSize: 12, color: '#F85149' }}>{state.message}</span>}
            {!state && meta && <span style={{ fontSize: 12, color: '#7D8590' }}>{meta.rowCount.toLocaleString()} rows · {fmt(meta.date)}</span>}
            {!state && !meta && <span style={{ fontSize: 12, color: '#484F58' }}>No data</span>}
          </div>

          {debug && (
            <button onClick={(e) => { e.stopPropagation(); setShowDebug((x) => !x); }}
              style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', padding: 2, lineHeight: 0, flexShrink: 0 }}>
              {showDebug ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>

        {debug && showDebug && (
          <div style={{ backgroundColor: '#0D1117', borderTop: '1px solid #21262D', padding: '12px 24px', fontSize: 12, color: '#7D8590', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {debug.detectedCodeCol && (
              <div><span style={{ color: '#484F58' }}>Code col: </span><span style={{ color: '#E3B341', fontFamily: 'monospace' }}>{debug.detectedCodeCol}</span></div>
            )}
            {debug.detectedInvCol && (
              <div><span style={{ color: '#484F58' }}>Inv col: </span><span style={{ color: '#22D3A5', fontFamily: 'monospace' }}>{debug.detectedInvCol}</span></div>
            )}
            {debug.detectedPriceCol && (
              <div><span style={{ color: '#484F58' }}>Price col: </span><span style={{ color: '#3FB950', fontFamily: 'monospace' }}>{debug.detectedPriceCol}</span></div>
            )}
            {debug.sampleCodes && debug.sampleCodes.length > 0 && (
              <div><span style={{ color: '#484F58' }}>Sample codes: </span><span style={{ color: '#79BAFF', fontFamily: 'monospace' }}>{debug.sampleCodes.join(', ')}</span></div>
            )}
            {debug.samplePrices && debug.samplePrices.length > 0 && (() => {
              const nonZero = debug.samplePrices.filter(p => p > 0);
              const avg = nonZero.length > 0 ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
              const allZero = debug.samplePrices.every(p => p === 0);
              const tooLow = !allZero && avg < 10;
              return (
                <div>
                  <span style={{ color: '#484F58' }}>Sample prices: </span>
                  <span style={{ color: allZero ? '#F85149' : tooLow ? '#E3B341' : '#3FB950', fontFamily: 'monospace' }}>
                    {debug.samplePrices.map(p => p > 0 ? `$${p.toFixed(2)}` : '0').join(', ')}
                    {allZero && ' ← all zero! wrong price column'}
                    {tooLow && ` ← avg $${avg.toFixed(2)} — may be FOB/cost`}
                  </span>
                </div>
              );
            })()}
            {debug.allHeaders && debug.allHeaders.length > 0 && (
              <div style={{ marginTop: 2 }}>
                <span style={{ color: '#484F58' }}>All columns: </span>
                <span style={{ fontFamily: 'monospace' }}>
                  {debug.allHeaders.map((h, i) => (
                    <span key={i} style={{ color: h === debug.detectedPriceCol ? '#3FB950' : h === debug.detectedInvCol ? '#22D3A5' : h === debug.detectedCodeCol ? '#E3B341' : '#484F58' }}>
                      {h}{i < (debug.allHeaders?.length ?? 0) - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </div>
            )}
            {zone.key === 'pricing' && debug.sampleCodes && store.winePropertiesData && (() => {
              const wCodes = new Set(store.winePropertiesData.map(w => w.wineCode.trim().toUpperCase()));
              const pCodes = (store.pricingData ?? []).map(p => p.wineCode.trim().toUpperCase());
              const matches = pCodes.filter(c => wCodes.has(c)).length;
              const matchColor = matches === 0 ? '#F85149' : matches < pCodes.length * 0.5 ? '#E3B341' : '#3FB950';
              return (
                <div style={{ marginTop: 4, paddingTop: 6, borderTop: '1px solid #21262D' }}>
                  <span style={{ color: '#484F58' }}>Join check: </span>
                  <span style={{ color: matchColor, fontWeight: 600 }}>
                    {matches}/{pCodes.length} pricing codes match wine properties
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  return (
    <Shell>
      <div style={{ maxWidth: 700 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: '0 0 4px' }}>Upload Data</h1>
        <p style={{ fontSize: 14, color: '#7D8590', margin: '0 0 28px' }}>
          Drop or click each zone to load a dataset. Use <a href="/integrations" style={{ color: '#3FB950', textDecoration: 'none' }}>Integrations</a> for automatic sync.
        </p>

        {/* Primary reports */}
        <h2 style={{ fontSize: 11, fontWeight: 700, color: '#7D8590', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          Primary Reports
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {PRIMARY_ZONES.map((zone) => <UploadZone key={zone.key} zone={zone} />)}
        </div>

        {/* Reference data */}
        <h2 style={{ fontSize: 11, fontWeight: 700, color: '#7D8590', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          Reference Data
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {REFERENCE_ZONES.map((zone) => <UploadZone key={zone.key} zone={zone} />)}
        </div>

        {/* Legacy */}
        <h2 style={{ fontSize: 11, fontWeight: 700, color: '#484F58', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          Legacy / Reference
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LEGACY_ZONES.map((zone) => <UploadZone key={zone.key} zone={zone} isLegacy />)}
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </Shell>
  );
}
