# Frontend — React + TypeScript

> Loaded in addition to root CLAUDE.md when working in `./frontend`.
> Do not repeat rules already in the root file.

---

## Language & Localization — STRICT

- **Every user-facing string must be in English.** No Hebrew. Not in JSX, not in alt text, not in toast messages, not in error fallbacks.
- If you see a Hebrew string anywhere in the frontend code — flag it as a bug.
- The Hebrew trading mentorship / course is a SEPARATE product surface, not the SaaS app. Don't confuse them.

---

## TypeScript Rules

- Strict mode required. No `any`. Prefer `unknown` + narrowing.
- No `@ts-ignore` without a comment explaining why.
- Public function signatures: explicit return types.
- Prefer `type` for unions/primitives, `interface` for object shapes that may extend.

---

## Component Conventions

- Functional components only. No class components.
- Hooks for state. Reach for Zustand/Context only when prop drilling exceeds 3 levels.
- Co-locate component + styles + types in the same folder.
- No inline styles unless dynamic.

### Before creating a new component
1. Search for an existing one that's 80% similar — extend it instead.
2. Ask me before adding to the design system.

---

## Data Fetching — The Cache Boundary

This is where most token + API waste happens on the frontend.

### Mandatory rules
- **All API calls go through one client wrapper.** Find it before adding a new one. If it doesn't exist, ASK before creating.
- **Use React Query (TanStack Query) for server state.** Never raw `fetch` in `useEffect`.
- **Default `staleTime`: 5 minutes.** For static data (company names, ticker lists): 1 hour.
- **`refetchOnWindowFocus: false`** by default. Override with reason.
- **Never call Polygon / Perplexity directly from frontend.** Always through backend (`/api/*`). The frontend has no API keys.

### Query key conventions
```ts
// Global data (shared across users) — no user_id in key
['ticker', 'AAPL', 'price']
['ticker', 'AAPL', 'fundamentals']

// Per-user data — user_id in key
['user', userId, 'watchlist']
['user', userId, 'portfolio']
```

### Suspense / Loading
- Skeleton loaders, not spinners, for known shapes.
- Use Suspense boundaries at route level, not per-component.

---

## Real-time Updates (Future)

When we move from 15-min delayed to live prices:
- WebSocket subscription handled in backend, fanned out via Supabase Realtime channels.
- Frontend subscribes to channel by ticker, NOT polls API.
- Don't suggest socket-from-frontend solutions — they don't scale to 10K users.

---

## Performance Discipline

- `useMemo` / `useCallback` only when measurably needed. Don't sprinkle them.
- Lazy-load routes (`React.lazy`).
- Bundle analyzer should run in CI eventually — note when it's missing.
- Charts: prefer one chart library across the app. Don't add a second one without asking.

---

## What to flag immediately

- A Hebrew string in code
- An API call from frontend to a third party (Polygon/Perplexity) directly
- A `useEffect` with `fetch` instead of React Query
- A duplicate API client wrapper
- A new chart/UI library being added