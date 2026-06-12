/**
 * tests/utils.test.js
 * ============================================================
 * Comprehensive unit test suite for EcoTrace utility layer.
 *
 * Covers:
 *  - Input sanitisation (numbers, selects, strings/XSS)
 *  - LocalStorage helpers (get, set, remove, error paths)
 *  - Carbon calculation engine (all categories, edge cases,
 *    invalid/boundary inputs, calculation accuracy)
 *  - Aggregation helpers (total, biggest category, percent delta)
 *  - Formatting helpers (emissions, dates)
 *  - Constants integrity (factors, colours, actions, benchmarks)
 *  - Integration tests (end-to-end calculation → storage round-trip)
 *
 * Run in browser : open tests/index.html
 * Run in Node.js : node tests/run-node.js
 * ============================================================
 */

"use strict";

/* ============================================================
   Minimal test harness  (zero external dependencies)
   ============================================================ */
var TestRunner = (() => {
  const results = [];
  let currentSuite = "Global";

  function describe(name, fn) {
    const prev = currentSuite;
    currentSuite = name;
    try { fn(); } finally { currentSuite = prev; }
  }

  function it(name, fn) {
    try {
      fn();
      results.push({ suite: currentSuite, name, passed: true });
    } catch (err) {
      results.push({ suite: currentSuite, name, passed: false, error: err.message });
    }
  }

  function expect(actual) {
    return {
      toBe(expected) {
        if (actual !== expected)
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      },
      toEqual(expected) {
        const a = JSON.stringify(actual), b = JSON.stringify(expected);
        if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
      },
      toBeCloseTo(expected, precision = 2) {
        const delta = Math.abs(actual - expected);
        const limit = Math.pow(10, -precision) / 2;
        if (delta > limit) throw new Error(`Expected ~${expected} (±${limit}), got ${actual}`);
      },
      toBeGreaterThan(n)        { if (actual <= n)  throw new Error(`Expected ${actual} > ${n}`); },
      toBeLessThan(n)           { if (actual >= n)  throw new Error(`Expected ${actual} < ${n}`); },
      toBeLessThanOrEqual(n)    { if (actual > n)   throw new Error(`Expected ${actual} <= ${n}`); },
      toBeGreaterThanOrEqual(n) { if (actual < n)   throw new Error(`Expected ${actual} >= ${n}`); },
      toBeTruthy()  { if (!actual)  throw new Error(`Expected truthy, got ${actual}`); },
      toBeFalsy()   { if (actual)   throw new Error(`Expected falsy, got ${actual}`);  },
      toContain(item) {
        if (!actual.includes(item)) throw new Error(`Expected array/string to contain ${JSON.stringify(item)}`);
      },
      toHaveLength(n) {
        if (actual.length !== n) throw new Error(`Expected length ${n}, got ${actual.length}`);
      },
      toBeTypeOf(type) {
        if (typeof actual !== type) throw new Error(`Expected type ${type}, got ${typeof actual}`);
      },
      toBeInstanceOf(cls) {
        if (!(actual instanceof cls)) throw new Error(`Expected instance of ${cls.name}`);
      },
      toMatch(regex) {
        if (!regex.test(String(actual))) throw new Error(`Expected ${actual} to match ${regex}`);
      },
      toThrow() {
        if (typeof actual !== "function") throw new Error("Expected a function");
        let threw = false;
        try { actual(); } catch { threw = true; }
        if (!threw) throw new Error("Expected function to throw but it did not");
      },
      not: {
        toBe(expected)     { if (actual === expected) throw new Error(`Expected NOT ${JSON.stringify(expected)}`); },
        toBeTruthy()       { if (actual)  throw new Error(`Expected falsy, got ${actual}`); },
        toContain(item)    { if (actual.includes(item)) throw new Error(`Expected NOT to contain ${JSON.stringify(item)}`); },
      },
    };
  }

  function report() {
    const passed = results.filter(r =>  r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    return { results, passed, failed, total: results.length };
  }

  return { describe, it, expect, report };
})();

var { describe, it, expect } = TestRunner;

/* ============================================================
   Mock localStorage
   ============================================================ */
const mockStorage = (() => {
  let store = {};
  return {
    getItem:    k     => store.hasOwnProperty(k) ? store[k] : null,
    setItem:    (k,v) => { store[k] = String(v); },
    removeItem: k     => { delete store[k]; },
    clear:      ()    => { store = {}; },
    _store:     ()    => store,
  };
})();
Object.defineProperty(window, "localStorage", { value: mockStorage, writable: true });

/* ============================================================
   Helper: base calculator inputs
   ============================================================ */
const BASE_INPUTS = Object.freeze({
  car_km:          10000,
  car_type:        "car_petrol",
  bus_km:          0,
  train_km:        0,
  flights:         0,
  electricity_kwh: 3000,
  gas_m3:          0,
  beef_meals:      2,
  chicken_meals:   3,
  veg_meals:       5,
  dairy_daily:     1,
  new_clothes:     5,
  streaming_hrs:   2,
  devices:         1,
});

const ZERO_INPUTS = Object.freeze({
  car_km: 0, car_type: "car_petrol", bus_km: 0, train_km: 0, flights: 0,
  electricity_kwh: 0, gas_m3: 0,
  beef_meals: 0, chicken_meals: 0, veg_meals: 0, dairy_daily: 0,
  new_clothes: 0, streaming_hrs: 0, devices: 0,
});

/* ============================================================
   1. EcoUtils.sanitizeNumber
   ============================================================ */
describe("EcoUtils.sanitizeNumber — basic values", () => {
  it("returns integer unchanged when in range",          () => expect(EcoUtils.sanitizeNumber(42)).toBe(42));
  it("returns float unchanged when in range",            () => expect(EcoUtils.sanitizeNumber(3.14)).toBe(3.14));
  it("returns zero",                                     () => expect(EcoUtils.sanitizeNumber(0)).toBe(0));
  it("parses numeric string '15.5'",                     () => expect(EcoUtils.sanitizeNumber("15.5", 0, 100, 0)).toBe(15.5));
  it("parses numeric string '0'",                        () => expect(EcoUtils.sanitizeNumber("0")).toBe(0));
  it("result is a number type",                          () => expect(typeof EcoUtils.sanitizeNumber(5)).toBe("number"));
});

describe("EcoUtils.sanitizeNumber — clamping", () => {
  it("clamps value below min to min",          () => expect(EcoUtils.sanitizeNumber(-10,  0, 100)).toBe(0));
  it("clamps value above max to max",          () => expect(EcoUtils.sanitizeNumber(999,  0, 100)).toBe(100));
  it("clamps negative with negative min",      () => expect(EcoUtils.sanitizeNumber(-200, -100, 0)).toBe(-100));
  it("returns min when min equals max",        () => expect(EcoUtils.sanitizeNumber(50,   50, 50)).toBe(50));
  it("value exactly at min is kept",           () => expect(EcoUtils.sanitizeNumber(0,    0, 100)).toBe(0));
  it("value exactly at max is kept",           () => expect(EcoUtils.sanitizeNumber(100,  0, 100)).toBe(100));
});

describe("EcoUtils.sanitizeNumber — invalid inputs", () => {
  it("returns fallback for NaN string 'abc'",  () => expect(EcoUtils.sanitizeNumber("abc",      0, 100, 5)).toBe(5));
  it("returns fallback for undefined",          () => expect(EcoUtils.sanitizeNumber(undefined,  0, 100, 7)).toBe(7));
  it("returns fallback for null",               () => expect(EcoUtils.sanitizeNumber(null,       0, 100, 3)).toBe(3));
  it("returns fallback for empty string",       () => expect(EcoUtils.sanitizeNumber("",         0, 100, 9)).toBe(9));
  it("returns fallback for object input",       () => expect(EcoUtils.sanitizeNumber({},         0, 100, 1)).toBe(1));
  it("returns fallback for array input",        () => expect(EcoUtils.sanitizeNumber([],         0, 100, 2)).toBe(2));
  it("uses default fallback of 0 when omitted",() => expect(EcoUtils.sanitizeNumber("bad")).toBe(0));
});

describe("EcoUtils.sanitizeNumber — Infinity handling", () => {
  it("clamps +Infinity to max",                () => expect(EcoUtils.sanitizeNumber(Infinity,   0, 1000, 0)).toBe(1000));
  it("clamps -Infinity to min",                () => expect(EcoUtils.sanitizeNumber(-Infinity,  0, 1000, 0)).toBe(0));
  it("clamps string 'Infinity' via parseFloat",() => expect(EcoUtils.sanitizeNumber("Infinity", 0, 500,  0)).toBe(500));
});

/* ============================================================
   2. EcoUtils.sanitizeSelect
   ============================================================ */
describe("EcoUtils.sanitizeSelect", () => {
  const opts = ["car_petrol", "car_diesel", "car_electric", "motorcycle"];

  it("returns value when in allowed list",              () => expect(EcoUtils.sanitizeSelect("car_petrol",  opts, "car_petrol")).toBe("car_petrol"));
  it("returns last allowed item when valid",            () => expect(EcoUtils.sanitizeSelect("motorcycle",  opts, "car_petrol")).toBe("motorcycle"));
  it("returns fallback for unknown value",              () => expect(EcoUtils.sanitizeSelect("rocket",      opts, "car_petrol")).toBe("car_petrol"));
  it("returns fallback for empty string",               () => expect(EcoUtils.sanitizeSelect("",            opts, "car_petrol")).toBe("car_petrol"));
  it("is case-sensitive (uppercase rejected)",          () => expect(EcoUtils.sanitizeSelect("Car_Petrol",  opts, "car_petrol")).toBe("car_petrol"));
  it("returns fallback for null",                       () => expect(EcoUtils.sanitizeSelect(null,          opts, "car_petrol")).toBe("car_petrol"));
  it("returns fallback for undefined",                  () => expect(EcoUtils.sanitizeSelect(undefined,     opts, "car_petrol")).toBe("car_petrol"));
  it("returns fallback for numeric input",              () => expect(EcoUtils.sanitizeSelect(42,            opts, "car_petrol")).toBe("car_petrol"));
  it("returns fallback for SQL-injection-like string",  () => expect(EcoUtils.sanitizeSelect("'; DROP TABLE users;--", opts, "car_petrol")).toBe("car_petrol"));
});

/* ============================================================
   3. EcoUtils.sanitizeString (XSS prevention)
   ============================================================ */
describe("EcoUtils.sanitizeString — XSS prevention", () => {
  it("escapes < character",                    () => expect(EcoUtils.sanitizeString("<script>")).not.toContain("<"));
  it("escapes > character",                    () => expect(EcoUtils.sanitizeString("<script>")).not.toContain(">"));
  it("escapes & character",                    () => expect(EcoUtils.sanitizeString("a & b")).toContain("&amp;"));
  it("escapes double quotes",                  () => expect(EcoUtils.sanitizeString('"hello"')).toContain("&quot;"));
  it("escapes single quotes",                  () => expect(EcoUtils.sanitizeString("it's")).toContain("&#039;"));
  it("leaves safe strings unchanged",          () => expect(EcoUtils.sanitizeString("hello world")).toBe("hello world"));
  it("leaves numbers as string",               () => expect(EcoUtils.sanitizeString(42)).toBe("42"));
  it("handles full XSS payload",               () => {
    const result = EcoUtils.sanitizeString('<img src=x onerror="alert(1)">');
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });
  it("returns string type",                    () => expect(typeof EcoUtils.sanitizeString("test")).toBe("string"));
  it("handles empty string",                   () => expect(EcoUtils.sanitizeString("")).toBe(""));
});

/* ============================================================
   4. LocalStorage helpers
   ============================================================ */
describe("EcoUtils.storageSet and storageGet — round-trip", () => {
  it("stores and retrieves a plain object",    () => {
    mockStorage.clear();
    EcoUtils.storageSet("t1", { a: 1, b: "two" });
    expect(EcoUtils.storageGet("t1", null)).toEqual({ a: 1, b: "two" });
  });
  it("stores and retrieves an array",          () => {
    mockStorage.clear();
    EcoUtils.storageSet("t2", [1, 2, 3]);
    expect(EcoUtils.storageGet("t2", [])).toEqual([1, 2, 3]);
  });
  it("stores and retrieves a number",          () => {
    mockStorage.clear();
    EcoUtils.storageSet("t3", 3.14);
    expect(EcoUtils.storageGet("t3", 0)).toBe(3.14);
  });
  it("stores and retrieves a boolean",         () => {
    mockStorage.clear();
    EcoUtils.storageSet("t4", false);
    expect(EcoUtils.storageGet("t4", true)).toBe(false);
  });
  it("stores and retrieves null",              () => {
    mockStorage.clear();
    EcoUtils.storageSet("t5", null);
    // JSON.parse(null) === null, stored as "null"
    expect(EcoUtils.storageGet("t5", "default")).toBe(null);
  });
  it("returns default when key missing",       () => {
    mockStorage.clear();
    expect(EcoUtils.storageGet("nonexistent", "default")).toBe("default");
  });
  it("returns default when key missing (array)",() => {
    mockStorage.clear();
    expect(EcoUtils.storageGet("missing_arr", [])).toEqual([]);
  });
  it("storageSet returns true on success",     () => {
    expect(EcoUtils.storageSet("ok", 1)).toBe(true);
  });
  it("overwrites existing key",                () => {
    mockStorage.clear();
    EcoUtils.storageSet("ow", 1);
    EcoUtils.storageSet("ow", 99);
    expect(EcoUtils.storageGet("ow", 0)).toBe(99);
  });
});

describe("EcoUtils.storageRemove", () => {
  it("removes an existing key",                () => {
    mockStorage.clear();
    EcoUtils.storageSet("rm1", 123);
    EcoUtils.storageRemove("rm1");
    expect(EcoUtils.storageGet("rm1", "gone")).toBe("gone");
  });
  it("does not throw when key does not exist", () => {
    mockStorage.clear();
    expect(() => EcoUtils.storageRemove("never_existed")).not.toThrow
      ? (() => { EcoUtils.storageRemove("never_existed"); })()
      : (() => {})();
  });
});

/* ============================================================
   5. EcoUtils.calculateFootprint — structure
   ============================================================ */
describe("EcoUtils.calculateFootprint — output structure", () => {
  it("returns an object",                      () => expect(typeof EcoUtils.calculateFootprint(BASE_INPUTS)).toBe("object"));
  it("has exactly 4 keys",                     () => expect(Object.keys(EcoUtils.calculateFootprint(BASE_INPUTS)).length).toBe(4));
  it("has transport key",                      () => expect("transport" in EcoUtils.calculateFootprint(BASE_INPUTS)).toBeTruthy());
  it("has energy key",                         () => expect("energy"    in EcoUtils.calculateFootprint(BASE_INPUTS)).toBeTruthy());
  it("has food key",                           () => expect("food"      in EcoUtils.calculateFootprint(BASE_INPUTS)).toBeTruthy());
  it("has lifestyle key",                      () => expect("lifestyle" in EcoUtils.calculateFootprint(BASE_INPUTS)).toBeTruthy());
  it("all values are numbers",                 () => {
    const fp = EcoUtils.calculateFootprint(BASE_INPUTS);
    Object.values(fp).forEach(v => expect(typeof v).toBe("number"));
  });
  it("all values are finite",                  () => {
    const fp = EcoUtils.calculateFootprint(BASE_INPUTS);
    Object.values(fp).forEach(v => expect(Number.isFinite(v)).toBeTruthy());
  });
  it("values rounded to max 3 decimal places", () => {
    const fp = EcoUtils.calculateFootprint(BASE_INPUTS);
    Object.values(fp).forEach(v => {
      const dec = (v.toString().split(".")[1] || "").length;
      expect(dec).toBeLessThanOrEqual(3);
    });
  });
});

/* ============================================================
   6. EcoUtils.calculateFootprint — non-negative
   ============================================================ */
describe("EcoUtils.calculateFootprint — non-negative values", () => {
  it("transport is >= 0",    () => expect(EcoUtils.calculateFootprint(BASE_INPUTS).transport).toBeGreaterThanOrEqual(0));
  it("energy is >= 0",       () => expect(EcoUtils.calculateFootprint(BASE_INPUTS).energy).toBeGreaterThanOrEqual(0));
  it("food is >= 0",         () => expect(EcoUtils.calculateFootprint(BASE_INPUTS).food).toBeGreaterThanOrEqual(0));
  it("lifestyle is >= 0",    () => expect(EcoUtils.calculateFootprint(BASE_INPUTS).lifestyle).toBeGreaterThanOrEqual(0));
  it("all zero inputs → all zero outputs", () => {
    const fp = EcoUtils.calculateFootprint(ZERO_INPUTS);
    Object.values(fp).forEach(v => expect(v).toBe(0));
  });
});

/* ============================================================
   7. EcoUtils.calculateFootprint — transport logic
   ============================================================ */
describe("EcoUtils.calculateFootprint — transport", () => {
  it("electric car < petrol car for same km",  () => {
    const p = EcoUtils.calculateFootprint({ ...BASE_INPUTS, car_type: "car_petrol" });
    const e = EcoUtils.calculateFootprint({ ...BASE_INPUTS, car_type: "car_electric" });
    expect(e.transport).toBeLessThan(p.transport);
  });
  it("diesel car < petrol car for same km",    () => {
    const p = EcoUtils.calculateFootprint({ ...BASE_INPUTS, car_type: "car_petrol" });
    const d = EcoUtils.calculateFootprint({ ...BASE_INPUTS, car_type: "car_diesel" });
    expect(d.transport).toBeLessThan(p.transport);
  });
  it("more km → more transport emissions",     () => {
    const lo = EcoUtils.calculateFootprint({ ...BASE_INPUTS, car_km: 1000  });
    const hi = EcoUtils.calculateFootprint({ ...BASE_INPUTS, car_km: 50000 });
    expect(hi.transport).toBeGreaterThan(lo.transport);
  });
  it("flights add to transport",               () => {
    const no = EcoUtils.calculateFootprint({ ...BASE_INPUTS, flights: 0 });
    const fl = EcoUtils.calculateFootprint({ ...BASE_INPUTS, flights: 2 });
    expect(fl.transport).toBeGreaterThan(no.transport);
  });
  it("bus travel adds to transport",           () => {
    const no = EcoUtils.calculateFootprint({ ...BASE_INPUTS, bus_km: 0     });
    const bs = EcoUtils.calculateFootprint({ ...BASE_INPUTS, bus_km: 5000  });
    expect(bs.transport).toBeGreaterThan(no.transport);
  });
  it("train travel adds to transport",         () => {
    const no = EcoUtils.calculateFootprint({ ...BASE_INPUTS, train_km: 0    });
    const tr = EcoUtils.calculateFootprint({ ...BASE_INPUTS, train_km: 5000 });
    expect(tr.transport).toBeGreaterThan(no.transport);
  });
  it("train < car per km (greener)",           () => {
    const car   = EcoUtils.calculateFootprint({ ...ZERO_INPUTS, car_km: 10000,   car_type: "car_petrol" });
    const train = EcoUtils.calculateFootprint({ ...ZERO_INPUTS, train_km: 10000  });
    expect(train.transport).toBeLessThan(car.transport);
  });
  it("invalid car_type falls back gracefully", () => {
    const fp = EcoUtils.calculateFootprint({ ...BASE_INPUTS, car_type: "hovercraft" });
    expect(fp.transport).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(fp.transport)).toBeTruthy();
  });
  it("negative car_km clamped to 0",           () => {
    const fp = EcoUtils.calculateFootprint({ ...BASE_INPUTS, car_km: -5000 });
    expect(fp.transport).toBeGreaterThanOrEqual(0);
  });
});

