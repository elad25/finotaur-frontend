# AUTH FLOW MAP — Finotaur Frontend

Generated 2026-05-02. Read-only static analysis. No edits made.

## Files Analyzed
- `src/providers/AuthProvider.tsx` — context, register/login/logout/google/session
- `src/pages/auth/Register.tsx` — email signup form + Google trigger
- `src/pages/auth/Login.tsx` — email login form + Google trigger
- `src/pages/auth/ForgotPassword.tsx` — request reset email
- `src/pages/auth/ResetPassword.tsx` — set new password after email link
- `src/components/ProtectedRoute.tsx` — auth + subscription gate for /app/*
- `src/integrations/supabase/client.ts` — re-export shim → `@/lib/supabase`
- `src/lib/supabase.ts` — singleton supabase client (storageKey `finotaur-auth-token`)
- `src/hooks/useTimezoneSettings.ts` — auth-gated profile reader
- `src/App.tsx` — route table

**No `AuthCallback.tsx`** — Google OAuth redirects to `/pricing-selection` (App.tsx:324) which `<Navigate to="/onboarding" replace />`. SIGNED_IN handler does post-OAuth profile UPDATE.

## Route Table (auth-relevant)

| Path | Element | Notes |
|------|---------|-------|
| `/login` + `/auth/login` | `<Login />` | Both work |
| `/register` + `/auth/register` | `<Register />` | Both work |
| `/forgot-password` + `/auth/forgot-password` | `<ForgotPassword />` | Both work |
| `/reset-password` + `/auth/reset-password` | `<ResetPassword />` | Both work |
| `/pricing-selection` | `<Navigate to="/onboarding" replace />` | Google OAuth redirect target |
| `/app/*` | `<ProtectedRoute>...</ProtectedRoute>` | Redirects to `/auth/login` if no user |

---

## Flow A — Email Signup Happy Path

**Entry:** User on `/auth/register`, fills form, clicks "Sign Up".

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | Register.tsx:155-184 | Form validation (email/password rules, terms accepted) |
| 2 | Register.tsx:187 | `await register(email, password, name)` |
| 3 | AuthProvider.tsx:294-302 | Check `profiles.email = email` → throw if exists |
| 4 | AuthProvider.tsx:304-312 | `supabase.auth.signUp({ email, password, options.data.display_name })` |
| 5 | (DB) | Trigger `on_auth_user_created` fires → SECURITY DEFINER `handle_new_user()` INSERTs row in `public.profiles` (id, email, display_name, account_type='free') |
| 6 | AuthProvider.tsx:317 | `generateAffiliateCode(name)` — random uniqueness check via `profiles.affiliate_code` SELECT |
| 7 | AuthProvider.tsx:319 | `waitForProfile(authData.user.id)` — polls profiles for 2s @ 250ms intervals |
| 8 | AuthProvider.tsx:326-332 | `UPDATE profiles SET affiliate_code WHERE id = userId` |
| 9 | (Supabase) | If email confirmation disabled → session created → SIGNED_IN event fires |
| 10 | AuthProvider.tsx:194-209 | SIGNED_IN handler: `localStorage.setItem('finotaur_user_id', userId)` + clear `imp_user_data` + (gated) affiliate processing |
| 11 | Register.tsx:190 | `supabase.auth.getUser()` — fetches user from new session |
| 12 | Register.tsx:193 | `saveTermsAcceptance(userId)` → UPDATE `profiles` with `terms_accepted_at` + `terms_version` |
| 13 | Register.tsx:201 | `startGuidedTour()` |
| 14 | Register.tsx:203 | `toast.success('Account created successfully!')` |
| 15 | Register.tsx:92-136 | useEffect re-runs (user changed) → `checkUserStatus` → navigates based on `onboarding_completed` flag |

**State mutations:** `setLoading(true)` before, `setLoading(false)` after. `setUser(session.user)` from SIGNED_IN handler. `setIsLoading(false)` from SIGNED_IN.

**localStorage writes:** `finotaur-auth-token` (Supabase), `finotaur_user_id` (AuthProvider), `pending_terms_*` (Register Google path only).

**UI during loading:** Sign Up button shows `Creating account...`. After success: redirect or `/app/top-secret` (guided tour).

**Failure points:**
- Step 3 throws "already registered" → toast at Register.tsx:209
- Step 4 returns `authError` → catch block at Register.tsx:205 → toast
- Step 7 timeout (2s) → toast "Profile setup taking longer..." (false positive if just slow)
- Step 11 `getUser()` returns null if email confirmation required → terms NOT saved → silent

---

## Flow B — Email Login Happy Path

**Entry:** `/auth/login`, fills email/password, clicks Sign In.

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | Login.tsx:30-32 | If `user` exists → `<Navigate to={from} replace />` (no flicker if user already cached) |
| 2 | Login.tsx:34-52 | Form validation, `setLoading(true)` |
| 3 | Login.tsx:44 | `await login(email, password)` |
| 4 | AuthProvider.tsx:271-289 | `sessionStorage.removeItem('imp_user_data')` + `signInWithPassword` |
| 5 | (Supabase) | Session created → SIGNED_IN event fires |
| 6 | AuthProvider.tsx:194-209 | SIGNED_IN handler runs (same as signup step 10) |
| 7 | Login.tsx:45 | `toast.success('Welcome back!')` |
| 8 | Login.tsx:30 | re-render → `if (user)` → `<Navigate to={from} replace />` |

**Failure points:**
- Wrong password → Supabase returns AuthError → throw → catch at Login.tsx:46 → toast generic `error.message || 'Invalid credentials'`
- No `<Navigate>` if user state hasn't propagated yet — manual flow relies on SIGNED_IN handler updating state

---

## Flow C — Google OAuth Signup (new user)

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | Register.tsx:223-233 | Click "Sign up with Google" → if !termsAccepted, show modal first |
| 2 | Register.tsx:235-252 | `proceedWithGoogleSignIn`: localStorage.setItem('pending_terms_accepted_at', ...) + `startGuidedTour()` + `await signInWithGoogle()` |
| 3 | AuthProvider.tsx:350-373 | `sessionStorage.removeItem('imp_user_data')` + `signInWithOAuth({ provider: 'google', redirectTo: origin + '/pricing-selection' })` |
| 4 | (External) | Supabase redirects to Google OAuth |
| 5 | (External) | Google redirects back to `/pricing-selection?code=...` |
| 6 | (Supabase) | Auto-detects session in URL (`detectSessionInUrl: true` in lib/supabase.ts:30) → SIGNED_IN event |
| 7 | AuthProvider.tsx:198 | `localStorage.setItem('finotaur_user_id', userId)` |
| 8 | AuthProvider.tsx:211-236 | provider==='google' branch: generate affiliate code, `waitForProfile`, UPDATE profile with `affiliate_code` + `display_name` from Google metadata |
| 9 | App.tsx:324 | `/pricing-selection` Route element is `<Navigate to="/onboarding" replace />` |
| 10 | (Onboarding flow) | OnboardingGuard handles next steps |

**Note:** Terms acceptance written to localStorage in step 2, but NOT persisted to DB. No code reads `pending_terms_accepted_at` afterwards. **Dead write — terms never saved for Google signups.**

---

## Flow D — Google OAuth Login (existing user)

Same as Flow C. AuthProvider's profile UPDATE on line 228-234 runs ANYWAY for returning users — overwriting `affiliate_code` and `display_name` every login.

**Implication:** Existing user's affiliate_code gets randomized on every Google login. Existing display_name gets overwritten by Google's `full_name` every login.

---

## Flow E — Password Reset

**Phase 1: Request email**

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | ForgotPassword.tsx:15-40 | Form → `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })` |
| 2 | (Supabase) | Sends email with magic link to `/reset-password#access_token=...` |
| 3 | ForgotPassword.tsx:32 | `setSent(true)` → success UI |

**Phase 2: Click link & set password**

| Step | File:Line | Action |
|------|-----------|--------|
| 4 | (Browser) | User opens email link → arrives at `/reset-password` with token in URL hash |
| 5 | (Supabase) | `detectSessionInUrl: true` parses token → fires PASSWORD_RECOVERY event |
| 6 | ResetPassword.tsx:21-27 | `onAuthStateChange` listener logs "Password recovery mode activated" |
| 7 | ResetPassword.tsx:30-65 | User submits new password → `supabase.auth.updateUser({ password })` |
| 8 | ResetPassword.tsx:52 | `setSuccess(true)` |
| 9 | ResetPassword.tsx:56-58 | `setTimeout(() => navigate('/login'), 2000)` |

**State leak:** ResetPassword.tsx:22 registers `onAuthStateChange` without cleanup — every mount adds a listener. Memory + duplicate handlers if component remounts.

---

## Flow F — Logout

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | (Anywhere) | Call `useAuth().logout()` |
| 2 | AuthProvider.tsx:375-389 | `sessionStorage.removeItem('imp_user_data')` + `supabase.auth.signOut()` |
| 3 | (Supabase) | Clears session, fires SIGNED_OUT event |
| 4 | AuthProvider.tsx:237-258 | SIGNED_OUT handler: clear `_authLoggedOnce` Set + `queryClient.clear()` + `sessionStorage.removeItem('imp_user_data')` + remove `finotaur_user_id`, `finotaur_trades_${userId}`, `finotaur_strategies_${userId}` from localStorage |
| 5 | (Anywhere) | Component re-renders with `user = null` |
| 6 | (ProtectedRoute) | If on `/app/*` → `<Navigate to="/auth/login" />` |

**Dead writes:** Nothing in the codebase writes `finotaur_trades_${userId}` or `finotaur_strategies_${userId}`. Cleanup is a no-op.

---

## Flow G — Session Restore on Page Reload

| Step | File:Line | Action |
|------|-----------|--------|
| 1 | (App boot) | AuthProvider mounts |
| 2 | AuthProvider.tsx:144-148 | Effect runs. `isSubscribedRef.current = false` initially. Set to true. |
| 3 | AuthProvider.tsx:153-180 | `initializeAuth` — `supabase.auth.getSession()` |
| 4 | AuthProvider.tsx:165-170 | If session → `setUser(session.user)`. Else → `setUser(null)`. |
| 5 | AuthProvider.tsx:175-176 | `finally { setIsLoading(false) }` |
| 6 | AuthProvider.tsx:182-262 | Subscribe to `onAuthStateChange` |
| 7 | (Supabase) | Fires INITIAL_SESSION (or SIGNED_IN on some versions) → handler at line 184 runs again |

**Race:** Both `initializeAuth` (step 3) and the auth listener (step 6) call `setUser` independently. Supabase fires SIGNED_IN on initial subscription if there's an active session → SIGNED_IN handler runs the post-signin block (writes `finotaur_user_id`, runs Google profile UPDATE if applicable). On every page reload, Google users get their profile UPDATE re-run (Flow D issue).

**During loading:** `isLoading=true` → ProtectedRoute shows `LoadingSpinner`. Public pages (Login, Register) render normally — Login.tsx:30-32 reads `user` (still null while loading) → renders form briefly even for already-logged-in users → flicker risk.

**Strict Mode:** isSubscribedRef guard at line 144-148 + cleanup at 264-268 → effect runs twice in dev, but only one active subscription. `initializeAuth()` runs twice in dev → 2x `getSession()` calls → benign, last write wins.

---

## localStorage Key Inventory

| Key | Written by | Read by | Cleared by |
|-----|-----------|---------|------------|
| `finotaur-auth-token` | Supabase SDK | Supabase SDK | Supabase signOut |
| `finotaur_user_id` | AuthProvider SIGNED_IN | AuthProvider SIGNED_OUT (only) | AuthProvider SIGNED_OUT |
| `finotaur_trades_${userId}` | **Nobody** | **Nobody** | AuthProvider SIGNED_OUT (no-op) |
| `finotaur_strategies_${userId}` | **Nobody** | **Nobody** | AuthProvider SIGNED_OUT (no-op) |
| `pending_affiliate_code` | **Nobody** | AuthProvider SIGNED_IN (gated, never reached) | AuthProvider SIGNED_IN (gated) |
| `pending_terms_accepted_at` | Register.tsx (Google flow) | **Nobody** | **Nobody** |
| `pending_terms_version` | Register.tsx (Google flow) | **Nobody** | **Nobody** |
| `finotaur_affiliate_code` | AffiliateTracker | useWhopCheckout, useAffiliateDiscount (gated), whop-config | (expiration via `finotaur_affiliate_expires`) |
| `imp_user_data` (sessionStorage) | Admin impersonation | useAuth `effectiveUser` | login/register/logout |
| `user-timezone` | useTimezoneSettings | useTimezoneSettings (fallback only) | Never |

---

## RLS Implications

profiles table — RLS enabled, policies unknown (audit 1b confirmed RLS-on but didn't list policy details).

| Operation | Need policy | Evidence |
|-----------|-------------|----------|
| handle_new_user INSERT | Bypass via SECURITY DEFINER | 64/64 historic signups → policy bypass works |
| waitForProfile SELECT | `id = auth.uid()` SELECT policy | Unknown; if missing, polls fail forever → 2s timeout |
| register() UPDATE (post-trigger) | `id = auth.uid()` UPDATE policy | Unknown; if missing, affiliate_code never set silently |
| Google SIGNED_IN UPDATE | Same | Same |
| useTimezoneSettings SELECT | Same | Has retry via auth-gate guard |

If profiles RLS policies exist (likely — audit 1b only checked policy COUNT not behavior), all flows work. If they DON'T → silent failures across the board.

---

## INCONSISTENCIES (PASS 2)

Cross-referenced against AUTH_FLOW_MAP. No edits made.

### 🔴 CRITICAL (breaks signup/login or causes silent data corruption)

#### C1. Google OAuth re-randomizes affiliate_code on every login
**File:** `src/providers/AuthProvider.tsx:211-235`
**Problem:** SIGNED_IN handler runs `generateAffiliateCode()` and UPDATEs profile UNCONDITIONALLY when `provider === 'google'`. Fires on every page reload (Supabase fires SIGNED_IN on initial subscription if session exists). Returning Google users get a NEW random affiliate_code overwriting their existing one. Their referral links break.
**Fix:** Check if profile already has `affiliate_code` before generating + updating. Only run on first sign-in (when affiliate_code is NULL).

#### C2. Google OAuth overwrites display_name on every login
**File:** `src/providers/AuthProvider.tsx:228-234`
**Problem:** Same UPDATE block sets `display_name` from Google metadata every login. If user manually edited their display_name (via settings), it gets reverted to Google's `full_name` on next login.
**Fix:** Same as C1 — only set on first sign-in.

#### C3. Terms acceptance NOT persisted for Google OAuth signups
**File:** `src/pages/auth/Register.tsx:235-252`
**Problem:** `proceedWithGoogleSignIn` writes `pending_terms_accepted_at` and `pending_terms_version` to localStorage, then calls `signInWithGoogle()`. After OAuth roundtrip, **nothing reads these keys to persist them to the DB.** Google-signup users have `terms_accepted_at = NULL` in profiles forever. Legal/compliance risk.
**Fix:** SIGNED_IN handler (Google branch, line 211-236) should read these localStorage keys and write to profile, then clear them.

### 🟠 HIGH (bad UX or quiet bugs)

#### H1. Login page flicker for already-logged-in users
**File:** `src/pages/auth/Login.tsx:30-32`
**Problem:** Login renders form immediately. `if (user)` Navigate fires only after auth state resolves. While `authLoading=true`, user briefly sees login form even though they're logged in. Register handles this via `checking || user` loader; Login doesn't.
**Fix:** Add `const { user, isLoading: authLoading } = useAuth()` + early loader return when `authLoading`.

#### H2. ResetPassword `onAuthStateChange` listener leak
**File:** `src/pages/auth/ResetPassword.tsx:21-28`
**Problem:** Subscribes to onAuthStateChange in useEffect with no cleanup. Each remount adds a listener. Sonner-toast triggers re-renders → potential listener accumulation.
**Fix:** Capture subscription and `subscription.unsubscribe()` in effect cleanup.

#### H3. Existing-user check race in Register.tsx
**File:** `src/providers/AuthProvider.tsx:294-302` (called from Register flow)
**Problem:** `register()` does `SELECT id FROM profiles WHERE email = $email`. If profile doesn't exist (orphaned auth.users row from past bug, or RLS blocks SELECT for anon role), the check passes → `signUp()` then fails with "User already registered" → caught by catch block → toast OK. But if RLS blocks ANON from SELECTing profiles by email, this check is silently always passing → just relying on `signUp()` to detect duplicates. Not a bug, but a confusing layer.
**Fix:** Either trust `signUp()` (remove the pre-check) or verify RLS allows the SELECT.

#### H4. SIGNED_IN handler runs side effects on EVERY login (not just first)
**File:** `src/providers/AuthProvider.tsx:194-209`
**Problem:** `localStorage.setItem('finotaur_user_id', userId)` + `sessionStorage.removeItem('imp_user_data')` run on every SIGNED_IN. The user_id write is harmless (idempotent). The imp_user_data clear is intentional (kill stale impersonation). But combined with C1/C2, every page reload for Google users does 3 DB writes (affiliate_code lookup, profile UPDATE) for no real reason.
**Fix:** Gate the Google branch on `affiliate_code IS NULL` (covered by C1 fix).

### 🟡 MEDIUM (edge cases)

#### M1. generateAffiliateCode fallback bypasses uniqueness check
**File:** `src/providers/AuthProvider.tsx:113`
**Problem:** After 10 failed unique attempts, returns `'FNT' + 6 random digits` without checking uniqueness. Statistically rare collision but possible. Also: `idx_profiles_affiliate_code` is a UNIQUE index (audit 1c) → INSERT/UPDATE would fail with constraint violation, caller doesn't handle.
**Fix:** Either loop until uniqueness confirmed, or wrap UPDATE in try/catch and retry on 23505.

#### M2. supabase.ts ships `'your-project.supabase.co'` defaults
**File:** `src/lib/supabase.ts:8-14`
**Problem:** If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` missing at build time, the app uses placeholder strings. Network calls fail with cryptic errors instead of a clear "missing config" message.
**Fix:** Throw at module load if env missing.

#### M3. waitForProfile silent failure
**File:** `src/providers/AuthProvider.tsx:319-325`
**Problem:** If polling times out, toast says "Profile setup is taking longer than usual." But trigger is verified to fire synchronously in audit (64/64 historic). So a timeout means RLS is blocking the SELECT, not that the trigger is slow. Misleading user message.
**Fix:** Log distinction in console (`console.error('[Auth] waitForProfile timeout — likely RLS issue, not trigger latency')`).

#### M4. Email confirmation flow not verified
**File:** `src/pages/auth/Register.tsx:187-198`
**Problem:** If Supabase project has email confirmation ENABLED, `signUp` returns `user` but NO session. Then `supabase.auth.getUser()` at Register.tsx:190 returns null → terms acceptance silently NOT saved. Toast still says "Account created successfully!" → user thinks they're done. Email goes to spam → user never confirms → orphan auth.users row, profile exists (trigger fired), terms missing.
**Status:** Cannot verify without checking Supabase project settings. If confirmation is DISABLED → not an issue. If ENABLED → 🔴 CRITICAL.
**Fix:** Either disable email confirmation in Supabase, OR handle the no-session case in Register (show "check your email" UI) AND save terms via a different mechanism.

#### M5. Profile UPDATE failures swallowed silently
**File:** `src/providers/AuthProvider.tsx:327-333` (register), `228-234` (Google), `Register.tsx:30-43` (terms)
**Problem:** UPDATEs don't check `error` from response. If RLS blocks the UPDATE, no error is shown to user. They proceed thinking it worked.
**Fix:** Check `{ error }` from each UPDATE; log + (optionally) toast on failure.

### ⚪ LOW (cosmetic / dev-only)

#### L1. Dead localStorage cleanup
**File:** `src/providers/AuthProvider.tsx:253-258`
**Problem:** Cleans `finotaur_trades_${userId}` and `finotaur_strategies_${userId}` on signout, but no code writes these keys. Pure no-op.
**Fix:** Remove the cleanup.

#### L2. `finotaur_user_id` localStorage barely used
**File:** `src/providers/AuthProvider.tsx:198, 253-257`
**Problem:** Written on SIGNED_IN, read only by SIGNED_OUT cleanup of itself. No external reader. Could be derived from `user.id` via context.
**Fix:** Remove write + read.

#### L3. supabase.ts ships dev console logs
**File:** `src/lib/supabase.ts:17-19`
**Problem:** Production users see "🔑 [Supabase Init]" + URL + key prefix in browser console. Minor info disclosure (key is anon, intended public).
**Fix:** Wrap in `if (import.meta.env.DEV)`.

#### L4. Inconsistent route prefixes
**Files:** `Login.tsx:122` (links `/forgot-password`), `Register.tsx:598` (links `/auth/login`), `ResetPassword.tsx:57` (navigates `/login`), `ForgotPassword.tsx:47, 116` (links `/login`)
**Problem:** Mix of `/X` and `/auth/X`. Both work because App.tsx defines both. Just inconsistent.
**Fix:** Pick one convention.

#### L5. `pending_affiliate_code` dead path
**File:** `src/providers/AuthProvider.tsx:204-208`
**Problem:** Reads localStorage key that nobody writes. Gated by `FEATURES.AFFILIATE_TRACKING=false` so doesn't fire. Documented in plan v4 LAYER 7.
**Fix:** When re-enabling affiliate flag, fix to read `finotaur_affiliate_code` instead.

#### L6. Strict-mode initializeAuth runs twice in dev
**File:** `src/providers/AuthProvider.tsx:153-180`
**Problem:** isSubscribedRef guard prevents double subscribe, but `initializeAuth()` itself runs twice in dev (once per effect call before cleanup). Two `getSession()` calls. Last write wins. Production: 1x.
**Fix:** Move initializeAuth inside the isSubscribedRef guard so it only runs once. Wait — it IS inside the guard already (line 144-148). Re-reading... the guard `if (isSubscribedRef.current) return` is at top of effect. After cleanup unsubscribes AND sets ref=false (line 264-268), the next effect run will pass the guard. So in strict mode: mount → ref=false → ref=true → init runs → cleanup → ref=false → second mount → ref=false → ref=true → init runs AGAIN. Yes 2x in dev. Benign but wastes a getSession call.

---

## CLASSIFICATION SUMMARY

| Severity | Count | IDs |
|----------|-------|-----|
| 🔴 Critical | 3 | C1, C2, C3 |
| 🟠 High | 4 | H1, H2, H3, H4 |
| 🟡 Medium | 5 | M1, M2, M3, M4, M5 |
| ⚪ Low | 6 | L1, L2, L3, L4, L5, L6 |

**M4 elevates to 🔴 if Supabase email confirmation is ENABLED — needs verification.**

