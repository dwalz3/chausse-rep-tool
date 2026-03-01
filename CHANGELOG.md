# Changelog — Chausse Rep Field Tool

## v0.9.2 — 2026-02-28
Portfolio inventory column; pricing debug shows all file columns.

### Added
- `app/portfolio/page.tsx` — Inventory column after Price: shows `openPOCases` ("X cs on order", green) and `allocatedCases` ("Y alloc", amber); `—` when none
- `lib/parsers/pricingParser.ts` — `allHeaders: string[]` added to `PricingParseResult` — emits every column header from the detected header row
- `app/upload/page.tsx` — pricing debug panel now shows "All columns:" row listing every header; detected price col highlighted green, code col yellow; sample prices now warn amber if avg < $10 ("may be FOB/cost, not retail")

## v0.9.1 — 2026-02-28
Portfolio table: rename "Name" column → "Wine"; reduce default width 280→240 for more column room.

### Changed
- `app/portfolio/page.tsx` — `label: 'Name'` → `label: 'Wine'`; `defaultWidth: 280` → `240`

## v0.9.0 — 2026-02-28
Portfolio Explorer — Airtable-style spreadsheet table with sticky columns and resizable widths.

### Added
- `app/portfolio/page.tsx` — full table rewrite: row-# column (sticky left:0) + Name column (sticky left:44px, wine-type color left border); horizontal scroll container (`overflow: auto`, `maxHeight: calc(100vh - 230px)`); column resize via drag handle (direct `<col>` DOM mutation during drag, single React re-render on mouseup); hover sync on sticky cells via `data-sticky` attribute + `querySelectorAll`; `<colgroup>` with `tableLayout: fixed`; removed `WineTypeBadge` import (replaced by inline `WineTypePill` using `getWineTypeStyle`)
- Column order: # | Name | Price | Accts | Importer | Region | Country | Type | Varietal | Farming

### Changed
- `types/index.ts` — `varietal: string` added to `WinePropertyRow` and `PortfolioRow`
- `lib/parsers/winePropertiesParser.ts` — added `colVarietal` detection (keywords: varietal, grape variety, variety, blend, composition, grapes, grape); removed `varietal`/`grape` from type column search to avoid conflicts; `varietal` field emitted in each row
- `lib/buildPortfolioRows.ts` — passes `varietal: w.varietal` through to `PortfolioRow`

## v0.8.4 — 2026-02-28
Pricing join fully working. Debug panel on Upload page.

### Fixed
- `lib/parsers/pricingParser.ts` — Vinosmith exports have a `Price Label` text column that was incorrectly matched by the `price` keyword; new `findPriceCol()` logic: (1) named keywords like `default price`/`retail price`, (2) `price` columns excluding `label`/`type`/`code`/`tier` variants, (3) standalone `default`/`retail`/`wholesale`, (4) numeric fallback — scans data rows for first column with >60% non-zero values. Also adds CSV support and `item` as last-resort code column keyword. Result: 744/747 pricing codes now join correctly.
- `lib/parsers/winePropertiesParser.ts` — adds `detectedCodeCol` + `sampleCodes` to parse result for diagnostics

### Added
- `app/upload/page.tsx` — collapsible debug panel on each upload zone (collapsed by default, `›` to expand); shows detected code/price column names, sample codes, sample prices (red warning if all zero), and join check against wine properties (`X/Y pricing codes match`)

## v0.8.0 — 2026-02-28
Parser fixes, portfolio enhancements, WineDrawer, Focus KPIs.

### Fixed
- `lib/parsers/winePropertiesParser.ts` — smart header row detection (scores rows 0–5 instead of always using row 0); 7 additional type column name variants (`beverage type`, `wine category`, `item type`, `product group`, `subcategory`, `varietal`, `grape`); added `pét-nat` / `pet-nat` (hyphenated) to Sparkling detection; added `isJunkRow()` filter (delivery fees, freight, surcharges skipped)
- `lib/parsers/pricingParser.ts` — removed overly broad `'item'` keyword from code column search; replaced with `'item number'`, `'item no'`, `'item #'`, `'product code'` — prevents matching "Item Description" as the code column
- `app/accounts/page.tsx` — replaced YTD column with "Latest Mo." (most recent month revenue); tabular-nums on numeric cells

