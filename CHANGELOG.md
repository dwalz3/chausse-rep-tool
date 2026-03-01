# Changelog — Chausse Rep Field Tool

## v1.0.1 — 2026-03-01
RC3 PDF support: Vinosmith RC3 exports as PDF only; parser now handles both PDF and XLSX.

### Added
- `lib/parsers/pdfTableExtractor.ts` — generic PDF → string[][] extractor using pdfjs-dist; groups text items by Y position (4px tolerance), sorts by X for column order
- `pdfjs-dist@3.11.174` dependency

### Changed
- `lib/parsers/rc3Parser.ts` — detects `.pdf` extension; uses pdfTableExtractor for PDF files, XLSX path unchanged; CDN worker URL for pdfjs
- `app/upload/page.tsx` — RC3 zone now accepts `.pdf,.xlsx,.xls`
- `app/integrations/page.tsx` — RC3 description notes "Exports as PDF only"; upload input accept changed to `.pdf,.xlsx,.xls` for RC3 card

## v1.0.0 — 2026-03-01
Data Infrastructure Overhaul: 7 new report parsers, Integrations page, Territory Map, rewired Focus/Account Detail/Portfolio/Dormant pages, DataStatus sidebar widget.

### Added
- `types/reports.ts` — Ra23Data, Ra21Data, Ra27Data, Rb6RepData, Ra30Data, Rc3Data, Ra3Data interfaces (all 7 new report types)
- `types/integrations.ts` — RepSyncKey, RepSyncEntry, RepSyncStatus interfaces
- `lib/parsers/ra23Parser.ts` — RA23 "Account + Wine Detail" parser (row-level account × wine × revenue; the correct replacement for RA25 wine detail)
- `lib/parsers/ra21Parser.ts` — RA21 "Top Wines Sold" ranked list parser; assigns rank from row order if no rank column
- `lib/parsers/ra27Parser.ts` — RA27 "Points of Distribution" parser; builds byWineCode plain Record for localStorage compat
- `lib/parsers/rb6RepParser.ts` — RB6 Velocity + Inventory parser; computes isLowStock (<12 btl), isCritical (<6 btl), isOutOfStock; builds byWineCode Record
- `lib/parsers/ra30Parser.ts` — RA30 "New Placements" parser; computes daysAgo, recentPlacements (<=90d), byWineCode map
- `lib/parsers/rc3Parser.ts` — RC3 "Unloved Accounts" parser; computes priorityScore = ltmRevenue / log(daysSinceOrder+1), sorted descending
- `lib/parsers/ra3Parser.ts` — RA3 "Period Comparison" parser; computes trend (Growing/Stable/Declining/New/Lost), extracts period labels from header rows
- `app/api/integrations/sync/route.ts` — server proxy for Vinosmith report downloads (VINOSMITH_UUID never reaches browser)
- `app/integrations/page.tsx` — 9-card sync UI in 2-column grid; "Sync Now" + "Upload file" fallback per card; staleness indicators; RA25 legacy notice
- `components/layout/DataStatus.tsx` — sidebar footer widget with 5 colored dots (RC5, RA23, RA21, RA27, RB6) + "Sync missing data →" link
- `app/territory-map/page.tsx` — category heatmap: top 40 accounts × wine types; filled cell = ordered; sort by Revenue/Alpha/Gaps; category toggles; hover tooltip

### Changed
- `types/index.ts` — UploadKey union: added ra23, ra21, ra27, rb6, ra30, rc3, ra3
- `store/index.ts` — DataState: 7 new data fields + syncStatus; 7 new setter actions + setSyncStatus; partialize + quota handler updated; imports from types/reports and types/integrations
- `app/upload/page.tsx` — 8 primary report zones (RC5, RA23, RA21, RA27, RB6, RA30, RC3, RA3) + 6 reference data zones + RA25 moved to Legacy section with warning
- `components/layout/Sidebar.tsx` — added Integrations and Territory Map nav items; added DataStatus widget above collapse toggle
- `app/focus/page.tsx` — rewired to RA21 "Push These" + "Expand These" + RA30 "New Placements" + RA3 "Watch List" sections with TalkingPointChips; RB1 velocity table retained as fallback; amber banner when RA23 missing
- `app/accounts/[id]/page.tsx` — Top Wines now prefers RA23 over RA25; added "Suggest These Next" section from RA21 (wines not yet ordered by this account, top 5 by rank)
- `app/portfolio/page.tsx` — Accts column prefers RA27 byWineCode over RA25 accountCount; Inventory column uses RB6 color warnings (Out=red badge, Critical=red text, Low=amber text, Normal=green)
- `app/dormant/page.tsx` — RC3 priority overlay on account names (VS High/Med badges); sort by RC3 priorityScore when RC3 data loaded; RC3-only accounts sub-section
- `app/page.tsx` — Focus card enhanced with RA21 top wine name + revenue; New Placements card (RA30, last 90 days)

## v0.9.8 — 2026-02-28
Focus List powered by RB1 velocity data (qty sold last 30 days).

### Changed
- `app/focus/page.tsx` — when RB1 inventory is uploaded, Focus List shows "Top Movers — Last 30 Days" table driven by `qtySoldLast30Days`; columns: #, Type, Wine (name + producer/country sub-row), Price/btl, Sold (30d), Available; KPIs: Active SKUs, Btl Sold (30d), Active Accounts, In Stock; falls back to RA25 wine-detail path if RB1 not loaded

### Added
- `types/index.ts` — `InventoryRow.qtySoldLast30Days?: number`
- `lib/parsers/rb1Parser.ts` — detects and extracts `'qty sold: last 30 days'` column as `qtySoldLast30Days` on each `InventoryRow`

