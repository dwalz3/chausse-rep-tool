# Changelog — Chausse Rep Field Tool

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
