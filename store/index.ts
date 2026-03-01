'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  RepIdentity, SalesGoal,
  Rc5Data, Ra25Data, ProducersData,
  WinePropertyRow, PricingRow, AllocationRow, OpenPORow, InventoryRow,
  UploadKey, UploadMeta,
} from '@/types';
import {
  Ra23Data, Ra21Data, Ra27Data, Rb6RepData, Ra30Data, Rc3Data, Ra3Data,
} from '@/types/reports';
import { RepSyncStatus } from '@/types/integrations';

// ── Data Slice ─────────────────────────────────────────────────────────────────

interface DataState {
  rc5Data: Rc5Data | null;
  ra25Data: Ra25Data | null;
  ra23Data: Ra23Data | null;
  ra21Data: Ra21Data | null;
  ra27Data: Ra27Data | null;
  rb6RepData: Rb6RepData | null;
  ra30Data: Ra30Data | null;
  rc3Data: Rc3Data | null;
  ra3Data: Ra3Data | null;
  producersData: ProducersData | null;
  winePropertiesData: WinePropertyRow[] | null;
  pricingData: PricingRow[] | null;
  inventoryData: InventoryRow[] | null;
  allocationsData: AllocationRow[] | null;
  openPOData: OpenPORow[] | null;
  uploadMeta: Partial<Record<UploadKey, UploadMeta>>;
  syncStatus: RepSyncStatus;
}

interface DataActions {
  setRc5Data: (data: Rc5Data, meta: UploadMeta) => void;
  setRa25Data: (data: Ra25Data, meta: UploadMeta) => void;
  setRa23Data: (data: Ra23Data, meta: UploadMeta) => void;
  setRa21Data: (data: Ra21Data, meta: UploadMeta) => void;
  setRa27Data: (data: Ra27Data, meta: UploadMeta) => void;
  setRb6RepData: (data: Rb6RepData, meta: UploadMeta) => void;
  setRa30Data: (data: Ra30Data, meta: UploadMeta) => void;
  setRc3Data: (data: Rc3Data, meta: UploadMeta) => void;
  setRa3Data: (data: Ra3Data, meta: UploadMeta) => void;
  setProducersData: (data: ProducersData, meta: UploadMeta) => void;
  setWinePropertiesData: (data: WinePropertyRow[], meta: UploadMeta) => void;
  setPricingData: (data: PricingRow[], meta: UploadMeta) => void;
  setInventoryData: (data: InventoryRow[], meta: UploadMeta) => void;
  setAllocationsData: (data: AllocationRow[], meta: UploadMeta) => void;
  setOpenPOData: (data: OpenPORow[], meta: UploadMeta) => void;
  setSyncStatus: (key: keyof RepSyncStatus, entry: RepSyncStatus[keyof RepSyncStatus]) => void;
  clearAllData: () => void;
}

// ── Settings Slice ─────────────────────────────────────────────────────────────

interface SettingsState {
  btgThreshold: number;      // default 22
  goalMultiplier: number;    // default 1.10
  monthlyGoal: number;       // direct monthly revenue goal (0 = not set)
  manualGoals: SalesGoal[];
  rep: RepIdentity | null;   // identity after login
  accountNotes: Record<string, string>;       // keyed by account name
  contactedAccounts: Record<string, string>;  // keyed by account name, value = ISO date contacted
}

interface SettingsActions {
  setBtgThreshold: (v: number) => void;
  setGoalMultiplier: (v: number) => void;
  setMonthlyGoal: (v: number) => void;
  upsertManualGoal: (goal: SalesGoal) => void;
  setRep: (rep: RepIdentity | null) => void;
  setAccountNote: (account: string, note: string) => void;
  markContacted: (account: string) => void;
  unmarkContacted: (account: string) => void;
}

// ── UI Slice ───────────────────────────────────────────────────────────────────

interface UiState {
  isSidebarCollapsed: boolean;
}

interface UiActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
}

// ── Combined Store ─────────────────────────────────────────────────────────────

