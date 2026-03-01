'use client';

import { useState } from 'react';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';

const APP_VERSION = 'v0.2.0';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E1DC', padding: '20px 24px', marginBottom: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1C1917', margin: '0 0 16px' }}>{title}</h3>
      {children}
    </div>
  );
}

function FieldRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#1C1917' }}>{label}</p>
        {description && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#a8a29e' }}>{description}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, min, max, step, prefix, suffix }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
  prefix?: string; suffix?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E5E1DC', borderRadius: 8, overflow: 'hidden', backgroundColor: '#F9F9F9' }}>
      {prefix && <span style={{ paddingLeft: 10, fontSize: 13, color: '#a8a29e' }}>{prefix}</span>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{ width: 80, padding: '8px 10px', border: 'none', outline: 'none', fontSize: 14, backgroundColor: '#F9F9F9', color: '#1C1917', textAlign: 'right' }}
      />
      {suffix && <span style={{ paddingRight: 10, fontSize: 13, color: '#a8a29e' }}>{suffix}</span>}
    </div>
  );
}

export default function SettingsPage() {
  const btgThreshold = useStore((s) => s.btgThreshold);
  const setBtgThreshold = useStore((s) => s.setBtgThreshold);
  const goalMultiplier = useStore((s) => s.goalMultiplier);
  const setGoalMultiplier = useStore((s) => s.setGoalMultiplier);
  const monthlyGoal = useStore((s) => s.monthlyGoal);
  const setMonthlyGoal = useStore((s) => s.setMonthlyGoal);
  const clearAllData = useStore((s) => s.clearAllData);
  const rep = useStore((s) => s.rep);

  const [confirmClear, setConfirmClear] = useState(false);

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearAllData();
    setConfirmClear(false);
  }

  return (
    <Shell>
      <div style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: '0 0 20px' }}>Settings</h1>

        {/* Portfolio settings */}
        <Section title="Portfolio">
          <FieldRow
            label="BTG Threshold"
            description="Wines at or below this price per bottle appear in the BTG-Eligible saved view."
          >
            <NumInput
              value={btgThreshold}
              onChange={setBtgThreshold}
              min={1}
              max={200}
              step={0.5}
              prefix="$"
              suffix="/btl"
            />
          </FieldRow>
        </Section>

        {/* Sales goal settings */}
        <Section title="Sales Goals">
          <FieldRow
            label="Monthly Revenue Goal"
            description="Set a fixed monthly target. Shown on Dashboard as goal attainment. Set to 0 to use auto-target instead."
          >
            <NumInput
              value={monthlyGoal}
              onChange={(v) => setMonthlyGoal(Math.max(0, v))}
              min={0}
              step={1000}
              prefix="$"
            />
          </FieldRow>
          <FieldRow
            label="Auto-Target Multiplier"
            description="When no fixed goal is set, auto-target = same month last year × this multiplier."
          >
            <NumInput
              value={goalMultiplier}
              onChange={(v) => setGoalMultiplier(Math.max(0.5, Math.min(3, v)))}
              min={0.5}
              max={3}
              step={0.01}
              suffix="×"
            />
          </FieldRow>
          <p style={{ fontSize: 13, color: '#a8a29e', margin: 0 }}>
            {monthlyGoal > 0
              ? <>Fixed goal: <strong>${monthlyGoal.toLocaleString()}/mo</strong></>
              : <>Auto-target active: <strong>{goalMultiplier.toFixed(2)}×</strong> of same month last year ({((goalMultiplier - 1) * 100).toFixed(0)}% growth)</>
            }
          </p>
        </Section>

        {/* Data management */}
        <Section title="Data Management">
          <FieldRow
            label="Clear All Uploaded Data"
            description="Removes all uploaded datasets (RC5, RA25, wine properties, pricing, etc.) from local storage. Settings are preserved."
          >
            <button
              onClick={handleClear}
              style={{
                backgroundColor: confirmClear ? '#dc2626' : '#FFFFFF',
                color: confirmClear ? '#FFFFFF' : '#dc2626',
                border: '1px solid #dc2626',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {confirmClear ? 'Click again to confirm' : 'Clear All Data'}
            </button>
          </FieldRow>

          {confirmClear && (
            <button
              onClick={() => setConfirmClear(false)}
              style={{ backgroundColor: 'transparent', border: 'none', fontSize: 12, color: '#a8a29e', cursor: 'pointer', padding: 0 }}
            >
              Cancel
            </button>
          )}
        </Section>

        {/* About */}
        <Section title="About">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#a8a29e' }}>
            <span>Chausse Rep Field Tool</span>
            <span style={{ fontWeight: 600, color: '#1C1917' }}>{APP_VERSION}</span>
          </div>
          {rep && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#a8a29e', marginTop: 8 }}>
              <span>Signed in as</span>
              <span style={{ fontWeight: 600, color: '#1C1917', textTransform: 'capitalize' }}>{rep}</span>
            </div>
          )}
        </Section>
      </div>
    </Shell>
  );
}