/* ============================================================
   8. EcoUtils.calculateFootprint — energy logic
   ============================================================ */
describe("EcoUtils.calculateFootprint — energy", () => {
  it("more electricity → more energy emissions",  () => {
    const lo = EcoUtils.calculateFootprint({ ...BASE_INPUTS, electricity_kwh: 1000  });
    const hi = EcoUtils.calculateFootprint({ ...BASE_INPUTS, electricity_kwh: 10000 });
    expect(hi.energy).toBeGreaterThan(lo.energy);
  });
  it("gas heating adds to energy",                () => {
    const no  = EcoUtils.calculateFootprint({ ...BASE_INPUTS, gas_m3: 0   });
    const gas = EcoUtils.calculateFootprint({ ...BASE_INPUTS, gas_m3: 500 });
    expect(gas.energy).toBeGreaterThan(no.energy);
  });
  it("zero electricity and gas → zero energy",    () => {
    const fp = EcoUtils.calculateFootprint({ ...BASE_INPUTS, electricity_kwh: 0, gas_m3: 0 });
    expect(fp.energy).toBe(0);
  });
  it("energy factor for electricity is correct",  () => {
    // 1000 kWh × 0.233 kg/kWh = 233 kg = 0.233 t
    const fp = EcoUtils.calculateFootprint({ ...ZERO_INPUTS, electricity_kwh: 1000 });
    expect(fp.energy).toBeCloseTo(0.233, 2);
  });
});

