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
import { UploadKey, UploadMeta } from '@/types';
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';

type ZoneStatus = 'idle' | 'loading' | 'success' | 'error';

interface ZoneState {
  status: ZoneStatus;
  message: string;
  rowCount?: number;
}

const ZONES: { key: UploadKey; label: string; hint: string; accept: string }[] = [
  { key: 'rc5',           label: 'RC5 — Territory Revenue',     hint: 'Sales sheet, 13 monthly columns', accept: '.xlsx,.xls' },
  { key: 'ra25',          label: 'RA25 — Account Summary',      hint: 'Accounts sheet',                  accept: '.xlsx,.xls' },
  { key: 'wineProperties',label: 'Wine Properties',             hint: 'CSV or XLSX — Wine Code, Name, Producer, Country, Type', accept: '.csv,.xlsx,.xls' },
  { key: 'pricing',       label: 'Pricing',                     hint: 'Wine Code, Default Price, FOB Price', accept: '.xlsx,.xls' },
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
      } else if (key === 'pricing') {
        const result = await parsePricingDetailed(file);
        if (result.errors.length && !result.rowCount) throw new Error(result.errors[0]);
        store.setPricingData(result.rows, { ...meta, rowCount: result.rowCount });
        rowCount = result.rowCount;
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
    const state = zones[zone.key];
    const meta = store.uploadMeta[zone.key];

    const isDragging = false;

    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: `2px dashed ${state?.status === 'error' ? '#dc2626' : state?.status === 'success' ? '#16a34a' : '#E5E1DC'}`,
          borderRadius: 10,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          cursor: 'pointer',
          transition: 'border-color 0.15s',
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
          {state?.status === 'loading' && <Loader size={22} color="#a8a29e" style={{ animation: 'spin 1s linear infinite' }} />}
          {state?.status === 'success' && <CheckCircle size={22} color="#16a34a" />}
          {state?.status === 'error' && <AlertCircle size={22} color="#dc2626" />}
          {(!state || state.status === 'idle') && <Upload size={22} color="#a8a29e" />}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1C1917' }}>{zone.label}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#a8a29e' }}>{zone.hint}</p>
        </div>

        {/* Status */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {state?.status === 'loading' && (
            <span style={{ fontSize: 12, color: '#a8a29e' }}>Parsing…</span>
          )}
          {state?.status === 'success' && (
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{state.message}</span>
          )}
          {state?.status === 'error' && (
            <span style={{ fontSize: 12, color: '#dc2626' }}>{state.message}</span>
          )}
          {!state && meta && (
            <span style={{ fontSize: 12, color: '#a8a29e' }}>
              {meta.rowCount.toLocaleString()} rows · {fmt(meta.date)}
            </span>
          )}
          {!state && !meta && (
            <span style={{ fontSize: 12, color: '#a8a29e' }}>No data</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <div style={{ maxWidth: 700 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: '0 0 4px' }}>
          Upload Data
        </h1>
        <p style={{ fontSize: 14, color: '#a8a29e', margin: '0 0 28px' }}>
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
