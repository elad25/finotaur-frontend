# AUTH AUDIT FINDINGS — Deferred Issues

Generated 2026-05-02. Critical fixes applied in same session (see C1, C2, C3 below).
All other findings deferred — listed for next iteration.

## FIXED THIS SESSION

### ✅ C1 — Google OAuth re-randomizes affiliate_code on every login
**File:** `src/providers/AuthProvider.tsx:211-265` (post-fix)
**Fix applied:** Added first-sign-in gate via `SELECT affiliate_code FROM profiles`. UPDATE only runs if `affiliate_code IS NULL`.

### ✅ C2 — Google OAuth overwrites display_name on every login
**File:** Same block.
**Fix applied:** Same gate covers display_name (only set on first sign-in).

### ✅ C3 — Terms acceptance not persisted for Google signups
**File:** Same block.
**Fix applied:** Read `pending_terms_accepted_at` + `pending_terms_version` from localStorage in same first-sign-in block. Write to profile (if `terms_accepted_at IS NULL`). Clear localStorage keys on success.

**Side benefit:** Added error checking on the UPDATE (partially addresses M5).

---

## DEFERRED FINDINGS

### 🟠 H1 — Login page flicker for already-logged-in users
**File:** `src/pages/auth/Login.tsx:30-32`
**Description:** Login renders form immediately, ignoring `authLoading`. Brief form flash for users with active sessions.
**Suggested fix:**
```tsx
const { user, login, signInWithGoogle, isLoading: authLoading } = useAuth();
if (authLoading) return <LoadingSpinner />;  // before the if(user) check
```
**Why deferred:** Cosmetic flicker, not a launch blocker. Bundle with general loading UX pass.

### 🟠 H2 — ResetPassword onAuthStateChange leak
**File:** `src/pages/auth/ResetPassword.tsx:21-28`
**Description:** Subscribes without cleanup. Listener accumulates on remount.
**Suggested fix:**
```tsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      console.log('Password recovery mode activated');
    }
  });
  return () => subscription.unsubscribe();
}, []);
```
**Why deferred:** Page is rarely remounted in practice (single-use flow). Real-world impact minimal.

### 🟠 H3 — Existing-user check race in Register
**File:** `src/providers/AuthProvider.tsx:294-302`
**Description:** Pre-`signUp` SELECT can be silently blocked by RLS if anon role can't read profiles by email. Layer is redundant since `signUp` itself detects duplicates.
**Suggested fix:** Either confirm RLS allows the SELECT for anon role, OR remove the pre-check and trust `signUp`'s "User already registered" error.
**Why deferred:** Current behavior is correct (just redundant). Only matters if SELECT actually broken — then `signUp` catches the case anyway.

### 🟠 H4 — SIGNED_IN runs side effects on every login
**File:** `src/providers/AuthProvider.tsx:194-209`
**Description:** Writes `finotaur_user_id` + clears imp_user_data on every login. Combined with C1/C2 (now fixed), Google branch no longer does redundant DB writes. localStorage write is idempotent — harmless. **Largely resolved by C1/C2 fix.**
**Why deferred:** Already mitigated by critical fixes.

### 🟡 M1 — generateAffiliateCode fallback skips uniqueness check
**File:** `src/providers/AuthProvider.tsx:113`
**Description:** After 10 random attempts fail uniqueness, returns `'FNT' + 6 digits` blindly. UNIQUE index `profiles_affiliate_code_key` (audit 1c) would reject collisions → caller doesn't handle.
**Suggested fix:**
```tsx
// In the calling UPDATE site, wrap:
try { await update(); } catch (e) {
  if (e.code === '23505') { /* retry with new code */ }
}
```
**Why deferred:** With 10000 random attempts in a 50-char namespace, probability of needing fallback is ~10^-37 for first 10k users. Not a launch blocker.

### 🟡 M2 — supabase.ts default placeholder values
**File:** `src/lib/supabase.ts:8-14`
**Description:** Falls back to `'https://your-project.supabase.co'` and `'your-anon-key'` if env vars missing. Cryptic failure mode.
**Suggested fix:**
```tsx
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
```
**Why deferred:** Build env is verified before launch (LAYER 6 pre-launch checklist). Defensive but not urgent.