/* ============================================================
   9. EcoUtils.calculateFootprint — food logic
   ============================================================ */
describe("EcoUtils.calculateFootprint — food", () => {
  it("more beef → higher food emissions",          () => {
    const lo = EcoUtils.calculateFootprint({ ...BASE_INPUTS, beef_meals: 0 });
    const hi = EcoUtils.calculateFootprint({ ...BASE_INPUTS, beef_meals: 7 });
    expect(hi.food).toBeGreaterThan(lo.food);
  });
  it("beef meals > chicken meals emissions (same count)", () => {
    const beef    = EcoUtils.calculateFootprint({ ...ZERO_INPUTS, beef_meals: 7    });
    const chicken = EcoUtils.calculateFootprint({ ...ZERO_INPUTS, chicken_meals: 7 });
    expect(beef.food).toBeGreaterThan(chicken.food);
  });
  it("dairy adds to food emissions",               () => {
    const no   = EcoUtils.calculateFootprint({ ...BASE_INPUTS, dairy_daily: 0 });
    const milk = EcoUtils.calculateFootprint({ ...BASE_INPUTS, dairy_daily: 3 });
    expect(milk.food).toBeGreaterThan(no.food);
  });
  it("all food zero → food emissions zero",        () => {
    const fp = EcoUtils.calculateFootprint({
      ...BASE_INPUTS, beef_meals: 0, chicken_meals: 0, veg_meals: 0, dairy_daily: 0,
    });
    expect(fp.food).toBe(0);
  });
  it("beef meals capped at max (21) prevent runaway values", () => {
    const fp = EcoUtils.calculateFootprint({ ...BASE_INPUTS, beef_meals: 9999 });
    expect(fp.food).toBeLessThan(1000); // sanity upper bound
  });
});

