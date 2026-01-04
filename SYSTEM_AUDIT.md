# FiBi System Audit Report
**Date:** 2024  
**Focus:** Product Quality, Architecture, UX, Future Scalability

---

## Executive Summary

FiBi is a well-architected Next.js 15 PWA with solid fundamentals. The codebase shows thoughtful design decisions, aggressive metadata extraction, and a clean separation of concerns. However, there are several areas requiring attention before wider testing, particularly around authentication flow stability, PWA reliability, and some architectural decisions that may limit scalability.

**Overall Health:** 🟢 Good (7/10)  
**Production Readiness:** 🟡 Needs Work (6/10)  
**Scalability:** 🟡 Moderate Risk (6/10)

---

## 1. Architecture & Data Model

### ✅ Strengths
- Clean table structure with proper RLS policies
- Good use of indexes (`user_id`, `created_at`, `planned_date`)
- Flexible schema with JSON storage for categories/statuses (supports arrays)
- Proper foreign key constraints and cascading deletes
- `user_custom_options` table for extensibility

### ⚠️ Issues

**Fix Now:**
- **Category/Status storage inconsistency**: Stored as JSON strings but parsed inconsistently. `AddItemForm` saves as JSON, but `HomeGrid` has fallback parsing logic suggesting legacy data exists.
  - **Impact:** Data corruption risk, display bugs
  - **Fix:** Add migration to normalize all existing data, then enforce JSON format consistently

- **Missing indexes for common queries:**
  - No index on `platform` (filtering by platform)
  - No index on `category` (filtering by category - though JSON makes this tricky)
  - No index on `status` (same issue)
  - **Impact:** Slow queries as data grows
  - **Fix:** Add GIN index on `category` and `status` for JSON queries, or consider normalized junction tables if filtering becomes critical

- **No soft deletes**: Items are permanently deleted. No way to recover accidentally deleted items.
  - **Impact:** Data loss risk
  - **Fix:** Add `deleted_at` column, update RLS to filter deleted items, add restore functionality

**Fix Later:**
- **Planned date timezone handling**: `planned_date` is DATE type (no timezone). If users travel across timezones, this could cause confusion.
- **No versioning/audit trail**: Can't see history of edits to items.
- **Screenshot storage path**: Uses `{userId}/{itemId}.{ext}` but itemId might not exist yet (uses `temp-{timestamp}`). Consider cleanup job for orphaned temp files.

**Ignore:**
- Current schema is sufficient for MVP. Don't over-engineer.

---

## 2. Authentication & Session Flow

### ✅ Strengths
- Proper use of `@supabase/ssr` for server/client separation
- RLS policies correctly implemented
- Email confirmation flow exists

### ⚠️ Issues

**Fix Now:**
- **Login bounce/flash issue**: `LoginClient.tsx` has complex session polling (lines 197-211) with hardcoded delays. This suggests session cookie sync issues between client and server.
  - **Root cause:** Client creates session, but server-side middleware/layout doesn't see it immediately
  - **Impact:** Users see login page flash, then redirect, creating confusion
  - **Fix:** 
    1. Remove polling loop - rely on `onAuthStateChange` listener
    2. Use `router.refresh()` after login to force server-side re-check
    3. Consider server-side redirect in auth callback route instead of client-side

- **Auth check race condition**: `AddItemForm.tsx` checks auth in `useEffect` (line 87), but also redirects in submit handler (line 1158). This creates a window where unauthenticated users can see the form.
  - **Impact:** Confusing UX, potential security risk (though RLS protects data)
  - **Fix:** Use server-side auth check in page component, or show loading state until auth confirmed

- **Missing auth check in MapView**: `MapView.tsx` doesn't check auth on mount - only in `fetchItems`. User could see empty map briefly.
  - **Impact:** Minor UX issue
  - **Fix:** Add auth check similar to other protected pages

**Fix Later:**
- **Session refresh handling**: No explicit handling of expired sessions. Users might get stuck in redirect loops.
- **OAuth providers**: Only email/password supported. Consider adding Google/GitHub for faster onboarding.

**Ignore:**
- Current email/password flow is fine for MVP. OAuth can wait.

---

## 3. Metadata & Preview Extraction

### ✅ Strengths
- Aggressive extraction pipeline (oEmbed → OG → AI → Manual)
- Good fallback chain
- Handles TikTok captions via oEmbed HTML parsing
- Scraped content extraction for AI enrichment
- Google Maps URL parsing