### 🟡 M3 — waitForProfile timeout toast misleading
**File:** `src/providers/AuthProvider.tsx:319-325` (register), `220-226` (Google)
**Description:** Says "trigger may have failed". With 64/64 historic success, real cause of timeout would be RLS blocking SELECT.
**Suggested fix:** Add `console.error` with clearer diagnosis.
**Why deferred:** Hasn't actually triggered in production (audit shows trigger works). Fix only if observed.

### 🟡 M4 — Email confirmation flow not verified
**File:** `src/pages/auth/Register.tsx:187-198`
**Description:** If Supabase project has email confirmation ENABLED, `signUp` returns no session → `getUser()` after register returns null → terms NOT saved for email signups (mirrors fixed C3 for Google). User sees success toast, but profile lacks `terms_accepted_at`.
**Status:** **Cannot verify without checking Supabase project settings.** Elevates to 🔴 if enabled.
**Suggested fix:**
1. Check Supabase Dashboard → Authentication → Email Auth → "Confirm email" setting
2. If ENABLED:
   - Show "check your email" UI in Register after signUp
   - Move terms persistence to a SIGNED_IN handler block (mirror Google fix C3)
   - Consider adding a `pending_terms_*` localStorage write before signUp
**Why deferred:** Needs Supabase config check before deciding action.

### 🟡 M5 — Profile UPDATE failures swallowed silently (multiple sites)
**File:** Multiple — `AuthProvider.tsx:327-333`, `Register.tsx:30-43`
**Description:** `.update()` calls don't check `{ error }`. If RLS blocks UPDATE, user sees "success" but profile didn't change.
**Suggested fix:** Add `if (error) { console.error(...); toast.error(...) }` to every UPDATE.
**Why deferred:** Partially fixed in Google branch (C1-C3 fix added error check). Should be applied to email signup register() and saveTermsAcceptance.

### ⚪ L1 — Dead localStorage cleanup
**File:** `src/providers/AuthProvider.tsx:253-258`
**Description:** Cleans `finotaur_trades_${userId}` and `finotaur_strategies_${userId}` — no code writes these keys.
**Suggested fix:** Remove the cleanup loop.
**Why deferred:** Harmless dead code. Bundle with future cleanup.

### ⚪ L2 — finotaur_user_id barely used
**File:** `src/providers/AuthProvider.tsx:198, 253-257`
**Description:** Written on SIGNED_IN, only read by SIGNED_OUT cleanup of itself. Could be derived from `user.id` via context.
**Suggested fix:** Remove write + read.
**Why deferred:** Harmless. Future cleanup.

### ⚪ L3 — supabase.ts dev console logs in prod
**File:** `src/lib/supabase.ts:17-19`
**Description:** Production users see "🔑 [Supabase Init]" in console with URL + key prefix.
**Suggested fix:** Wrap in `if (import.meta.env.DEV) {...}`.
**Why deferred:** Anon key is intended public; minor info disclosure.

### ⚪ L4 — Inconsistent route prefixes
**Files:** Multiple navigation calls — mix of `/login` and `/auth/login`.
**Description:** Both work because App.tsx defines both. Just inconsistent.
**Suggested fix:** Pick one convention, update all navigations.
**Why deferred:** Both routes resolve. Cosmetic.

### ⚪ L5 — pending_affiliate_code dead path
**File:** `src/providers/AuthProvider.tsx:204-208`
**Description:** Reads localStorage key nobody writes. Already gated by `FEATURES.AFFILIATE_TRACKING=false`.
**Suggested fix:** When re-enabling affiliate flag (LAYER 7), fix to read `finotaur_affiliate_code`.
**Why deferred:** Already in plan v4 LAYER 7 roadmap.

### ⚪ L6 — Strict-mode initializeAuth runs twice in dev
**File:** `src/providers/AuthProvider.tsx:153-180`
**Description:** Effect runs twice in React Strict Mode dev. `initializeAuth()` makes 2 `getSession()` calls. Production: 1x. Benign.
**Suggested fix:** Move initializeAuth into a useRef check that runs once across both strict-mode mounts.
**Why deferred:** Dev-only, no prod impact.