/* ============================================================
   10. EcoUtils.calculateFootprint — lifestyle logic
   ============================================================ */
describe("EcoUtils.calculateFootprint — lifestyle", () => {
  it("more new clothes → higher lifestyle emissions", () => {
    const lo = EcoUtils.calculateFootprint({ ...BASE_INPUTS, new_clothes: 0  });
    const hi = EcoUtils.calculateFootprint({ ...BASE_INPUTS, new_clothes: 50 });
    expect(hi.lifestyle).toBeGreaterThan(lo.lifestyle);
  });
  it("more streaming → higher lifestyle emissions",   () => {
    const lo = EcoUtils.calculateFootprint({ ...BASE_INPUTS, streaming_hrs: 0  });
    const hi = EcoUtils.calculateFootprint({ ...BASE_INPUTS, streaming_hrs: 10 });
    expect(hi.lifestyle).toBeGreaterThan(lo.lifestyle);
  });
  it("more devices → higher lifestyle emissions",     () => {
    const lo = EcoUtils.calculateFootprint({ ...BASE_INPUTS, devices: 0 });
    const hi = EcoUtils.calculateFootprint({ ...BASE_INPUTS, devices: 5 });
    expect(hi.lifestyle).toBeGreaterThan(lo.lifestyle);
  });
  it("all lifestyle zero → zero",                     () => {
    const fp = EcoUtils.calculateFootprint({
      ...BASE_INPUTS, new_clothes: 0, streaming_hrs: 0, devices: 0,
    });
    expect(fp.lifestyle).toBe(0);
  });
});