### Added
- `types/index.ts` — `PortfolioRow.accountCount: number`
- `lib/buildPortfolioRows.ts` — accepts optional `ra25WineTotals` parameter; computes `accountCount` from wine-level RA25 data
- `components/ui/WineDrawer.tsx` — slide-in drawer (position: fixed right, 420px); shows type badge, wine identity, farming attributes, 10-field detail grid, portfolio link
- `components/portfolio/SavedViewChips.tsx` — added Champagne view (French sparkling + region/producer match) and Burgundy view (France + region Burgundy/Bourgogne); 19 total views
- `app/portfolio/page.tsx` — WineDrawer wired (click row → drawer instead of navigate); Farming column (N/B/D badges); Accounts column replaces PO Cases; passes `ra25Data.wineTotals` to `buildPortfolioRows`
- `app/producers/page.tsx` — farming practice badges with color coding; producer bio with Read More/Less toggle; wine rows clickable → WineDrawer; bottle price shown in expanded wine list; WineDrawer wired
- `app/focus/page.tsx` — KPI card row (Wine SKUs, Territory Revenue, Active Accounts, Avg/Account); sections renamed to "Expand These — Top Performers" / "Next Tier — Build Placement"; new Reactivate section (dormant accounts sorted by lifetime revenue with Last Active + Peak 3-Mo columns); tabular-nums on all numeric cells

## v0.6.1 — 2026-02-28
Design addenda: TrendSparkline, unified wine type colors, Account Detail sidenotes layout.

### Added
- `lib/constants/wineColors.ts` — canonical `WINE_TYPE_STYLES` + `getWineTypeStyle()` used across all badge instances
- `components/ui/WineTypeBadge.tsx` — unified badge (replaces portfolio version); `components/portfolio/WineTypeBadge.tsx` re-exports from here
- `components/ui/TrendSparkline.tsx` — pure SVG sparkline (Tufte: max data, min ink); trims leading zeros, dots final value with trend color (green/red/gray)
- `components/ui/SidenoteField.tsx` — compact label + value for metadata sidebars
- `components/ui/AccountNotes.tsx` — auto-saving notes textarea (persists to Zustand on blur)

### Changed
- `app/accounts/page.tsx` — Trend column now shows TrendSparkline (48×18) + `±%` label; replaces pure text indicator
- `app/accounts/[id]/page.tsx` — full sidenotes layout redesign: header (name + sparkline 80×28 + status badges) + KPI grid-cols-4 (3-Mo ±%, YTD, All-Time, Avg/Month) + two-column body (revenue chart + top wines left; metadata sidenote + account notes right)

## v0.6.0 — 2026-02-28
Major fix and enhancement pass.

### Fixed
- `lib/parsers/winePropertiesParser.ts` — broader column name matching for wine code, type, producer; expanded `parseWineType()` with 30+ new aliases (pet nat, skin contact, cremant, etc.); fixes all types showing "Other"
- `lib/parsers/ra25Parser.ts` — now reads wine name/code columns if present; builds `wineTotals` (wine-level aggregation); fixes Focus and Account Detail showing importers instead of individual wines
- `app/focus/page.tsx` — rebuilt to use wine-level RA25 data with type badges, producer, price, account count; no longer groups by importer
- `app/accounts/[id]/page.tsx` — Top Wines now shows individual wine SKUs with type badges and producer; wine rows link to portfolio detail
- `app/page.tsx` — Goal Attainment capped at 999%; hides when no goal set and shows "Set a goal →" prompt; replaces Incoming Wines with Priority Actions (dormant/at-risk/focus cards)
- `app/producers/page.tsx` — pluralization fixed ("1 wine" not "1 wines")

### Added
- `types/index.ts` — `Ra25Row.wineName?`, `Ra25Row.wineCode?`, `Ra25WineRow` interface, `Ra25Data.wineTotals`
- `store/index.ts` — `monthlyGoal`, `accountNotes`, `contactedAccounts` state + setters (`setMonthlyGoal`, `setAccountNote`, `markContacted`, `unmarkContacted`)
- `app/accounts/page.tsx` — territory filter (All/Oregon/Washington) + status filter chips (All/Active/At-Risk/Dormant/New); Trend column (H1 vs H2 ↑↓ %); At-Risk status (last month < 50% of 3-mo avg)
- `app/accounts/[id]/page.tsx` — account notes textarea (auto-save on blur); prior-period trend on 3-Mo KPI; Avg/Month KPI; territory badge
- `app/dormant/page.tsx` — Re-engage modal with account summary, pitch notes, Mark as Contacted; contacted accounts shown in sub-section
- `app/settings/page.tsx` — Monthly Revenue Goal field (fixed goal overrides auto-target)

