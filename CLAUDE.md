# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build
- `npx tsc --noEmit` — typecheck (no lint or test tooling exists in this repo)

## What this is

Eden Wallet is a personal finance SPA (React 18 + TypeScript + Vite) for a couple tracking three ledgers: **Personal/Ducky (`QWK`)**, **Wife/Monkey (`NXQ`)**, and **Joint (`NXQWK`)** (the `Ledger` enum in `types.ts`). It is offline-first: Supabase is the cloud store when configured, with `localStorage` as mirror and fallback. Deployed on Vercel as a static SPA (`vercel.json` rewrites everything to `index.html`).

Source files live at the repo root (`App.tsx`, `storage.ts`, `types.ts`, `constants.tsx`) plus `components/` — there is no `src/` directory. Note: `Eden-Wallet Project Summary.md` is partly stale (it references `/src/` paths and a Smart Add AI feature that was removed; `@google/genai` is still in `package.json` but unused).

## Architecture

**State lives in `App.tsx`.** It holds transactions for *both* ledgers simultaneously (cross-ledger analytics needs them), the active ledger, and per-ledger `WorkspaceSettings`. Components are props-driven; there is no router, context, or state library. Tabs (`add` / `history` / `analytics` / `settings`) are a simple `AppTab` union switched in `App.tsx`.

**All persistence goes through `dataStorage` in `storage.ts`.** Each operation tries Supabase first (when `isSupabaseConfigured`), and mirrors/falls back to `localStorage` keyed per ledger (`eden_wallet_data_<ledger>`, `eden_wallet_settings_<ledger>`). There is no auth — a hardcoded `SHARED_USER_ID` (all-zeros UUID) is used for every row, which is how both partners share data. Supabase tables: `transactions` and `workspace_settings` (JSONB `settings` column, upsert conflict on `user_id,ledger`).

**Multi-device staleness handling:** `App.tsx` silently re-fetches settings when the settings tab opens and on `visibilitychange`, to avoid one device overwriting another's edits with stale settings. Preserve this behavior when touching settings flow.

**Debt semantics** are encoded in `SystemAccountType` (`types.ts`): each transaction's `account_type` says whether it's own spending, owed to/by the wife (NXQ), or owed to/by the shared fund (NXQWK). Labels/colors/descriptions for these come from `ACCOUNT_CONFIG` in `constants.tsx` but can be overridden per ledger in settings. Categories are a two-level `CategoryMap` (`Record<string, string[]>`).

## Gotchas

- **Env vars:** `supabase.ts` reads `process.env.SUPABASE_URL` / `SUPABASE_ANON_KEY` (no `VITE_` prefix). This works because `vite.config.ts` inlines the *entire* env via `define: { 'process.env': JSON.stringify(env) }`. Don't switch to `import.meta.env` without updating the config, and don't add a prefix filter to `loadEnv`.
- **Tailwind is loaded from the CDN** in `index.html` at runtime, not built (the `tailwindcss` devDependency is unused; there is no `tailwind.config`). Dynamic class strings like `` `bg-${themeColor}-500` `` work only because of this — a build-time Tailwind setup would purge them.
- Theme color is derived from the active ledger: emerald for Personal, indigo for Joint.
- `firebase.ts` is a dead stub kept for import compatibility; Supabase is the only backend.