/* ============================================================
   11. EcoUtils.totalFootprint
   ============================================================ */
describe("EcoUtils.totalFootprint", () => {
  it("sums all four categories",                () => {
    expect(EcoUtils.totalFootprint({ transport:1, energy:0.5, food:2, lifestyle:0.3 })).toBeCloseTo(3.8, 5);
  });
  it("returns 0 for all-zero footprint",        () => {
    expect(EcoUtils.totalFootprint({ transport:0, energy:0, food:0, lifestyle:0 })).toBe(0);
  });
  it("handles floating point precisely",        () => {
    expect(EcoUtils.totalFootprint({ transport:0.1, energy:0.2, food:0.3, lifestyle:0.4 })).toBeCloseTo(1.0, 5);
  });
  it("result is a number",                      () => {
    expect(typeof EcoUtils.totalFootprint({ transport:1, energy:1, food:1, lifestyle:1 })).toBe("number");
  });
  it("works with very small values",            () => {
    expect(EcoUtils.totalFootprint({ transport:0.001, energy:0.001, food:0.001, lifestyle:0.001 })).toBeCloseTo(0.004, 4);
  });
});

/* ============================================================
   12. EcoUtils.biggestCategory
   ============================================================ */
describe("EcoUtils.biggestCategory", () => {
  it("identifies transport as biggest",         () => expect(EcoUtils.biggestCategory({ transport:3, energy:1, food:2, lifestyle:0.5 })).toBe("transport"));
  it("identifies food as biggest",              () => expect(EcoUtils.biggestCategory({ transport:0.5, energy:0.5, food:4, lifestyle:0.3 })).toBe("food"));
  it("identifies energy as biggest",            () => expect(EcoUtils.biggestCategory({ transport:1, energy:5, food:2, lifestyle:0.5 })).toBe("energy"));
  it("identifies lifestyle as biggest",         () => expect(EcoUtils.biggestCategory({ transport:1, energy:1, food:1, lifestyle:9 })).toBe("lifestyle"));
  it("returns a string",                        () => expect(typeof EcoUtils.biggestCategory({ transport:1, energy:1, food:1, lifestyle:1 })).toBe("string"));
  it("result is a valid category name",         () => {
    const cats = ["transport","energy","food","lifestyle"];
    expect(cats).toContain(EcoUtils.biggestCategory({ transport:1, energy:2, food:3, lifestyle:4 }));
  });
});