## v0.9.7 — 2026-02-28
Focus List: stop showing importers as wines; RA25 debug panel; diagnostic message for summary-only files.

### Fixed
- `lib/parsers/ra25Parser.ts` — removed importer fallback from `wineTotals` aggregation; rows with no `wineName`/`wineCode` are now skipped entirely; `hasWineData=false` now produces empty `wineTotals` instead of importer-grouped fake wine rows
- `app/focus/page.tsx` — same fix in per-rep wine filter: `row.wineName || row.importer` → `row.wineName || ''`; rows with no wine identity skipped; new `noWineDetail` state shows an amber diagnostic message when RA25 is loaded but has no wine columns (tells user to export RA25 "Detail" view from Vinosmith)

### Added
- `lib/parsers/ra25Parser.ts` — returns `allHeaders`, `detectedWineNameCol`, `detectedWineCodeCol`, `hasWineDetail` for debugging
- `app/upload/page.tsx` — RA25 upload zone now shows debug panel with detected wine name col (teal), wine code col (yellow), and all column headers

## v0.9.6 — 2026-02-28
Varietal column detection fix; sortable portfolio columns.

### Fixed
- `lib/parsers/winePropertiesParser.ts` — added `'varietal'` to VARIETAL column search keywords; dedupe guard (`colVarietalFinal`) already prevents it from clashing when the same column was matched by TYPE (e.g. old Vinosmith files where Varietal = Red/White)

### Added
- `app/portfolio/page.tsx` — sortable columns: click any column header to sort asc, click again for desc; active column gets green bottom border + ↑/↓ indicator; sort state: `sortKey`, `sortDir`; `displayRows` memo applies sort on top of filtered rows; resize-handle click blocked from triggering sort via `e.stopPropagation()`; `getSortValue()` helper + `SortKey` type added outside component

## v0.9.5 — 2026-02-28
RB1 parser: fix inventory column to use "available"; pull default/fob price from same sheet.

### Fixed
- `lib/parsers/rb1Parser.ts` — inventory column now prioritises `'available'` (Vinosmith's bottle-available column) over all other keywords; removed `'qty'` and `'quantity'` from column search (were matching `qty sold: last 30 days`); cases fallback also removes those broad terms; added `colDefaultPrice` (`default price`, `retail price`) and `colFobPrice` (`fob price`, `fob`) extraction; `detectedPriceCol` added to `Rb1ParseResult`; pricing fields stored as `defaultPrice?`/`fobPrice?` on each `InventoryRow`

### Added
- `types/index.ts` — `InventoryRow.defaultPrice?: number`, `InventoryRow.fobPrice?: number`
- `lib/buildPortfolioRows.ts` — inventory map stores pricing fields; `bottlePrice` falls back to `inv?.defaultPrice` when no dedicated pricing file loaded; same for `fobPrice`
- `app/upload/page.tsx` — RB1 debug panel now shows "Inv col:" (teal, formerly "Price col:") and "Price col:" separately when both detected; `allHeaders` highlights inv col in teal, price col in green, code col in yellow; updated zone hint text

## v0.9.4 — 2026-02-28
Inventory shown in bottles; varietal detection fix; in-stock filter toggle.

### Fixed
- `lib/parsers/winePropertiesParser.ts` — restored `'varietal'` and `'grape'` to TYPE column keywords (end of list); VARIETAL column now only matches unambiguous terms (`'grape variety'`, `'grape varietal'`, `'variety'`, `'varieties'`, `'blend'`, `'composition'`, `'grapes'`); added dedupe: `colVarietalFinal` = -1 if it matched same column as type
- `lib/parsers/rb1Parser.ts` — `resolve()` call now includes `allHeaders: headers` and `detectedBottlesCol`; `fail()` now includes those fields too; column detection uses `colTotalBottles` (preferred direct-bottles col) vs `colCases + colLooseBottles`
- `lib/buildPortfolioRows.ts` — computes `inventoryTotalBottles = casesOnHand × caseSize + bottlesOnHand` (defaults caseSize to 12 when unparseable); uses `inv` variable to avoid repeated map lookups
- `types/index.ts` — `PortfolioRow.inventoryTotalBottles: number` added

### Changed
- `app/portfolio/page.tsx` — Inventory cell now shows `inventoryTotalBottles` as "X btl" (not cases); when `inventoryData` is loaded, table defaults to showing only in-stock wines; toggle button "Show all N wines" / "In-stock only" added beside wine count; "· in stock" label when filtered
- `app/upload/page.tsx` — RB1 inventory zone debug panel now shows `allHeaders` (all detected column headers), same as pricing zone

## v0.9.3 — 2026-02-28
RB1 inventory upload; portfolio Inventory column shows real stock.

### Added
- `lib/parsers/rb1Parser.ts` — new parser for RB1 Inventory by Supplier Excel report; score-based header detection; detects item code, cases on hand, loose bottles columns; filters subtotal/grand total rows; emits `InventoryRow[]`
- `types/index.ts` — `InventoryRow` interface; `inventoryCases`/`inventoryBottles` added to `PortfolioRow`; `'inventory'` added to `UploadKey`
- `store/index.ts` — `inventoryData: InventoryRow[] | null` + `setInventoryData` action; wired into partialize + quota handler
- `lib/buildPortfolioRows.ts` — optional `inventoryData` param; builds `inventoryMap`; `inventoryCases`/`inventoryBottles`/`stockCases` all resolve from RB1 data
- `app/upload/page.tsx` — RB1 — Inventory by Supplier upload zone; uses rb1Parser; shows code col + cases col in debug panel
- `app/portfolio/page.tsx` — Inventory cell shows real stock in green ("X cs + Y btl") from RB1, plus incoming open POs in blue ("+X on order")

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
