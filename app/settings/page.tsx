'use client';

import { useState } from 'react';
import Shell from '@/components/layout/Shell';
import { useStore } from '@/store';

const APP_VERSION = 'v0.2.0';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 sm:p-6 mb-4 shadow-sm">
      <h3 className="text-[15px] font-bold text-text m-0 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function FieldRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6 pb-4 mb-4 border-b border-border/50 last:border-0 last:pb-0 last:mb-0">
      <div className="flex-1">
        <p className="m-0 text-sm font-medium text-text">{label}</p>
        {description && <p className="m-0 mt-0.5 text-xs text-muted leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, min, max, step, prefix, suffix }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
  prefix?: string; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden bg-surface dark:bg-[#1C2128] focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
      {prefix && <span className="pl-2.5 text-[13px] text-muted">{prefix}</span>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 px-2.5 py-2 border-none outline-none text-sm bg-transparent text-text text-right"
      />
      {suffix && <span className="pr-2.5 text-[13px] text-muted">{suffix}</span>}
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
      <div className="max-w-[640px] mx-auto w-full pb-8">
        <h1 className="text-2xl font-bold text-text m-0 mb-5">Settings</h1>

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
          <p className="text-[13px] text-muted m-0 mt-2">
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
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              <button
                onClick={handleClear}
                className={`flex-1 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors border ${confirmClear
                    ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                    : 'bg-surface text-red-500 border-red-500/50 hover:bg-red-500/10'
                  }`}
              >
                {confirmClear ? 'Click again to confirm' : 'Clear All Data'}
              </button>
              {confirmClear && (
                <button
                  onClick={() => setConfirmClear(false)}
                  className="bg-transparent border-none text-xs text-muted cursor-pointer p-2 hover:text-text transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </FieldRow>
        </Section>

        {/* About */}
        <Section title="About">
          <div className="flex justify-between text-[13px] text-muted">
            <span>Chausse Rep Field Tool</span>
            <span className="font-semibold text-text">{APP_VERSION}</span>
          </div>
          {rep && (
            <div className="flex justify-between text-[13px] text-muted mt-2 border-t border-border/50 pt-2">
              <span>Signed in as</span>
              <span className="font-semibold text-text capitalize">{rep}</span>
            </div>
          )}
        </Section>
      </div>
    </Shell>
  );
}