/* ============================================================
   13. EcoUtils.percentDelta
   ============================================================ */
describe("EcoUtils.percentDelta", () => {
  it("calculates positive delta correctly",      () => expect(EcoUtils.percentDelta(6.0, 5.0)).toBeCloseTo(20, 1));
  it("calculates negative delta correctly",      () => expect(EcoUtils.percentDelta(4.0, 5.0)).toBeCloseTo(-20, 1));
  it("returns 0 for equal values",               () => expect(EcoUtils.percentDelta(5, 5)).toBe(0));
  it("returns 0 when base is 0",                 () => expect(EcoUtils.percentDelta(10, 0)).toBe(0));
  it("returns 100 for doubling",                 () => expect(EcoUtils.percentDelta(10, 5)).toBeCloseTo(100, 1));
  it("returns -100 for halving",                 () => expect(EcoUtils.percentDelta(2.5, 5)).toBeCloseTo(-50, 1));
  it("result is a number",                       () => expect(typeof EcoUtils.percentDelta(3, 4)).toBe("number"));
});

/* ============================================================
   14. EcoUtils.formatEmission
   ============================================================ */
describe("EcoUtils.formatEmission", () => {
  it("formats with default 1 decimal and 't' unit", () => expect(EcoUtils.formatEmission(3.567)).toBe("3.6t"));
  it("formats 0 correctly",                         () => expect(EcoUtils.formatEmission(0)).toBe("0.0t"));
  it("respects custom decimals = 2",                () => expect(EcoUtils.formatEmission(3.567, 2)).toBe("3.57t"));
  it("respects custom decimals = 0",                () => expect(EcoUtils.formatEmission(3.9, 0)).toBe("4t"));
  it("respects custom unit string",                 () => expect(EcoUtils.formatEmission(3.5, 1, " kg")).toBe("3.5 kg"));
  it("returns a string",                            () => expect(typeof EcoUtils.formatEmission(5)).toBe("string"));
});

/* ============================================================
   15. EcoUtils.formatDate / formatShortDate
   ============================================================ */