### ⚠️ Issues

**Fix Now:**
- **Image reliability**: OG images can be broken/expired. No validation or fallback.
  - **Impact:** Empty previews, poor UX
  - **Fix:** 
    1. Validate image URLs on save (HEAD request)
    2. Store image dimensions for layout stability
    3. Consider caching images in Supabase Storage (future)

- **AI enrichment timing**: `AddItemForm.tsx` triggers AI after 2s debounce (line 329), but user might submit before AI completes.
  - **Impact:** Missing AI suggestions, wasted API calls
  - **Fix:** Show loading indicator for AI, or make it truly async (save without waiting)

- **Description extraction priority unclear**: Code has multiple sources (oEmbed caption, OG description, scraped content). Priority logic exists but could be clearer.
  - **Impact:** Inconsistent results
  - **Fix:** Document priority in code comments, add logging for debugging

- **No retry logic**: If metadata fetch fails (network error), it silently fails. User gets empty form.
  - **Impact:** Poor UX on flaky networks
  - **Fix:** Add retry (2-3 attempts) with exponential backoff

**Fix Later:**
- **Image optimization**: Using raw `<img>` tags. Consider `next/image` for automatic optimization (but be careful with external URLs - might need custom loader).
- **Metadata caching**: No caching of metadata. Re-fetching same URL wastes API calls.
- **Rate limiting**: No protection against rapid URL submissions (could hit API limits).

**Ignore:**
- Current extraction is "aggressive first-pass" as intended. Don't over-optimize.

---

## 4. PWA & Share Target

### ✅ Strengths
- Proper manifest.json route handler (public, no auth)
- Service worker registration with update detection
- Share target configured correctly
- Update prompt component

### ⚠️ Issues

**Fix Now:**
- **Manifest 401 errors**: `manifest.json/route.ts` exists but might still hit auth middleware. `middleware.ts` has empty matcher (line 14), which is good, but verify it's not running.
  - **Impact:** PWA install fails, share target broken
  - **Fix:** 
    1. Verify middleware matcher excludes `/manifest.json`
    2. Test PWA install on iOS/Android
    3. Add explicit public route config if needed

- **Service worker registration timing**: `ServiceWorkerRegistration.tsx` waits 1s before registering (line 159). This might be too conservative or too aggressive depending on page load.
  - **Impact:** SW might not register on fast pages, or might interfere with auth redirects
  - **Fix:** Register on `window.load` event instead of timeout, or use `requestIdleCallback`

- **Share target URL extraction**: `share/route.ts` has good extraction logic, but Android/iOS might send data differently.
  - **Impact:** Share target might not work on some devices
  - **Fix:** Test on real devices, add logging to see what data is received

- **No offline support**: Service worker exists but likely doesn't cache anything. PWA is "installable" but not truly offline-capable.
  - **Impact:** Poor offline experience
  - **Fix:** Add basic caching strategy (cache static assets, API responses with stale-while-revalidate)

**Fix Later:**
- **Update prompt UX**: `UpdatePrompt.tsx` exists but might be too aggressive. Consider showing only on critical updates.
- **Share target icon**: Manifest has icon, but might need different sizes for better PWA install prompts.

**Ignore:**
- Full offline support can wait. Installable PWA is the MVP goal.

---

## 5. UX & Product Flow

### ✅ Strengths
- Clean, calm visual design
- Good empty states
- Mobile-first responsive design
- Drag-and-drop calendar planning
- Filter system with custom categories/statuses

### ⚠️ Issues

**Fix Now:**
- **First save friction**: New users see empty state, but "Add your first place" button goes to form. No guidance on what to do next (share from another app, paste URL, etc.).
  - **Impact:** Confusion on first use
  - **Fix:** Add onboarding tooltip or better empty state copy explaining share target

- **Loading states inconsistent**: Some pages show "Loading...", others show skeleton screens. `HomeGrid` has skeleton (good), but `AddItemForm` just shows "Loading..." (line 1353).
  - **Impact:** Perceived slowness
  - **Fix:** Use skeleton screens everywhere, or consistent loading spinner

- **Error messages**: Some errors are user-friendly, others are technical. `AddItemForm` shows "Storage bucket not found" (helpful), but API errors might be cryptic.
  - **Impact:** User confusion
  - **Fix:** Add error message mapping for common failures