## v0.5.1 — 2026-02-28
4-user auth: email-based login, Alejandra added.

### Changed
- `types/index.ts` — `RepIdentity` expanded to `'austin' | 'jason' | 'dave' | 'alejandra'`; `Rc5Row.primaryRep` updated to match
- `lib/auth.ts` — `verifyCookie` accepts all 4 rep identities
- `app/api/auth/login/route.ts` — accepts email address, maps to rep identity + env var; error message no longer leaks valid emails
- `app/login/page.tsx` — selector now shows full email for all 4 users
- `lib/parsers/rc5Parser.ts` — `derivePrimaryRep` handles Alejandra; simplified multi-rep shared detection

## v0.5.0 — 2026-02-28
All 10 routes complete, full TypeScript pass.

### Added
- `app/accounts/[id]/page.tsx` — Account detail with revenue chart, top wines, KPI strip
- `app/dormant/page.tsx` — Dormant accounts sorted by LTM value, re-engage chips
- `app/focus/page.tsx` — Focus list: Push These / Watch These from RA25 data
- `app/producers/page.tsx` — Producer list with expand-to-wines accordion, search filter
- `app/settings/page.tsx` — BTG threshold, goal multiplier, clear data, version info
- `components/dashboard/AccountRevenueChart.tsx` — BarChart for account detail page

## v0.4.0 — 2026-02-28
Portfolio Explorer complete.

### Added
- `app/portfolio/page.tsx` — 17 saved views, Fuse.js search, URL query params
- `app/portfolio/[code]/page.tsx` — Wine detail: properties, pricing, allocations, open PO
- `lib/buildPortfolioRows.ts` — Join wineProperties + pricing + allocations + openPO (normCode)
- `components/portfolio/WineTypeBadge.tsx` — 8 wine types with color coding
- `components/portfolio/SavedViewChips.tsx` — 17 saved views as clickable chips with counts

## v0.3.0 — 2026-02-28
Dashboard and accounts list.

### Added
- `app/page.tsx` — Dashboard: KPI cards, revenue trend, goal bar, incoming wines
- `app/accounts/page.tsx` — Sortable/filterable accounts list with status pills
- `components/dashboard/RepRevenueChart.tsx` — AreaChart (dynamic, no SSR)
- `components/dashboard/GoalProgressBar.tsx` — Color-coded goal attainment bar
- `components/dashboard/IncomingWinesSection.tsx` — Open POs + Allocations tables

## v0.2.0 — 2026-02-28
Layout shell and upload page.

### Added
- `app/layout.tsx` — Root layout (body, metadata)
- `components/layout/Shell.tsx` — Sidebar + TopBar + main content wrapper
- `components/layout/Sidebar.tsx` — Nav with icons, active state, dormant badge, collapse
- `components/layout/TopBar.tsx` — Greeting, logout button
- `app/upload/page.tsx` — 7 upload zones with drag-drop, status badges, row counts

## v0.1.0 — 2026-02-28
Foundation: project scaffolding, types, parsers, store, auth.

### Added
- `types/index.ts` — All shared types (RepIdentity, Rc5Row, Ra25Row, WinePropertyRow, etc.)
- `lib/parsers/rc5Parser.ts` — RC5 territory revenue parser (adapted from Command Center)
- `lib/parsers/ra25Parser.ts` — RA25 account summary parser
- `lib/parsers/producersParser.ts` — Producers parser
- `lib/parsers/winePropertiesParser.ts` — Wine properties parser (CSV + XLSX)
- `lib/parsers/pricingParser.ts` — Pricing parser
- `lib/parsers/allocationsParser.ts` — Allocations parser
- `lib/parsers/openPOParser.ts` — Open PO parser
- `lib/parsers/parseWineName.ts` — Wine name parser (Producer, Wine, Vintage - CS/BS format)
- `store/index.ts` — Zustand store: DataSlice + SettingsSlice + UiSlice, localStorage persist
- `lib/auth.ts` — HMAC-SHA256 cookie signing/verification (Web Crypto API)
- `middleware.ts` — Edge auth gate: validates rep_session cookie, redirects to /login
- `app/api/auth/login/route.ts` — POST login → set HttpOnly cookie
- `app/api/auth/logout/route.ts` — POST logout → clear cookie
- `app/login/page.tsx` — Login form: rep selector + password
- `app/globals.css` — Tailwind v4 theme (bg, primary, accent, surface, border, text, muted)