describe("EcoUtils.formatDate", () => {
  it("returns a non-empty string for valid ISO",   () => {
    const r = EcoUtils.formatDate("2024-06-15T10:00:00.000Z");
    expect(typeof r).toBe("string");
    expect(r.length).toBeGreaterThan(0);
  });
  it("contains the year 2024",                     () => expect(EcoUtils.formatDate("2024-06-15T00:00:00Z")).toContain("2024"));
  it("does not throw on invalid date",             () => {
    let threw = false;
    try { EcoUtils.formatDate("not-a-date"); } catch { threw = true; }
    expect(threw).toBeFalsy();
  });
  it("returns string even for invalid date",       () => expect(typeof EcoUtils.formatDate("bad")).toBe("string"));
});

describe("EcoUtils.formatShortDate", () => {
  it("returns a string",                           () => expect(typeof EcoUtils.formatShortDate("2024-06-15T00:00:00Z")).toBe("string"));
  it("shorter than formatDate",                    () => {
    const full  = EcoUtils.formatDate("2024-06-15T00:00:00Z");
    const short = EcoUtils.formatShortDate("2024-06-15T00:00:00Z");
    expect(short.length).toBeLessThan(full.length);
  });
  it("does not throw on invalid date",             () => {
    let threw = false;
    try { EcoUtils.formatShortDate("garbage"); } catch { threw = true; }
    expect(threw).toBeFalsy();
  });
});

/* ============================================================
   16. EMISSION_FACTORS constants integrity
   ============================================================ */
describe("EMISSION_FACTORS integrity", () => {
  it("has transport category",                () => expect(typeof EMISSION_FACTORS.transport).toBe("object"));
  it("has energy category",                   () => expect(typeof EMISSION_FACTORS.energy).toBe("object"));
  it("has food category",                     () => expect(typeof EMISSION_FACTORS.food).toBe("object"));
  it("has lifestyle category",                () => expect(typeof EMISSION_FACTORS.lifestyle).toBe("object"));
  it("all transport values > 0",              () => Object.values(EMISSION_FACTORS.transport).forEach(v => expect(v).toBeGreaterThan(0)));
  it("all energy values >= 0",               () => Object.values(EMISSION_FACTORS.energy).forEach(v => expect(v).toBeGreaterThanOrEqual(0)));
  it("all food values > 0",                   () => Object.values(EMISSION_FACTORS.food).forEach(v => expect(v).toBeGreaterThan(0)));
  it("all lifestyle values > 0",              () => Object.values(EMISSION_FACTORS.lifestyle).forEach(v => expect(v).toBeGreaterThan(0)));
  it("electric car < petrol car factor",      () => expect(EMISSION_FACTORS.transport.car_electric).toBeLessThan(EMISSION_FACTORS.transport.car_petrol));
  it("train < car_petrol factor",             () => expect(EMISSION_FACTORS.transport.train).toBeLessThan(EMISSION_FACTORS.transport.car_petrol));
  it("beef > chicken food factor",            () => expect(EMISSION_FACTORS.food.beef).toBeGreaterThan(EMISSION_FACTORS.food.chicken));
  it("solar energy factor is 0",             () => expect(EMISSION_FACTORS.energy.solar).toBe(0));
  it("wind energy factor is 0",              () => expect(EMISSION_FACTORS.energy.wind).toBe(0));
});

/* ============================================================
   17. CATEGORY_COLORS constants integrity
   ============================================================ */
describe("CATEGORY_COLORS integrity", () => {
  it("has exactly 4 entries",                 () => expect(Object.keys(CATEGORY_COLORS).length).toBe(4));
  it("has transport color",                   () => expect(typeof CATEGORY_COLORS.transport).toBe("string"));
  it("has energy color",                      () => expect(typeof CATEGORY_COLORS.energy).toBe("string"));
  it("has food color",                        () => expect(typeof CATEGORY_COLORS.food).toBe("string"));
  it("has lifestyle color",                   () => expect(typeof CATEGORY_COLORS.lifestyle).toBe("string"));
  it("all values are valid hex (# + 6 chars)",() => Object.values(CATEGORY_COLORS).forEach(c => {
    expect(c.startsWith("#")).toBeTruthy();
    expect(c.length).toBe(7);
  }));
  it("all colors are distinct",               () => {
    const vals = Object.values(CATEGORY_COLORS);
    const unique = new Set(vals);
    expect(unique.size).toBe(vals.length);
  });
});

/* ============================================================
   18. ACTIONS_CATALOGUE constants integrity
   ============================================================ */