type Store = DataState & DataActions & SettingsState & SettingsActions & UiState & UiActions;

const DATA_DEFAULTS: DataState = {
  rc5Data: null,
  ra25Data: null,
  ra23Data: null,
  ra21Data: null,
  ra27Data: null,
  rb6RepData: null,
  ra30Data: null,
  rc3Data: null,
  ra3Data: null,
  producersData: null,
  winePropertiesData: null,
  pricingData: null,
  inventoryData: null,
  allocationsData: null,
  openPOData: null,
  uploadMeta: {},
  syncStatus: {},
};

const SETTINGS_DEFAULTS: SettingsState = {
  btgThreshold: 22,
  goalMultiplier: 1.10,
  monthlyGoal: 0,
  manualGoals: [],
  rep: null,
  accountNotes: {},
  contactedAccounts: {},
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      // ── Data state ────────────────────────────────────────────────────────────
      ...DATA_DEFAULTS,

      setRc5Data: (data, meta) =>
        set((s) => ({ rc5Data: data, uploadMeta: { ...s.uploadMeta, rc5: meta } })),

      setRa25Data: (data, meta) =>
        set((s) => ({ ra25Data: data, uploadMeta: { ...s.uploadMeta, ra25: meta } })),

      setRa23Data: (data, meta) =>
        set((s) => ({ ra23Data: data, uploadMeta: { ...s.uploadMeta, ra23: meta } })),

      setRa21Data: (data, meta) =>
        set((s) => ({ ra21Data: data, uploadMeta: { ...s.uploadMeta, ra21: meta } })),

      setRa27Data: (data, meta) =>
        set((s) => ({ ra27Data: data, uploadMeta: { ...s.uploadMeta, ra27: meta } })),

      setRb6RepData: (data, meta) =>
        set((s) => ({ rb6RepData: data, uploadMeta: { ...s.uploadMeta, rb6: meta } })),

      setRa30Data: (data, meta) =>
        set((s) => ({ ra30Data: data, uploadMeta: { ...s.uploadMeta, ra30: meta } })),

      setRc3Data: (data, meta) =>
        set((s) => ({ rc3Data: data, uploadMeta: { ...s.uploadMeta, rc3: meta } })),

      setRa3Data: (data, meta) =>
        set((s) => ({ ra3Data: data, uploadMeta: { ...s.uploadMeta, ra3: meta } })),

      setSyncStatus: (key, entry) =>
        set((s) => ({ syncStatus: { ...s.syncStatus, [key]: entry } })),

      setProducersData: (data, meta) =>
        set((s) => ({ producersData: data, uploadMeta: { ...s.uploadMeta, producers: meta } })),

      setWinePropertiesData: (data, meta) =>
        set((s) => ({ winePropertiesData: data, uploadMeta: { ...s.uploadMeta, wineProperties: meta } })),

      setPricingData: (data, meta) =>
        set((s) => ({ pricingData: data, uploadMeta: { ...s.uploadMeta, pricing: meta } })),

      setInventoryData: (data, meta) =>
        set((s) => ({ inventoryData: data, uploadMeta: { ...s.uploadMeta, inventory: meta } })),

      setAllocationsData: (data, meta) =>
        set((s) => ({ allocationsData: data, uploadMeta: { ...s.uploadMeta, allocations: meta } })),

      setOpenPOData: (data, meta) =>
        set((s) => ({ openPOData: data, uploadMeta: { ...s.uploadMeta, openPO: meta } })),

      clearAllData: () => set({ ...DATA_DEFAULTS }),

      // ── Settings state ────────────────────────────────────────────────────────
      ...SETTINGS_DEFAULTS,

      setBtgThreshold: (v) => set({ btgThreshold: v }),
      setGoalMultiplier: (v) => set({ goalMultiplier: v }),
      setMonthlyGoal: (v) => set({ monthlyGoal: v }),

      upsertManualGoal: (goal) =>
        set((s) => {
          const existing = s.manualGoals.filter(
            (g) => !(g.rep === goal.rep && g.yearMonth === goal.yearMonth)
          );
          return { manualGoals: [...existing, goal] };
        }),

      setRep: (rep) => set({ rep }),

      setAccountNote: (account, note) =>
        set((s) => ({ accountNotes: { ...s.accountNotes, [account]: note } })),

      markContacted: (account) =>
        set((s) => ({ contactedAccounts: { ...s.contactedAccounts, [account]: new Date().toISOString() } })),

      unmarkContacted: (account) =>
        set((s) => {
          const next = { ...s.contactedAccounts };
          delete next[account];
          return { contactedAccounts: next };
        }),

      // ── UI state ──────────────────────────────────────────────────────────────
      isSidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ isSidebarCollapsed: v }),
    }),
    {
      name: 'chausse-rep-tool',
      storage: createJSONStorage(() => localStorage),
      // Skip UiSlice from persistence
      partialize: (s): Omit<Store, keyof UiActions | keyof UiState> => ({
        rc5Data: s.rc5Data,
        ra25Data: s.ra25Data,
        ra23Data: s.ra23Data,
        ra21Data: s.ra21Data,
        ra27Data: s.ra27Data,
        rb6RepData: s.rb6RepData,
        ra30Data: s.ra30Data,
        rc3Data: s.rc3Data,
        ra3Data: s.ra3Data,
        producersData: s.producersData,
        winePropertiesData: s.winePropertiesData,
        pricingData: s.pricingData,
        inventoryData: s.inventoryData,
        allocationsData: s.allocationsData,
        openPOData: s.openPOData,
        uploadMeta: s.uploadMeta,
        syncStatus: s.syncStatus,
        btgThreshold: s.btgThreshold,
        goalMultiplier: s.goalMultiplier,
        monthlyGoal: s.monthlyGoal,
        manualGoals: s.manualGoals,
        rep: s.rep,
        accountNotes: s.accountNotes,
        contactedAccounts: s.contactedAccounts,
        setRc5Data: s.setRc5Data,
        setRa25Data: s.setRa25Data,
        setRa23Data: s.setRa23Data,
        setRa21Data: s.setRa21Data,
        setRa27Data: s.setRa27Data,
        setRb6RepData: s.setRb6RepData,
        setRa30Data: s.setRa30Data,
        setRc3Data: s.setRc3Data,
        setRa3Data: s.setRa3Data,
        setProducersData: s.setProducersData,
        setWinePropertiesData: s.setWinePropertiesData,
        setPricingData: s.setPricingData,
        setInventoryData: s.setInventoryData,
        setAllocationsData: s.setAllocationsData,
        setOpenPOData: s.setOpenPOData,
        setSyncStatus: s.setSyncStatus,
        clearAllData: s.clearAllData,
        setBtgThreshold: s.setBtgThreshold,
        setGoalMultiplier: s.setGoalMultiplier,
        setMonthlyGoal: s.setMonthlyGoal,
        upsertManualGoal: s.upsertManualGoal,
        setRep: s.setRep,
        setAccountNote: s.setAccountNote,
        markContacted: s.markContacted,
        unmarkContacted: s.unmarkContacted,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[store] rehydrate error:', error);
        }
        if (state) {
          console.log('[store] rehydrated');
        }
      },
    }
  )
);

// Quota handler — strips raw datasets on QuotaExceededError
if (typeof window !== 'undefined') {
  const origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key: string, value: string) {
    try {
      origSetItem(key, value);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('[store] localStorage quota exceeded — stripping raw data');
        useStore.setState({
          rc5Data: null,
          ra25Data: null,
          ra23Data: null,
          ra21Data: null,
          ra27Data: null,
          rb6RepData: null,
          ra30Data: null,
          rc3Data: null,
          ra3Data: null,
          producersData: null,
          winePropertiesData: null,
          pricingData: null,
          inventoryData: null,
          allocationsData: null,
          openPOData: null,
        });
        try {
          origSetItem(key, value);
        } catch {
          console.error('[store] still over quota after stripping');
        }
      }
    }
  };
}
