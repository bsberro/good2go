# Test Coverage Analysis — Good2Go

## Current State

**Test coverage: 0%**

The entire application lives in a single `index.html` file (1,853 lines) containing HTML, CSS, and JavaScript with no test files, no test framework, and no CI configuration. Given this is a food safety application where incorrect guidance could lead to real harm, the absence of automated tests is the most critical quality gap.

---

## Business Logic at Risk

The following JavaScript functions contain the core safety logic. They are currently untested and represent the highest risk areas.

### 1. `daysBetween(date1, date2)` — High Priority

A pure utility function that all safety checks depend on. Any off-by-one error here propagates to every date-based verdict in the app.

**Gaps:**
- No test for same-day input (should return 0)
- No test for timezone edge cases (dates near midnight)
- No test for DST transitions, which can cause an hour to appear or disappear
- No test for leap year boundaries
- No test with invalid or empty input

---

### 2. `checkLeftover()` — Critical Priority

The heart of the app. Calculates whether a stored food item is still safe to eat. It applies layered conditional logic that is easy to get wrong at the boundaries.

**Logic flow:**
1. Guard: no food selected → error
2. Guard: no date selected → error
3. Guard: smells/looks off → always bad
4. Guard: left out 2+ hours → always bad
5. Look up food's max days from `FOODS` array
6. If freezer and `allowed === 0` → warn "don't freeze"
7. If cautious mode → reduce limit by 25%
8. Calculate `days = daysBetween(date, now)`, `remaining = allowed - days`
9. Branch: `remaining < 0` → bad / `=== 0` → last day / `=== 1` → warning / else → good

**Gaps:**
- Boundary at `remaining === 0` (last day): untested
- Boundary at `remaining === 1` (one day left): untested
- Cautious mode floor rounding: `Math.floor(allowed * 0.75)` — untested for foods where this makes a meaningful difference
- Freezer=0 "don't freeze" path: untested
- Interaction between cautious mode and the boundary thresholds
- No test verifying the correct `allowed` value is read per food type (fridge vs. freezer)

---

### 3. `checkPackage()` — Critical Priority

Determines whether packaged food is still safe based on date type, food category, and opened status. The `GRACE_DAYS` lookup matrix (10 food types × 4 date scenarios) provides 40 combinations, none of which are tested.

**Logic flow:**
1. Guards: missing date type / date / food type / smells off
2. Look up `grace = GRACE_DAYS[foodType]`
3. Get `graceDays = grace[dateType]`
4. If opened: `graceDays = Math.min(graceDays, grace.opened)`
5. Calculate remaining and branch to result

**Gaps:**
- The opened-state cap (`Math.min`) is untested — critical because opened food may expire sooner than the grace period
- All 10 food types × 3 date types = 30 base combinations are uncovered
- No tests for when opened cap is lower than the grace period (e.g. `canned` has `best_by: 365` but `opened: 3`)
- No tests for when opened cap is higher (no-op case)
- Boundary conditions (remaining < 0, === 0, === 1) untested

---

### 4. `analyzeAndShow(product)` — High Priority

Calculates a health score (starting at 70) by scanning ingredient text and nutrition data. Penalties from `BAD_STUFF` are subtracted; bonuses from `GOOD_STUFF` are added. Score is clamped to [0, 100].

**Logic gaps:**
- Score clamping at 0: a product with many bad ingredients could go negative; untested
- Score clamping at 100: bonuses could exceed 100; untested
- BAD_STUFF penalty accumulation: a product with multiple bad ingredients should accumulate multiple penalties; untested
- Partial term matching: `"canola oil"` is a substring of `"canola oil blend"` — intentional or bug? Untested
- Nutrition thresholds:
  - Sugar > 15g/100g triggers `-10` penalty
  - Sodium > 0.5g/100g triggers `-8` penalty
  - Boundary: sugar exactly at 15 should NOT trigger penalty
- Badge classification (good/fair/poor) at thresholds 70 and 40: untested
- Missing product fields (`product_name`, `image_url`, `brands`, `categories`) are handled with fallbacks but never tested

---

### 5. `FOODS` and `GRACE_DAYS` Data Integrity — Medium Priority

The safety verdicts are only as good as the underlying data. There are no tests verifying the data's internal consistency.

**Gaps:**
- No test that every FOODS entry has both `fridge` and `freezer` values as non-negative integers
- No test that `fridge` and `freezer` are not accidentally swapped (e.g. `freezer < fridge` when that is biologically implausible)
- No test that FOODS item IDs are unique (a duplicate ID would silently cause `find()` to always return the first match)
- No test that GRACE_DAYS covers all food types referenced in the UI `<select>`

---

### 6. `renderFoods(filter)` — Medium Priority

Filters and renders the food list based on search input.

**Gaps:**
- Empty filter shows all items: untested
- Case-insensitive matching: untested
- Partial match mid-word: untested
- Special characters in search string: untested
- Selecting a food item updates `state.selectedFood`: untested

---

### 7. API Integration (`lookupBarcode`, `searchProduct`) — Lower Priority

Both functions make `fetch()` calls to the Open Food Facts API and delegate to `analyzeAndShow`. These can be unit tested with mocked `fetch`.

**Gaps:**
- Success path (status 1, product present): untested
- Not-found path (status 0): untested
- Network error / `fetch` rejection: untested
- Empty product list from search: untested

---

## Recommended Testing Approach

### Step 1 — Extract business logic from HTML

The JavaScript is currently embedded inside `<script>` tags and depends on DOM elements. The pure logic functions (`daysBetween`, safety calculations, score computation) should be extracted into a separate `.js` module so they can be imported and tested in isolation without a browser.

### Step 2 — Set up a test framework

Add Jest (or Vitest) with jsdom for DOM-dependent tests:

```bash
npm init -y
npm install --save-dev jest jest-environment-jsdom
```

Add to `package.json`:
```json
{
  "scripts": { "test": "jest --coverage" },
  "jest": { "testEnvironment": "jsdom" }
}
```

### Step 3 — Write tests in priority order

See `tests/logic.test.js` in this repository for concrete examples covering all the critical areas identified above.

---

## Priority Summary

| Area | Risk | Effort | Priority |
|------|------|--------|----------|
| `daysBetween` boundary/DST | High | Low | **P1** |
| `checkLeftover` boundary conditions | Critical | Low | **P1** |
| `checkPackage` opened-cap logic | Critical | Low | **P1** |
| `analyzeAndShow` score clamping | High | Low | **P1** |
| FOODS/GRACE_DAYS data integrity | High | Low | **P2** |
| `analyzeAndShow` badge thresholds | Medium | Low | **P2** |
| `renderFoods` search filtering | Medium | Medium | **P2** |
| API error/not-found paths | Medium | Medium | **P3** |