describe("ACTIONS_CATALOGUE integrity", () => {
  it("has 12 actions",                        () => expect(ACTIONS_CATALOGUE.length).toBe(12));
  it("all ids are unique numbers",            () => {
    const ids = ACTIONS_CATALOGUE.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach(id => expect(typeof id).toBe("number"));
  });
  it("all titles are non-empty strings",      () => ACTIONS_CATALOGUE.forEach(a => {
    expect(typeof a.title).toBe("string");
    expect(a.title.length).toBeGreaterThan(0);
  }));
  it("all descriptions are non-empty",        () => ACTIONS_CATALOGUE.forEach(a => {
    expect(typeof a.description).toBe("string");
    expect(a.description.length).toBeGreaterThan(0);
  }));
  it("all savings are positive numbers",      () => ACTIONS_CATALOGUE.forEach(a => {
    expect(typeof a.saving).toBe("number");
    expect(a.saving).toBeGreaterThan(0);
  }));
  it("all impacts are valid enum values",     () => ACTIONS_CATALOGUE.forEach(a => {
    expect(["high","medium","low"]).toContain(a.impact);
  }));
  it("all efforts are valid enum values",     () => ACTIONS_CATALOGUE.forEach(a => {
    expect(["high","medium","low"]).toContain(a.effort);
  }));
  it("all categories are valid",              () => ACTIONS_CATALOGUE.forEach(a => {
    expect(["transport","energy","food","lifestyle"]).toContain(a.category);
  }));
  it("has at least 1 high-impact action",     () => {
    expect(ACTIONS_CATALOGUE.filter(a => a.impact === "high").length).toBeGreaterThan(0);
  });
  it("covers all 4 categories",              () => {
    const cats = new Set(ACTIONS_CATALOGUE.map(a => a.category));
    expect(cats.size).toBe(4);
  });
});

/* ============================================================
   19. BENCHMARKS constants integrity
   ============================================================ */
describe("BENCHMARKS integrity", () => {
  it("paris_2030 < uk_average",               () => expect(BENCHMARKS.paris_2030).toBeLessThan(BENCHMARKS.uk_average));
  it("paris_2030 < world_average",            () => expect(BENCHMARKS.paris_2030).toBeLessThan(BENCHMARKS.world_average));
  it("net_zero_2050 is 0",                    () => expect(BENCHMARKS.net_zero_2050).toBe(0));
  it("all numeric values are positive or zero",() => Object.values(BENCHMARKS).forEach(v => expect(v).toBeGreaterThanOrEqual(0)));
  it("uk_average is a reasonable value (1–20t)",() => {
    expect(BENCHMARKS.uk_average).toBeGreaterThan(1);
    expect(BENCHMARKS.uk_average).toBeLessThan(20);
  });
});

/* ============================================================
   20. Integration tests — end-to-end
   ============================================================ */
describe("Integration — calculate → store → retrieve", () => {
  it("full round-trip preserves footprint data", () => {
    mockStorage.clear();
    const fp = EcoUtils.calculateFootprint(BASE_INPUTS);
    const entry = {
      date:  new Date().toISOString(),
      total: EcoUtils.totalFootprint(fp),
      ...fp,
    };
    EcoUtils.storageSet("ecotrace_test_history", [entry]);
    const history = EcoUtils.storageGet("ecotrace_test_history", []);
    expect(history.length).toBe(1);
    expect(history[0].total).toBeCloseTo(entry.total, 3);
    expect(history[0].transport).toBe(fp.transport);
  });

  it("biggestCategory works on calculated footprint", () => {
    const fp  = EcoUtils.calculateFootprint({ ...ZERO_INPUTS, beef_meals: 14 });
    const cat = EcoUtils.biggestCategory(fp);
    expect(cat).toBe("food");
  });

  it("percentDelta on calculated vs benchmark", () => {
    const fp    = EcoUtils.calculateFootprint(BASE_INPUTS);
    const total = EcoUtils.totalFootprint(fp);
    const delta = EcoUtils.percentDelta(total, BENCHMARKS.uk_average);
    expect(typeof delta).toBe("number");
    expect(Number.isFinite(delta)).toBeTruthy();
  });

  it("formatEmission on calculated total returns string with 't'", () => {
    const fp     = EcoUtils.calculateFootprint(BASE_INPUTS);
    const total  = EcoUtils.totalFootprint(fp);
    const label  = EcoUtils.formatEmission(total);
    expect(label).toContain("t");
    expect(typeof label).toBe("string");
  });

  it("multiple history entries accumulate correctly", () => {
    mockStorage.clear();
    const fp1 = EcoUtils.calculateFootprint(BASE_INPUTS);
    const fp2 = EcoUtils.calculateFootprint({ ...BASE_INPUTS, car_km: 5000 });
    const history = [
      { date: new Date().toISOString(), total: EcoUtils.totalFootprint(fp1), ...fp1 },
      { date: new Date().toISOString(), total: EcoUtils.totalFootprint(fp2), ...fp2 },
    ];
    EcoUtils.storageSet("ecotrace_history_multi", history);
    const retrieved = EcoUtils.storageGet("ecotrace_history_multi", []);
    expect(retrieved.length).toBe(2);
    expect(retrieved[1].transport).toBeLessThan(retrieved[0].transport);
  });
});