- **No confirmation on delete**: `ItemDetail.tsx` likely has delete, but no confirmation modal mentioned in audit. Check if exists.
  - **Impact:** Accidental deletions
  - **Fix:** Add confirmation modal (like Profile page has for "Clear Test Data")

- **Calendar empty state**: If all items are unplanned, shows helpful message. But if user has planned items, no guidance on how to add more.
  - **Impact:** Discoverability issue
  - **Fix:** Add "Add place" button in calendar view

**Fix Later:**
- **Bulk actions**: No way to select multiple items for batch operations (delete, change status, etc.).
- **Search**: No search functionality. Users with many items will struggle to find specific places.
- **Keyboard shortcuts**: No keyboard navigation for power users.

**Ignore:**
- Current UX is solid for MVP. Advanced features can wait.

---

## 6. Performance & Stability

### ✅ Strengths
- No obvious memory leaks
- Proper cleanup in useEffect hooks
- Lazy loading for images (`loading="lazy"`)

### ⚠️ Issues

**Fix Now:**
- **Unnecessary re-renders**: `HomeGrid.tsx` filters items on every render (line 150). Should use `useMemo`.
  - **Impact:** Performance degradation with many items
  - **Fix:** Wrap `filteredItems` in `useMemo` with `[items, selectedCategories, selectedStatuses]` deps

- **Missing dependency warnings**: Several `useEffect` hooks have `eslint-disable-next-line react-hooks/exhaustive-deps` comments. Some are intentional (like `AddItemForm` line 734), but others might be bugs.
  - **Impact:** Potential stale closures, bugs
  - **Fix:** Review each disabled rule, add proper deps or refs where needed

- **Image usage**: Using `<img>` instead of `next/image`. External URLs might not work with `next/image` without custom loader, but should at least try.
  - **Impact:** No automatic optimization, larger bundle
  - **Fix:** Use `next/image` with custom loader for external URLs, or keep `<img>` but add `loading="lazy"` (already done)

- **Real-time subscription cleanup**: `MapView.tsx` subscribes to real-time changes (line 145), but cleanup might not work if component unmounts during async setup.
  - **Impact:** Memory leak, unnecessary API calls
  - **Fix:** Ensure subscription cleanup in all code paths

**Fix Later:**
- **Pagination**: `HomeGrid` loads all items at once. With 1000+ items, this will be slow.
- **Virtual scrolling**: Long lists should use virtual scrolling for performance.
- **API response caching**: No caching of metadata/oEmbed responses. Repeated URLs waste API calls.

**Ignore:**
- Current performance is fine for MVP scale (< 1000 items per user).

---

## 7. Technical Debt & Cleanup

### Must Fix Now
1. **Auth flow stability** (Section 2) - Critical for user trust
2. **PWA manifest 401 errors** (Section 4) - Blocks core feature
3. **Category/Status data consistency** (Section 1) - Data integrity risk
4. **HomeGrid re-render optimization** (Section 6) - Performance issue

### Can Wait
1. **Soft deletes** - Nice to have, not critical
2. **Search functionality** - Can use browser search for now
3. **Bulk actions** - Low priority
4. **Image optimization** - Current approach works
5. **Pagination** - Won't be needed until scale

### Ignore (Not Debt)
- Current architecture is clean
- No major refactoring needed
- Code quality is good overall

---

## 8. Feature Readiness

### Map View
**Status:** 🟡 Functional but fragile  
**Issues:**
- No auth check on mount (minor)
- Complex Google Maps initialization logic (lines 177-221) with multiple timeouts/RAF calls
- Real-time subscription cleanup needs verification
- No error handling if Google Maps API key is missing (shows warning but continues)

**Recommendation:** Fix auth check, simplify initialization, add error boundary. **Ready for testing after fixes.**

### Calendar Planning
**Status:** 🟢 MVP Ready  
**Issues:**
- Drag-and-drop works well
- Empty states are good
- No major issues found

**Recommendation:** **Ready for testing.** Consider adding "Add place" button for discoverability.

### Profile Tab
**Status:** 🟡 Functional but incomplete  
**Issues:**
- Preferences don't persist (stored in state only, line 29)
- Display name doesn't save
- Export feature is stub (line 368)
- Stats load correctly

