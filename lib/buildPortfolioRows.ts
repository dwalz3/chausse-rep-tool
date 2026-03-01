import { WinePropertyRow, PricingRow, AllocationRow, OpenPORow, PortfolioRow, Ra25WineRow } from '@/types';

function normCode(s: string): string {
  return s.toString().trim().toUpperCase();
}

export function buildPortfolioRows(
  wineProps: WinePropertyRow[],
  pricing: PricingRow[] | null,
  allocations: AllocationRow[] | null,
  openPOs: OpenPORow[] | null,
  ra25WineTotals?: Ra25WineRow[] | null
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
      caseSize: w.caseSize,
      bottleSize: w.bottleSize,
      isNatural: w.isNatural,
      isBiodynamic: w.isBiodynamic,
      isDirect: w.isDirect,
      bottlePrice: price?.defaultPrice ?? 0,
      fobPrice: price?.fobPrice ?? 0,
      allocatedCases: allocMap.get(key) ?? 0,
      openPOCases: po?.openCases ?? 0,
      expectedArrival: po?.expectedArrival ?? null,
      stockCases: po?.openCases ?? 0, // proxy until inventory data available
      accountCount: accountCountMap.get(key) ?? 0,
    };
  });
}
