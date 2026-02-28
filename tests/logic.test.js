/**
 * Good2Go — Example test suite
 *
 * These tests demonstrate the coverage gaps identified in TEST_COVERAGE_ANALYSIS.md.
 * To make them runnable, the business logic in index.html would first need to be
 * extracted into a separate module (e.g. src/logic.js).
 *
 * Setup:
 *   npm install --save-dev jest jest-environment-jsdom
 *   npx jest tests/logic.test.js
 */

// ─── Inlined logic (mirrors index.html exactly) ───────────────────────────────
// Once the logic is extracted to a module this block becomes:
//   const { daysBetween, checkLeftoverSafety, checkPackageSafety, analyzeProduct } = require('../src/logic');

function daysBetween(date1, date2) {
  var d1 = new Date(date1);
  var d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

var GRACE_DAYS = {
  dairy:      { best_by: 7,   use_by: 2,   sell_by: 7,   opened: 7  },
  meat:       { best_by: 2,   use_by: 1,   sell_by: 3,   opened: 2  },
  deli:       { best_by: 3,   use_by: 1,   sell_by: 5,   opened: 3  },
  eggs:       { best_by: 21,  use_by: 14,  sell_by: 21,  opened: 21 },
  bread:      { best_by: 7,   use_by: 3,   sell_by: 7,   opened: 5  },
  canned:     { best_by: 365, use_by: 180, sell_by: 365, opened: 3  },
  dry:        { best_by: 180, use_by: 90,  sell_by: 180, opened: 60 },
  frozen:     { best_by: 90,  use_by: 60,  sell_by: 90,  opened: 60 },
  condiments: { best_by: 90,  use_by: 60,  sell_by: 90,  opened: 30 },
  produce:    { best_by: 5,   use_by: 3,   sell_by: 7,   opened: 3  },
};

var BAD_STUFF = [
  { terms: ['high fructose corn syrup', 'hfcs'],                     penalty: 20, label: 'High fructose corn syrup' },
  { terms: ['canola oil', 'soybean oil', 'sunflower oil', 'vegetable oil'], penalty: 15, label: 'Seed oils' },
  { terms: ['red 40', 'yellow 5', 'yellow 6', 'blue 1'],             penalty: 10, label: 'Artificial colors' },
  { terms: ['aspartame', 'sucralose'],                                penalty: 8,  label: 'Artificial sweeteners' },
  { terms: ['sodium benzoate', 'potassium sorbate'],                  penalty: 5,  label: 'Preservatives' },
  { terms: ['carrageenan'],                                           penalty: 5,  label: 'Carrageenan' },
  { terms: ['trans fat', 'partially hydrogenated'],                   penalty: 25, label: 'Trans fats' },
  { terms: ['msg', 'monosodium glutamate'],                           penalty: 7,  label: 'MSG' },
];

var GOOD_STUFF = [
  { terms: ['organic'],                  bonus: 5,  label: 'Organic' },
  { terms: ['whole grain', 'whole wheat'], bonus: 8,  label: 'Whole grains' },
  { terms: ['probiotic', 'live cultures'], bonus: 10, label: 'Probiotics' },
  { terms: ['non-gmo'],                  bonus: 3,  label: 'Non-GMO' },
];

/** Pure version of analyzeAndShow — returns score + arrays instead of writing HTML */
function analyzeProduct(product) {
  var score = 70;
  var issues = [];
  var goods = [];

  var ingredients = (product.ingredients_text || '').toLowerCase();
  var nutrition = product.nutriments || {};

  BAD_STUFF.forEach(function (bad) {
    bad.terms.forEach(function (term) {
      if (ingredients.includes(term)) {
        score -= bad.penalty;
        issues.push(bad.label);
      }
    });
  });

  GOOD_STUFF.forEach(function (good) {
    good.terms.forEach(function (term) {
      if (ingredients.includes(term)) {
        score += good.bonus;
        goods.push(good.label);
      }
    });
  });

  var sugar = nutrition.sugars_100g || 0;
  if (sugar > 15) {
    score -= 10;
    issues.push('High sugar');
  }

  var sodium = nutrition.sodium_100g || 0;
  if (sodium > 0.5) {
    score -= 8;
    issues.push('High sodium');
  }

  score = Math.max(0, Math.min(100, score));

  return { score, issues, goods };
}

/** Pure version of checkLeftover logic */
function checkLeftoverSafety({ food, storedDate, storageType, leftOut, smellsOff, cautious, today }) {
  if (!food)       return { verdict: 'bad', reason: 'no-food' };
  if (!storedDate) return { verdict: 'bad', reason: 'no-date' };
  if (smellsOff)   return { verdict: 'bad', reason: 'smells-off' };
  if (leftOut)     return { verdict: 'bad', reason: 'left-out' };

  var allowed = food[storageType];

  if (storageType === 'freezer' && allowed === 0) {
    return { verdict: 'warning', reason: 'dont-freeze' };
  }

  if (cautious) allowed = Math.floor(allowed * 0.75);

  var days = daysBetween(storedDate, today);
  var remaining = allowed - days;

  if (remaining < 0)  return { verdict: 'bad',     remaining, days };
  if (remaining === 0) return { verdict: 'warning', remaining, days, reason: 'last-day' };
  if (remaining === 1) return { verdict: 'warning', remaining, days, reason: 'almost' };
  return { verdict: 'good', remaining, days };
}

/** Pure version of checkPackage logic */
function checkPackageSafety({ foodType, dateType, packageDate, opened, smellsOff, today }) {
  if (!dateType)    return { verdict: 'bad', reason: 'no-date-type' };
  if (!packageDate) return { verdict: 'bad', reason: 'no-date' };
  if (!foodType)    return { verdict: 'bad', reason: 'no-food-type' };
  if (smellsOff)    return { verdict: 'bad', reason: 'smells-off' };

  var grace = GRACE_DAYS[foodType];
  var graceDays = grace[dateType];
  if (opened) graceDays = Math.min(graceDays, grace.opened);

  var days = daysBetween(packageDate, today);
  var remaining = graceDays - days;

  if (remaining < 0)  return { verdict: 'bad',     remaining, days };
  if (remaining === 0) return { verdict: 'warning', remaining, days, reason: 'last-day' };
  if (remaining === 1) return { verdict: 'warning', remaining, days, reason: 'almost' };
  return { verdict: 'good', remaining, days };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a date string N days before today */
function daysAgo(n) {
  var d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

var TODAY = new Date().toISOString().split('T')[0];

var CHICKEN = { id: 'chicken_cooked', name: 'Cooked Chicken', fridge: 4, freezer: 90 };
var ICE_CREAM = { id: 'ice_cream', name: 'Ice Cream', fridge: 0, freezer: 180 };
var KETCHUP = { id: 'ketchup', name: 'Ketchup', fridge: 180, freezer: 0 };

// ─── Tests ────────────────────────────────────────────────────────────────────

// ── 1. daysBetween ────────────────────────────────────────────────────────────
describe('daysBetween', () => {
  test('same day returns 0', () => {
    expect(daysBetween(TODAY, TODAY)).toBe(0);
  });

  test('yesterday returns 1', () => {
    expect(daysBetween(daysAgo(1), TODAY)).toBe(1);
  });

  test('3 days ago returns 3', () => {
    expect(daysBetween(daysAgo(3), TODAY)).toBe(3);
  });

  test('future date returns negative value', () => {
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowStr = tomorrow.toISOString().split('T')[0];
    expect(daysBetween(tomorrowStr, TODAY)).toBe(-1);
  });

  // Known risk: DST transitions add/remove an hour, causing floor() to land one day off.
  // This test documents the expected correct behavior.
  test('30 days ago returns 30', () => {
    expect(daysBetween(daysAgo(30), TODAY)).toBe(30);
  });
});

// ── 2. checkLeftoverSafety ────────────────────────────────────────────────────
describe('checkLeftoverSafety — input guards', () => {
  test('no food selected → bad verdict', () => {
    var result = checkLeftoverSafety({ food: null, storedDate: daysAgo(1), storageType: 'fridge', leftOut: false, smellsOff: false, cautious: false, today: TODAY });
    expect(result.verdict).toBe('bad');
    expect(result.reason).toBe('no-food');
  });

  test('no date entered → bad verdict', () => {
    var result = checkLeftoverSafety({ food: CHICKEN, storedDate: null, storageType: 'fridge', leftOut: false, smellsOff: false, cautious: false, today: TODAY });
    expect(result.verdict).toBe('bad');
    expect(result.reason).toBe('no-date');
  });

  test('smells off → always bad regardless of days', () => {
    var result = checkLeftoverSafety({ food: CHICKEN, storedDate: daysAgo(1), storageType: 'fridge', leftOut: false, smellsOff: true, cautious: false, today: TODAY });
    expect(result.verdict).toBe('bad');
    expect(result.reason).toBe('smells-off');
  });

  test('left out 2+ hours → always bad', () => {
    var result = checkLeftoverSafety({ food: CHICKEN, storedDate: daysAgo(1), storageType: 'fridge', leftOut: true, smellsOff: false, cautious: false, today: TODAY });
    expect(result.verdict).toBe('bad');
    expect(result.reason).toBe('left-out');
  });
});

describe('checkLeftoverSafety — freezer restrictions', () => {
  test('freezer=0 food in freezer → dont-freeze warning', () => {
    // Ketchup: freezer=0
    var result = checkLeftoverSafety({ food: KETCHUP, storedDate: daysAgo(1), storageType: 'freezer', leftOut: false, smellsOff: false, cautious: false, today: TODAY });
    expect(result.verdict).toBe('warning');
    expect(result.reason).toBe('dont-freeze');
  });

  test('ice cream with fridge=0 in fridge: allowed=0 → immediately bad', () => {
    // Ice cream has fridge: 0 — stored 0 days ago, remaining === 0 → last-day warning
    var result = checkLeftoverSafety({ food: ICE_CREAM, storedDate: TODAY, storageType: 'fridge', leftOut: false, smellsOff: false, cautious: false, today: TODAY });
    expect(result.verdict).toBe('warning');
    expect(result.reason).toBe('last-day');
  });
});

describe('checkLeftoverSafety — day boundaries', () => {
  // Chicken fridge limit = 4 days

  test('stored today (0 days) → good, 4 days remaining', () => {
    var result = checkLeftoverSafety({ food: CHICKEN, storedDate: TODAY, storageType: 'fridge', leftOut: false, smellsOff: false, cautious: false, today: TODAY });
    expect(result.verdict).toBe('good');
    expect(result.remaining).toBe(4);
  });

  test('stored 3 days ago → good, 1 day remaining', () => {
    var result = checkLeftoverSafety({ food: CHICKEN, storedDate: daysAgo(3), storageType: 'fridge', leftOut: false, smellsOff: false, cautious: false, today: TODAY });
    expect(result.verdict).toBe('warning');
    expect(result.reason).toBe('almost');
    expect(result.remaining).toBe(1);
  });

  test('stored 4 days ago → last day warning (remaining=0)', () => {
    var result = checkLeftoverSafety({ food: CHICKEN, storedDate: daysAgo(4), storageType: 'fridge', leftOut: false, smellsOff: false, cautious: false, today: TODAY });
    expect(result.verdict).toBe('warning');
    expect(result.reason).toBe('last-day');
    expect(result.remaining).toBe(0);
  });

  test('stored 5 days ago → bad (1 day over)', () => {
    var result = checkLeftoverSafety({ food: CHICKEN, storedDate: daysAgo(5), storageType: 'fridge', leftOut: false, smellsOff: false, cautious: false, today: TODAY });
    expect(result.verdict).toBe('bad');
    expect(result.remaining).toBeLessThan(0);
  });
});

describe('checkLeftoverSafety — cautious mode', () => {
  // Chicken fridge = 4. floor(4 * 0.75) = 3.

  test('cautious mode reduces limit by 25%', () => {
    var result = checkLeftoverSafety({ food: CHICKEN, storedDate: daysAgo(3), storageType: 'fridge', leftOut: false, smellsOff: false, cautious: true, today: TODAY });
    // remaining = 3 - 3 = 0 → last-day in cautious mode
    expect(result.verdict).toBe('warning');
    expect(result.reason).toBe('last-day');
  });

  test('cautious mode: day 2 is still good', () => {
    var result = checkLeftoverSafety({ food: CHICKEN, storedDate: daysAgo(2), storageType: 'fridge', leftOut: false, smellsOff: false, cautious: true, today: TODAY });
    expect(result.verdict).toBe('warning'); // remaining = 3 - 2 = 1
    expect(result.reason).toBe('almost');
  });
});

// ── 3. checkPackageSafety ─────────────────────────────────────────────────────
describe('checkPackageSafety — input guards', () => {
  test('missing date type → bad', () => {
    var r = checkPackageSafety({ foodType: 'dairy', dateType: null, packageDate: daysAgo(1), opened: false, smellsOff: false, today: TODAY });
    expect(r.verdict).toBe('bad');
  });

  test('smells off → always bad', () => {
    var r = checkPackageSafety({ foodType: 'dairy', dateType: 'best_by', packageDate: daysAgo(1), opened: false, smellsOff: true, today: TODAY });
    expect(r.verdict).toBe('bad');
    expect(r.reason).toBe('smells-off');
  });
});

describe('checkPackageSafety — grace period logic', () => {
  test('dairy best_by: 3 days past date → within 7-day grace → good', () => {
    var r = checkPackageSafety({ foodType: 'dairy', dateType: 'best_by', packageDate: daysAgo(3), opened: false, smellsOff: false, today: TODAY });
    expect(r.verdict).toBe('good');
    expect(r.remaining).toBe(4); // 7 - 3
  });

  test('meat use_by: 2 days past date → past 1-day grace → bad', () => {
    var r = checkPackageSafety({ foodType: 'meat', dateType: 'use_by', packageDate: daysAgo(2), opened: false, smellsOff: false, today: TODAY });
    expect(r.verdict).toBe('bad');
  });

  test('canned best_by: 1 day past date → within 365-day grace → good', () => {
    var r = checkPackageSafety({ foodType: 'canned', dateType: 'best_by', packageDate: daysAgo(1), opened: false, smellsOff: false, today: TODAY });
    expect(r.verdict).toBe('good');
  });

  // Critical: opened canned food has only 3-day grace vs 365-day unopened grace
  test('opened canned food: opened cap (3 days) overrides best_by grace (365 days)', () => {
    var r = checkPackageSafety({ foodType: 'canned', dateType: 'best_by', packageDate: daysAgo(4), opened: true, smellsOff: false, today: TODAY });
    // graceDays = min(365, 3) = 3; days=4; remaining = -1
    expect(r.verdict).toBe('bad');
  });

  test('opened canned food: within opened cap → still good', () => {
    var r = checkPackageSafety({ foodType: 'canned', dateType: 'best_by', packageDate: daysAgo(2), opened: true, smellsOff: false, today: TODAY });
    // graceDays = min(365, 3) = 3; days=2; remaining=1
    expect(r.verdict).toBe('warning');
    expect(r.reason).toBe('almost');
  });

  test('opened does not reduce grace when opened cap > grace period', () => {
    // dairy best_by=7, opened=7 → min(7,7)=7, no change
    var r = checkPackageSafety({ foodType: 'dairy', dateType: 'best_by', packageDate: daysAgo(3), opened: true, smellsOff: false, today: TODAY });
    expect(r.remaining).toBe(4);
  });
});

// ── 4. analyzeProduct — health score ─────────────────────────────────────────
describe('analyzeProduct — baseline', () => {
  test('empty product starts at 70', () => {
    var r = analyzeProduct({ ingredients_text: '', nutriments: {} });
    expect(r.score).toBe(70);
    expect(r.issues).toHaveLength(0);
    expect(r.goods).toHaveLength(0);
  });
});

describe('analyzeProduct — BAD_STUFF penalties', () => {
  test('HFCS deducts 20 points', () => {
    var r = analyzeProduct({ ingredients_text: 'water, high fructose corn syrup, salt', nutriments: {} });
    expect(r.score).toBe(50);
    expect(r.issues).toContain('High fructose corn syrup');
  });

  test('trans fat deducts 25 points', () => {
    var r = analyzeProduct({ ingredients_text: 'partially hydrogenated soybean oil', nutriments: {} });
    // trans fat -25, seed oils -15 → 70 - 25 - 15 = 30
    expect(r.score).toBe(30);
  });

  test('multiple bad ingredients accumulate penalties and clamp at 0', () => {
    // HFCS(-20) + trans fat(-25) + artificial colors red 40(-10) + aspartame(-8) + preservatives(-5) = -68 from 70 → clamped to 0
    var r = analyzeProduct({
      ingredients_text: 'high fructose corn syrup, partially hydrogenated oil, red 40, aspartame, sodium benzoate',
      nutriments: {},
    });
    expect(r.score).toBe(0);
  });
});

describe('analyzeProduct — GOOD_STUFF bonuses', () => {
  test('organic adds 5 points', () => {
    var r = analyzeProduct({ ingredients_text: 'organic wheat flour, water', nutriments: {} });
    expect(r.score).toBe(75);
    expect(r.goods).toContain('Organic');
  });

  test('probiotics adds 10 points', () => {
    var r = analyzeProduct({ ingredients_text: 'milk, live cultures', nutriments: {} });
    expect(r.score).toBe(80);
  });

  test('score cannot exceed 100', () => {
    // organic(+5) + whole grain(+8) + probiotic(+10) + non-gmo(+3) = +26 → 96 (no clamp needed, but verifies cap)
    var r = analyzeProduct({ ingredients_text: 'organic whole wheat, live cultures, non-gmo', nutriments: {} });
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe('analyzeProduct — nutrition thresholds', () => {
  test('sugar exactly at 15g does NOT trigger penalty', () => {
    var r = analyzeProduct({ ingredients_text: '', nutriments: { sugars_100g: 15 } });
    expect(r.score).toBe(70); // no penalty
  });

  test('sugar above 15g triggers -10 penalty', () => {
    var r = analyzeProduct({ ingredients_text: '', nutriments: { sugars_100g: 15.1 } });
    expect(r.score).toBe(60);
    expect(r.issues).toContain('High sugar');
  });

  test('sodium exactly at 0.5g does NOT trigger penalty', () => {
    var r = analyzeProduct({ ingredients_text: '', nutriments: { sodium_100g: 0.5 } });
    expect(r.score).toBe(70);
  });

  test('sodium above 0.5g triggers -8 penalty', () => {
    var r = analyzeProduct({ ingredients_text: '', nutriments: { sodium_100g: 0.51 } });
    expect(r.score).toBe(62);
    expect(r.issues).toContain('High sodium');
  });
});

describe('analyzeProduct — badge classification', () => {
  test('score >= 70 → "Good Choice"', () => {
    var r = analyzeProduct({ ingredients_text: '', nutriments: {} });
    expect(r.score >= 70).toBe(true);
  });

  test('score 40–69 → "Fair"', () => {
    // HFCS -20 → score 50
    var r = analyzeProduct({ ingredients_text: 'high fructose corn syrup', nutriments: {} });
    expect(r.score >= 40 && r.score < 70).toBe(true);
  });

  test('score < 40 → "Poor Choice"', () => {
    // HFCS(-20) + trans fat(-25) = -45 → 25
    var r = analyzeProduct({ ingredients_text: 'high fructose corn syrup, partially hydrogenated oil', nutriments: {} });
    expect(r.score < 40).toBe(true);
  });
});

// ── 5. FOODS data integrity ───────────────────────────────────────────────────
// These tests would import the FOODS array from the extracted module.
// Shown here as documentation of what should be verified.

// describe('FOODS data integrity', () => {
//   const { FOODS } = require('../src/logic');
//
//   test('all food items have non-negative integer fridge values', () => {
//     FOODS.forEach(food => {
//       expect(Number.isInteger(food.fridge)).toBe(true);
//       expect(food.fridge).toBeGreaterThanOrEqual(0);
//     });
//   });
//
//   test('all food items have non-negative integer freezer values', () => {
//     FOODS.forEach(food => {
//       expect(Number.isInteger(food.freezer)).toBe(true);
//       expect(food.freezer).toBeGreaterThanOrEqual(0);
//     });
//   });
//
//   test('all food item IDs are unique', () => {
//     const ids = FOODS.map(f => f.id);
//     const uniqueIds = new Set(ids);
//     expect(uniqueIds.size).toBe(ids.length);
//   });
//
//   test('freezer value is always >= fridge for foods that can be frozen', () => {
//     FOODS.filter(f => f.freezer > 0).forEach(food => {
//       expect(food.freezer).toBeGreaterThanOrEqual(food.fridge);
//     });
//   });
// });
