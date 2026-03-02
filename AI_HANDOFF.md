# AI Handoff Document

This document serves as the persistent state, context, and architectural guide for AI assistants (Gemini, Claude, Cursor, etc.) working on the **Chausse Rep Field Tool** project. Update this file as the architecture, state, or key principles evolve.

## Project Context
- **Name**: Chausse Rep Field Tool
- **Purpose**: A mobile-first, tablet-friendly web application for sales representatives in the field to track account revenue, analyze portfolio gaps, manage inventory, and identify sales opportunities based on Vinosmith CRM data.
- **Tech Stack**: React 18, Next.js 14+ (App Router), Tailwind CSS, Recharts, Zustand (State Management), Lucide React (Icons).
- **Deployment**: Vercel (Auto-deploys from the main Git branch).

## Core Architecture & Guidelines

### 1. Styling & UI Design (v0.6.0 Standard)
- **Tailwind CSS ONLY**: As of v0.6.0, all React inline styles (`style={{...}}`) have been migrated to Tailwind CSS utility classes. **Do not use inline styles.**
- **Design System**: Rely on defined CSS variables in `app/globals.css` via Tailwind classes (e.g., `bg-surface`, `text-text`, `text-muted`, `border-border`, `bg-primary`).
- **Mobile-First & Responsiveness**: Reps use this tool in the field (often 1-handed on a tablet or phone). Use the responsive Layout (`components/layout/Shell.tsx`), which implements a Bottom Tab Bar on mobile and Left Rail Nav on desktop. 
- **Dark Mode**: The application fully supports a seamless light/dark mode based on system preferences. In dark mode, avoid pure black (`#000000`), using the deep brand green (`#0A0E0B`) and glassy panels instead.
- **Data Visualization**: Follow Tufte's principles (high data-ink ratio, minimal chartjunk, soft shadows for tooltips, no heavy gridlines). Colors in charts and progress bars must be explicitly mapped to brand variables, not default loud tones, unless conveying specific critical alerts.

### 2. State & Data Handling
- **Zustand**: Global state and data persistence (from uploaded Excel/CSV files) are managed via `store.ts`. 
- **Local Browser Storage**: Heavy datasets (RC5, RA25, Portfolio) are parsed client-side using `xlsx` or `papaparse` and kept locally in the browser. 
- **Parsing**: Parsers are organized in `lib/parsers/`. Ensure robust error handling (Returning `data`, `errors`, `rowCount`) so the `UploadPage` can display feedback properly.

### 3. Routing & Next.js
- **App Router**: Uses `app/` directory with standard Next.js conventions (`page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`).
- **Graceful Failures**: Assume data might be missing (user hasn't uploaded it yet). Always provide fallback UI telling them to visit the `/upload` route. Wrap dynamic pages in proper boundary states.

## Current State (Post v0.6.1)
- **Completed**: Comprehensive UI rewrite to Tailwind CSS, introducing a fully functional Dark Mode, responsive navigation (Bottom Bar / Rail Nav), and layout polish across Dashboard, Accounts, Portfolio, Focus, Dormant, Settings, and Upload routes. This was merged seamlessly onto the newest features like the Integration page and PDF extractors.
- **Next Steps / Roadmap**: 
  - (Add future goals or specific feature requests here)

---
*Last Updated: March 1, 2026*
