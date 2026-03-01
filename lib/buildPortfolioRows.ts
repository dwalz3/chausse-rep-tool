import { WinePropertyRow, PricingRow, AllocationRow, OpenPORow, PortfolioRow, Ra25WineRow, InventoryRow } from '@/types';

function normCode(s: string): string {
  return s.toString().trim().toUpperCase();
}

export function buildPortfolioRows(
  wineProps: WinePropertyRow[],
  pricing: PricingRow[] | null,
  allocations: AllocationRow[] | null,
  openPOs: OpenPORow[] | null,
  ra25WineTotals?: Ra25WineRow[] | null,
  inventoryData?: InventoryRow[] | null
): PortfolioRow[] {
  // Build lookup maps
  const priceMap = new Map<string, PricingRow>();
  if (pricing) {
    for (const p of pricing) {
      priceMap.set(normCode(p.wineCode), p);
    }
  }

  // Aggregate allocations by wine code
  const allocMap = new Map<string, number>();
  if (allocations) {
    for (const a of allocations) {
      const key = normCode(a.wineCode);
      allocMap.set(key, (allocMap.get(key) ?? 0) + a.allocatedCases);
    }
  }

  // Build inventory lookup map
  const inventoryMap = new Map<string, { casesOnHand: number; bottlesOnHand: number; defaultPrice?: number; fobPrice?: number }>();
  if (inventoryData) {
    for (const inv of inventoryData) {
      const key = normCode(inv.wineCode);
      const existing = inventoryMap.get(key);
      if (existing) {
        existing.casesOnHand += inv.casesOnHand;
        existing.bottlesOnHand += inv.bottlesOnHand;
        // Keep first non-zero price seen
        if (!existing.defaultPrice && inv.defaultPrice) existing.defaultPrice = inv.defaultPrice;
        if (!existing.fobPrice && inv.fobPrice) existing.fobPrice = inv.fobPrice;
      } else {
        inventoryMap.set(key, {
          casesOnHand: inv.casesOnHand,
          bottlesOnHand: inv.bottlesOnHand,
          defaultPrice: inv.defaultPrice,
          fobPrice: inv.fobPrice,
        });
      }
    }
  }

  // Aggregate RA25 account counts by wine code
  const accountCountMap = new Map<string, number>();
  if (ra25WineTotals) {
    for (const w of ra25WineTotals) {
      accountCountMap.set(normCode(w.wineCode), w.accountCount);
    }
  }

  // Aggregate open POs by wine code (sum cases, earliest arrival)
  const poMap = new Map<string, { openCases: number; expectedArrival: Date | null }>();
  if (openPOs) {
    for (const po of openPOs) {
      const key = normCode(po.wineCode);
      const existing = poMap.get(key);
      if (existing) {
        existing.openCases += po.openCases;
        if (po.expectedArrival) {
          if (!existing.expectedArrival || po.expectedArrival < existing.expectedArrival) {
            existing.expectedArrival = po.expectedArrival;
          }
        }
      } else {
        poMap.set(key, {
          openCases: po.openCases,
          expectedArrival: po.expectedArrival,
        });
      }
    }
  }

  return wineProps.map((w): PortfolioRow => {
    const key = normCode(w.wineCode);
    const price = priceMap.get(key);
    const po = poMap.get(key);
    const inv = inventoryMap.get(key);
    const csSize = parseInt(w.caseSize) || 12;

    return {
      wineCode: w.wineCode,
      name: w.name,
      wineName: w.wineName,
      producer: w.producer,
      importer: w.importer,
      country: w.country,
      region: w.region,
      wineType: w.wineType,
      vintage: w.vintage,
      varietal: w.varietal,
      caseSize: w.caseSize,
      bottleSize: w.bottleSize,
      isNatural: w.isNatural,
      isBiodynamic: w.isBiodynamic,
      isDirect: w.isDirect,
      // Use dedicated pricing file first; fall back to pricing columns in RB1
      bottlePrice: price?.defaultPrice ?? inv?.defaultPrice ?? 0,
      fobPrice: price?.fobPrice ?? inv?.fobPrice ?? 0,
      inventoryCases: inv?.casesOnHand ?? 0,
      inventoryBottles: inv?.bottlesOnHand ?? 0,
      inventoryTotalBottles: inv ? inv.casesOnHand * csSize + inv.bottlesOnHand : 0,
      allocatedCases: allocMap.get(key) ?? 0,
      openPOCases: po?.openCases ?? 0,
      expectedArrival: po?.expectedArrival ?? null,
      stockCases: inv?.casesOnHand ?? po?.openCases ?? 0,
      accountCount: accountCountMap.get(key) ?? 0,
    };
  });
}
