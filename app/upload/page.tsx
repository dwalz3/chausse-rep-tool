'use client';

import { useRef, useState } from 'react';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';
import { parseRc5 } from '@/lib/parsers/rc5Parser';
import { parseRa25 } from '@/lib/parsers/ra25Parser';
import { parseProducers } from '@/lib/parsers/producersParser';
import { parseWineProperties } from '@/lib/parsers/winePropertiesParser';
import { parsePricingDetailed } from '@/lib/parsers/pricingParser';
import { parseAllocations } from '@/lib/parsers/allocationsParser';
import { parseOpenPOs } from '@/lib/parsers/openPOParser';
import { parseRb1 } from '@/lib/parsers/rb1Parser';
import { UploadKey, UploadMeta } from '@/types';
import { Upload, CheckCircle, AlertCircle, Loader, ChevronDown, ChevronRight } from 'lucide-react';

type ZoneStatus = 'idle' | 'loading' | 'success' | 'error';

interface ZoneDebug {
  detectedCodeCol?: string;
  detectedPriceCol?: string;
  detectedInvCol?: string;   // inventory zone: shows "Inv col:" instead of "Price col:"
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

const ZONES: { key: UploadKey; label: string; hint: string; accept: string }[] = [
  { key: 'rc5',           label: 'RC5 — Territory Revenue',     hint: 'Sales sheet, 13 monthly columns', accept: '.xlsx,.xls' },
  { key: 'ra25',          label: 'RA25 — Account Summary',      hint: 'Accounts sheet',                  accept: '.xlsx,.xls' },
  { key: 'wineProperties',label: 'Wine Properties',             hint: 'CSV or XLSX — Wine Code, Name, Producer, Country, Type', accept: '.csv,.xlsx,.xls' },
  { key: 'pricing',       label: 'Pricing',                     hint: 'Wine Code, Default Price, FOB Price', accept: '.xlsx,.xls' },
  { key: 'inventory',     label: 'RB1 — Inventory by Supplier', hint: 'Wine Code, Available (bottles), Default Price, FOB Price', accept: '.xlsx,.xls' },
  { key: 'allocations',   label: 'Allocations',                 hint: 'Wine Code, Account, Allocated Cases', accept: '.xlsx,.xls' },
  { key: 'openPO',        label: 'Open Purchase Orders',        hint: 'Wine Code, Cases, Expected Arrival',  accept: '.xlsx,.xls' },
  { key: 'producers',     label: 'Producers',                   hint: 'Producers sheet (Upload Type = producers)', accept: '.xlsx,.xls' },
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
      const meta: UploadMeta = {
        filename: file.name,
        date: new Date().toISOString(),
        rowCount: 0,
      };

      if (key === 'rc5') {
        const result = await parseRc5(file);
        if (result.errors.length && !result.rowCount) throw new Error(result.errors[0]);
        store.setRc5Data(result.data, { ...meta, rowCount: result.rowCount });
        rowCount = result.rowCount;
      } else if (key === 'ra25') {
        const result = await parseRa25(file);
        if (result.errors.length && !result.rowCount) throw new Error(result.errors[0]);
        store.setRa25Data(result.data, { ...meta, rowCount: result.rowCount });
        rowCount = result.rowCount;
        setZone(key, {
          status: result.hasWineDetail ? 'success' : 'success',
          message: `${rowCount.toLocaleString()} rows loaded${result.hasWineDetail ? '' : ' · no wine detail'}`,
          rowCount,
          debug: {
            detectedCodeCol: result.detectedWineCodeCol !== '(not found)' ? result.detectedWineCodeCol : undefined,
            detectedInvCol: result.detectedWineNameCol !== '(not found)' ? result.detectedWineNameCol : undefined,
            allHeaders: result.allHeaders,
          },
        });
        return;
      } else if (key === 'producers') {
        const result = await parseProducers(file);
        if (result.errors.length && !result.rowCount) throw new Error(result.errors[0]);
        store.setProducersData(result.data, { ...meta, rowCount: result.rowCount });
        rowCount = result.rowCount;
      } else if (key === 'wineProperties') {
        const result = await parseWineProperties(file);
        if (result.errors.length && !result.rowCount) throw new Error(result.errors[0]);
        store.setWinePropertiesData(result.rows, { ...meta, rowCount: result.rowCount });
        rowCount = result.rowCount;
        setZone(key, {
          status: 'success',
          message: `${rowCount.toLocaleString()} rows loaded`,
          rowCount,
          debug: { detectedCodeCol: result.detectedCodeCol, sampleCodes: result.sampleCodes },
        });
        return;
      } else if (key === 'pricing') {
        const result = await parsePricingDetailed(file);
        if (result.errors.length && !result.rowCount) throw new Error(result.errors[0] + ` (detected cols: ${result.detectedCodeCol} / ${result.detectedPriceCol})`);
        store.setPricingData(result.rows, { ...meta, rowCount: result.rowCount });
        rowCount = result.rowCount;
        setZone(key, {
          status: 'success',
          message: `${rowCount.toLocaleString()} rows loaded`,
          rowCount,
          debug: { detectedCodeCol: result.detectedCodeCol, detectedPriceCol: result.detectedPriceCol, sampleCodes: result.sampleCodes, samplePrices: result.samplePrices, allHeaders: result.allHeaders },
        });
        return;
      } else if (key === 'inventory') {
        const result = await parseRb1(file);
        if (result.errors.length && !result.rowCount) throw new Error(result.errors[0]);
        store.setInventoryData(result.rows, { ...meta, rowCount: result.rowCount });
        rowCount = result.rowCount;
        setZone(key, {
          status: 'success',
          message: `${rowCount.toLocaleString()} rows loaded`,
          rowCount,
          debug: {
            detectedCodeCol: result.detectedCodeCol,
            detectedInvCol: result.detectedCasesCol,
            detectedPriceCol: result.detectedPriceCol !== '(not found)' ? result.detectedPriceCol : undefined,
            sampleCodes: result.sampleCodes,
            allHeaders: result.allHeaders,
          },
        });
        return;
      } else if (key === 'allocations') {
        const result = await parseAllocations(file);
        if (result.errors.length && !result.rowCount) throw new Error(result.errors[0]);
        store.setAllocationsData(result.rows, { ...meta, rowCount: result.rowCount });
        rowCount = result.rowCount;
      } else if (key === 'openPO') {
        const result = await parseOpenPOs(file);
        if (result.errors.length && !result.rowCount) throw new Error(result.errors[0]);
        store.setOpenPOData(result.rows, { ...meta, rowCount: result.rowCount });
        rowCount = result.rowCount;
      }

      setZone(key, { status: 'success', message: `${rowCount.toLocaleString()} rows loaded`, rowCount });
    } catch (err) {
      setZone(key, { status: 'error', message: err instanceof Error ? err.message : 'Parse failed' });
    }
  }

  function UploadZone({ zone }: { zone: typeof ZONES[0] }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showDebug, setShowDebug] = useState(false);
    const state = zones[zone.key];
    const meta = store.uploadMeta[zone.key];
    const debug = state?.debug;

    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid ${state?.status === 'error' ? '#F85149' : state?.status === 'success' ? '#3FB950' : '#30363D'}`, transition: 'border-color 0.15s' }}>
        <div
          style={{
            backgroundColor: '#161B22',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            cursor: 'pointer',
          }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(zone.key, file);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={zone.accept}
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(zone.key, file);
              e.target.value = '';
            }}
          />

          {/* Icon */}
          <div style={{ flexShrink: 0 }}>
            {state?.status === 'loading' && <Loader size={22} color="#7D8590" style={{ animation: 'spin 1s linear infinite' }} />}
            {state?.status === 'success' && <CheckCircle size={22} color="#3FB950" />}
            {state?.status === 'error' && <AlertCircle size={22} color="#F85149" />}
            {(!state || state.status === 'idle') && <Upload size={22} color="#7D8590" />}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#E6EDF3' }}>{zone.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7D8590' }}>{zone.hint}</p>
          </div>

          {/* Status */}
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            {state?.status === 'loading' && (
              <span style={{ fontSize: 12, color: '#7D8590' }}>Parsing…</span>
            )}
            {state?.status === 'success' && (
              <span style={{ fontSize: 12, color: '#3FB950', fontWeight: 600 }}>{state.message}</span>
            )}
            {state?.status === 'error' && (
              <span style={{ fontSize: 12, color: '#F85149' }}>{state.message}</span>
            )}
            {!state && meta && (
              <span style={{ fontSize: 12, color: '#7D8590' }}>
                {meta.rowCount.toLocaleString()} rows · {fmt(meta.date)}
              </span>
            )}
            {!state && !meta && (
              <span style={{ fontSize: 12, color: '#7D8590' }}>No data</span>
            )}
          </div>

          {/* Debug toggle — only shows after a fresh parse with debug info */}
          {debug && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDebug((x) => !x); }}
              style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', padding: 2, lineHeight: 0, flexShrink: 0 }}
              title="Show parse details"
            >
              {showDebug ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>

        {/* Debug panel */}
        {debug && showDebug && (
          <div style={{ backgroundColor: '#0D1117', borderTop: '1px solid #21262D', padding: '12px 24px', fontSize: 12, color: '#7D8590', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {debug.detectedCodeCol && (
              <div>
                <span style={{ color: '#484F58' }}>Code col: </span>
                <span style={{ color: '#E3B341', fontFamily: 'monospace' }}>{debug.detectedCodeCol}</span>
              </div>
            )}
            {debug.detectedInvCol && (
              <div>
                <span style={{ color: '#484F58' }}>Inv col: </span>
                <span style={{ color: '#E3B341', fontFamily: 'monospace' }}>{debug.detectedInvCol}</span>
              </div>
            )}
            {debug.detectedPriceCol && (
              <div>
                <span style={{ color: '#484F58' }}>Price col: </span>
                <span style={{ color: '#E3B341', fontFamily: 'monospace' }}>{debug.detectedPriceCol}</span>
              </div>
            )}
            {debug.sampleCodes && debug.sampleCodes.length > 0 && (
              <div>
                <span style={{ color: '#484F58' }}>Sample codes: </span>
                <span style={{ color: '#79BAFF', fontFamily: 'monospace' }}>{debug.sampleCodes.join(', ')}</span>
              </div>
            )}
            {debug.samplePrices && debug.samplePrices.length > 0 && (() => {
              const avg = debug.samplePrices.reduce((a, b) => a + b, 0) / debug.samplePrices.filter(p => p > 0).length;
              const allZero = debug.samplePrices.every(p => p === 0);
              const tooLow = !allZero && avg < 10;
              return (
                <div>
                  <span style={{ color: '#484F58' }}>Sample prices: </span>
                  <span style={{ color: allZero ? '#F85149' : tooLow ? '#E3B341' : '#3FB950', fontFamily: 'monospace' }}>
                    {debug.samplePrices.map(p => p > 0 ? `$${p.toFixed(2)}` : '0').join(', ')}
                    {allZero && ' ← all zero! wrong price column'}
                    {tooLow && ` ← avg $${avg.toFixed(2)} — may be FOB/cost, not retail`}
                  </span>
                </div>
              );
            })()}
            {debug.allHeaders && debug.allHeaders.length > 0 && (
              <div style={{ marginTop: 2 }}>
                <span style={{ color: '#484F58' }}>All columns: </span>
                <span style={{ fontFamily: 'monospace' }}>
                  {debug.allHeaders.map((h, i) => {
                    const isPrice = h === debug.detectedPriceCol;
                    const isInv = h === debug.detectedInvCol;
                    const isCode = h === debug.detectedCodeCol;
                    return (
                      <span key={i} style={{ color: isPrice ? '#3FB950' : isInv ? '#22D3A5' : isCode ? '#E3B341' : '#484F58' }}>
                        {h}{i < (debug.allHeaders?.length ?? 0) - 1 ? ', ' : ''}
                      </span>
                    );
                  })}
                </span>
              </div>
            )}
            {/* Join check: how many pricing codes appear in wine properties */}
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
                  {matches === 0 && store.winePropertiesData.length > 0 && (
                    <span style={{ color: '#7D8590' }}>
                      {' '}— wine props sample: <span style={{ fontFamily: 'monospace', color: '#79BAFF' }}>
                        {store.winePropertiesData.slice(0, 3).map(w => w.wineCode).join(', ')}
                      </span>
                    </span>
                  )}
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: '0 0 4px' }}>
          Upload Data
        </h1>
        <p style={{ fontSize: 14, color: '#7D8590', margin: '0 0 28px' }}>
          Drop or click each zone to load a dataset. Data is stored locally in your browser.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ZONES.map((zone) => (
            <UploadZone key={zone.key} zone={zone} />
          ))}
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </Shell>
  );
}