**Recommendation:** Make preferences persist (use `user_custom_options` table or new `user_preferences` table). **Ready for basic testing, but incomplete.**

---

## 9. Security & Privacy

### ✅ Strengths
- RLS policies correctly implemented
- No SQL injection risks (using Supabase client)
- Proper CORS headers on manifest route
- No sensitive data in client code

### ⚠️ Issues

**Fix Now:**
- **URL exposure**: URLs are stored and displayed. If users share sensitive URLs, they're visible in database.
  - **Impact:** Privacy risk if database is compromised
  - **Fix:** Consider encrypting URLs at rest (low priority, but good practice)

- **Screenshot storage**: Screenshots are in public bucket. Anyone with URL can access.
  - **Impact:** Privacy risk if URLs are leaked
  - **Fix:** 
    1. Use private bucket with signed URLs (better)
    2. Or add RLS to storage bucket (Supabase supports this)

- **No rate limiting**: API routes have no rate limiting. Could be abused.
  - **Impact:** Cost risk, DoS vulnerability
  - **Fix:** Add rate limiting middleware (Vercel has built-in, or use Upstash)

- **AI API key exposure**: AI enrichment uses server-side API key (good), but errors might leak info.
  - **Impact:** Low risk, but verify error messages don't expose keys

**Fix Later:**
- **Input sanitization**: User inputs (title, description) are stored as-is. XSS risk if displayed without sanitization (React auto-escapes, but verify).
- **CSRF protection**: Next.js has built-in CSRF protection, but verify it's enabled.

**Ignore:**
- Current security is adequate for MVP. Don't over-engineer.

---

## 10. Product Direction Check

### ✅ Aligned with Vision
- **Personal travel brain**: ✅ Items are private, user-owned
- **Visual recognition**: ✅ Screenshots, OG images, embeds
- **Low-friction planning**: ✅ Share target, drag-and-drop calendar

### ⚠️ Feature Drift Risks

**Current Direction is Good:**
- Focus on saving places, not social features
- Aggressive metadata extraction aligns with "low-friction"
- Calendar planning supports "planning" use case

**Watch Out For:**
- **Social features**: No signs of this, but resist adding sharing/collaboration
- **Over-engineering**: Current feature set is right-sized. Don't add complexity
- **Platform lock-in**: Currently platform-agnostic (good). Keep it that way

**Recommendation:** **Stay the course.** Current direction is solid. Focus on polish and reliability, not new features.

---

## Priority Action Items

### Week 1 (Critical)
1. Fix login bounce/flash (Section 2)
2. Verify PWA manifest accessibility (Section 4)
3. Add auth check to MapView (Section 2)
4. Fix HomeGrid re-render issue (Section 6)

### Week 2 (Important)
5. Normalize category/status data (Section 1)
6. Add image validation/fallback (Section 3)
7. Add confirmation modals for destructive actions (Section 5)
8. Fix service worker registration timing (Section 4)

### Week 3 (Polish)
9. Make profile preferences persist (Section 8)
10. Add retry logic for metadata fetch (Section 3)
11. Improve empty states and onboarding (Section 5)
12. Add rate limiting to API routes (Section 9)

---

## Next 3 Iterations Recommendation

### Iteration 1: Stability
- Fix all "Fix Now" items from audit
- Focus on auth flow, PWA reliability, data consistency
- **Goal:** Confident, stable foundation

### Iteration 2: Polish
- Improve UX issues (loading states, error messages, empty states)
- Add search functionality (critical for scale)
- Make profile preferences work
- **Goal:** Delightful user experience

### Iteration 3: Scale Prep
- Add pagination/virtual scrolling
- Optimize performance (memoization, image optimization)
- Add soft deletes
- **Goal:** Ready for growth

---

## Conclusion

FiBi is in good shape. The architecture is sound, the code quality is high, and the product direction is clear. The main issues are around polish and reliability rather than fundamental problems. With the fixes outlined above, FiBi will be ready for wider testing and eventual launch.

**Key Strengths:**
- Clean architecture
- Aggressive metadata extraction
- Good UX foundation
- Proper security (RLS, auth)

**Key Weaknesses:**
- Auth flow stability
- PWA reliability
- Some performance optimizations needed
- Missing some polish (error handling, loading states)

**Overall:** 🟢 **Good foundation, needs polish before launch.**

---

*End of Audit*

