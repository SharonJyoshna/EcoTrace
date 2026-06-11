/**
 * tests/utils.test.js
 * Unit tests for EcoUtils — run in browser via tests/index.html
 * or with any test runner that supports vanilla JS globals.
 *
 * Uses a minimal built-in assertion library (no dependencies).
 */

"use strict";

/* ============================================================
   Minimal test harness (no external dependency)
   ============================================================ */
var TestRunner = (() => {
  const results = [];
  let currentSuite = "Global";

  function describe(name, fn) {
    currentSuite = name;
    fn();
    currentSuite = "Global";
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
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toEqual(expected) {
        const a = JSON.stringify(actual);
        const b = JSON.stringify(expected);
        if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
      },
      toBeCloseTo(expected, precision = 2) {
        const delta = Math.abs(actual - expected);
        const limit = Math.pow(10, -precision) / 2;
        if (delta > limit) throw new Error(`Expected ~${expected} (±${limit}), got ${actual}`);
      },
      toBeGreaterThan(n) {
        if (actual <= n) throw new Error(`Expected ${actual} > ${n}`);
      },
      toBeLessThan(n) {
        if (actual >= n) throw new Error(`Expected ${actual} < ${n}`);
      },
      toBeLessThanOrEqual(n) {
        if (actual > n) throw new Error(`Expected ${actual} <= ${n}`);
      },
      toBeGreaterThanOrEqual(n) {
        if (actual < n) throw new Error(`Expected ${actual} >= ${n}`);
      },
      toBeTruthy() {
        if (!actual) throw new Error(`Expected truthy, got ${actual}`);
      },
      toBeFalsy() {
        if (actual) throw new Error(`Expected falsy, got ${actual}`);
      },
      toContain(item) {
        if (!actual.includes(item)) throw new Error(`Expected to contain ${item}`);
      },
      toThrow() {
        if (typeof actual !== "function") throw new Error("Expected a function");
        try {
          actual();
          throw new Error("Expected function to throw but it did not");
        } catch (e) {
          if (e.message === "Expected function to throw but it did not") throw e;
        }
      },
    };
  }

  function report() {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    return { results, passed, failed, total: results.length };
  }

  return { describe, it, expect, report };
})();

var { describe, it, expect } = TestRunner;

/* ============================================================
   Mock localStorage for isolated testing
   ============================================================ */
const mockStorage = (() => {
  let store = {};
  return {
    getItem:    key       => store[key] !== undefined ? store[key] : null,
    setItem:    (key, v)  => { store[key] = String(v); },
    removeItem: key       => { delete store[key]; },
    clear:      ()        => { store = {}; },
  };
})();

// Patch global localStorage for tests
Object.defineProperty(window, "localStorage", { value: mockStorage, writable: true });

/* ============================================================
   Test Suites
   ============================================================ */

describe("EcoUtils.sanitizeNumber", () => {
  it("returns the number when valid", () => {
    expect(EcoUtils.sanitizeNumber(42)).toBe(42);
  });
  it("clamps to minimum", () => {
    expect(EcoUtils.sanitizeNumber(-10, 0, 100)).toBe(0);
  });
  it("clamps to maximum", () => {
    expect(EcoUtils.sanitizeNumber(999, 0, 100)).toBe(100);
  });
  it("returns fallback for NaN", () => {
    expect(EcoUtils.sanitizeNumber("abc", 0, 100, 5)).toBe(5);
  });
  it("returns fallback for undefined", () => {
    expect(EcoUtils.sanitizeNumber(undefined, 0, 100, 7)).toBe(7);
  });
  it("parses numeric strings", () => {
    expect(EcoUtils.sanitizeNumber("15.5", 0, 100, 0)).toBe(15.5);
  });
  it("handles Infinity", () => {
    expect(EcoUtils.sanitizeNumber(Infinity, 0, 1000, 0)).toBe(1000);
  });
  it("handles negative Infinity", () => {
    expect(EcoUtils.sanitizeNumber(-Infinity, 0, 1000, 0)).toBe(0);
  });
});

describe("EcoUtils.sanitizeSelect", () => {
  const allowed = ["car_petrol", "car_diesel", "car_electric"];
  it("returns value when in allowed list", () => {
    expect(EcoUtils.sanitizeSelect("car_petrol", allowed, "car_petrol")).toBe("car_petrol");
  });
  it("returns fallback when not in allowed list", () => {
    expect(EcoUtils.sanitizeSelect("rocket", allowed, "car_petrol")).toBe("car_petrol");
  });
  it("returns fallback for empty string", () => {
    expect(EcoUtils.sanitizeSelect("", allowed, "car_petrol")).toBe("car_petrol");
  });
  it("is case-sensitive", () => {
    expect(EcoUtils.sanitizeSelect("Car_Petrol", allowed, "car_petrol")).toBe("car_petrol");
  });
});

describe("EcoUtils.sanitizeString", () => {
  it("escapes < and >", () => {
    const result = EcoUtils.sanitizeString("<script>alert(1)</script>");
    expect(result.includes("<")).toBeFalsy();
    expect(result.includes(">")).toBeFalsy();
  });
  it("escapes &", () => {
    const result = EcoUtils.sanitizeString("foo & bar");
    expect(result).toContain("&amp;");
  });
  it("escapes double quotes", () => {
    const result = EcoUtils.sanitizeString('"hello"');
    expect(result).toContain("&quot;");
  });
  it("handles normal strings unchanged in content", () => {
    expect(EcoUtils.sanitizeString("hello world")).toBe("hello world");
  });
});

describe("EcoUtils.storageGet and storageSet", () => {
  it("stores and retrieves a value", () => {
    mockStorage.clear();
    EcoUtils.storageSet("test_key", { value: 42 });
    const result = EcoUtils.storageGet("test_key", null);
    expect(result).toEqual({ value: 42 });
  });
  it("returns default when key does not exist", () => {
    mockStorage.clear();
    const result = EcoUtils.storageGet("nonexistent", "default");
    expect(result).toBe("default");
  });
  it("handles storing arrays", () => {
    mockStorage.clear();
    EcoUtils.storageSet("arr_key", [1, 2, 3]);
    const result = EcoUtils.storageGet("arr_key", []);
    expect(result).toEqual([1, 2, 3]);
  });
  it("returns true on successful save", () => {
    const ok = EcoUtils.storageSet("save_test", 123);
    expect(ok).toBe(true);
  });
});

describe("EcoUtils.storageRemove", () => {
  it("removes the key from storage", () => {
    mockStorage.clear();
    EcoUtils.storageSet("remove_me", 99);
    EcoUtils.storageRemove("remove_me");
    const result = EcoUtils.storageGet("remove_me", "gone");
    expect(result).toBe("gone");
  });
});

describe("EcoUtils.calculateFootprint", () => {
  const baseInputs = {
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
  };

  it("returns an object with four categories", () => {
    const result = EcoUtils.calculateFootprint(baseInputs);
    expect(Object.keys(result).length).toBe(4);
    expect(typeof result.transport).toBe("number");
    expect(typeof result.energy).toBe("number");
    expect(typeof result.food).toBe("number");
    expect(typeof result.lifestyle).toBe("number");
  });

  it("all category values are non-negative", () => {
    const result = EcoUtils.calculateFootprint(baseInputs);
    expect(result.transport).toBeGreaterThanOrEqual(0);
    expect(result.energy).toBeGreaterThanOrEqual(0);
    expect(result.food).toBeGreaterThanOrEqual(0);
    expect(result.lifestyle).toBeGreaterThanOrEqual(0);
  });

  it("electric car has lower transport emissions than petrol", () => {
    const petrol   = EcoUtils.calculateFootprint({ ...baseInputs, car_type: "car_petrol" });
    const electric = EcoUtils.calculateFootprint({ ...baseInputs, car_type: "car_electric" });
    expect(electric.transport).toBeLessThan(petrol.transport);
  });

  it("zero inputs yield near-zero totals", () => {
    const zero = {
      car_km: 0, car_type: "car_petrol", bus_km: 0, train_km: 0, flights: 0,
      electricity_kwh: 0, gas_m3: 0,
      beef_meals: 0, chicken_meals: 0, veg_meals: 0, dairy_daily: 0,
      new_clothes: 0, streaming_hrs: 0, devices: 0,
    };
    const result = EcoUtils.calculateFootprint(zero);
    expect(EcoUtils.totalFootprint(result)).toBeCloseTo(0, 2);
  });

  it("transport increases with more driving", () => {
    const low  = EcoUtils.calculateFootprint({ ...baseInputs, car_km: 1000 });
    const high = EcoUtils.calculateFootprint({ ...baseInputs, car_km: 50000 });
    expect(high.transport).toBeGreaterThan(low.transport);
  });

  it("flights increase transport emissions", () => {
    const noFlight  = EcoUtils.calculateFootprint({ ...baseInputs, flights: 0 });
    const twoFlights = EcoUtils.calculateFootprint({ ...baseInputs, flights: 2 });
    expect(twoFlights.transport).toBeGreaterThan(noFlight.transport);
  });

  it("more beef meals mean higher food emissions", () => {
    const lowMeat  = EcoUtils.calculateFootprint({ ...baseInputs, beef_meals: 0 });
    const highMeat = EcoUtils.calculateFootprint({ ...baseInputs, beef_meals: 7 });
    expect(highMeat.food).toBeGreaterThan(lowMeat.food);
  });

  it("gas heating adds to energy emissions", () => {
    const noGas  = EcoUtils.calculateFootprint({ ...baseInputs, gas_m3: 0 });
    const withGas = EcoUtils.calculateFootprint({ ...baseInputs, gas_m3: 500 });
    expect(withGas.energy).toBeGreaterThan(noGas.energy);
  });

  it("sanitises invalid car_type gracefully", () => {
    const result = EcoUtils.calculateFootprint({ ...baseInputs, car_type: "rocket_ship" });
    expect(result.transport).toBeGreaterThanOrEqual(0);
  });

  it("sanitises negative car_km to 0", () => {
    const result = EcoUtils.calculateFootprint({ ...baseInputs, car_km: -5000 });
    expect(result.transport).toBeGreaterThanOrEqual(0);
  });

  it("values are rounded to 3 decimal places", () => {
    const result = EcoUtils.calculateFootprint(baseInputs);
    const decimals = v => (v.toString().split(".")[1] || "").length;
    expect(decimals(result.transport)).toBeLessThanOrEqual(3);
    expect(decimals(result.energy)).toBeLessThanOrEqual(3);
  });
});

describe("EcoUtils.totalFootprint", () => {
  it("sums all category values", () => {
    const fp = { transport: 1.0, energy: 0.5, food: 2.0, lifestyle: 0.3 };
    expect(EcoUtils.totalFootprint(fp)).toBeCloseTo(3.8, 5);
  });
  it("returns 0 for all-zero footprint", () => {
    expect(EcoUtils.totalFootprint({ transport: 0, energy: 0, food: 0, lifestyle: 0 })).toBe(0);
  });
  it("handles floating point correctly", () => {
    const fp = { transport: 0.1, energy: 0.2, food: 0.3, lifestyle: 0.4 };
    expect(EcoUtils.totalFootprint(fp)).toBeCloseTo(1.0, 5);
  });
});

describe("EcoUtils.biggestCategory", () => {
  it("identifies the correct biggest category", () => {
    const fp = { transport: 3.0, energy: 1.0, food: 2.0, lifestyle: 0.5 };
    expect(EcoUtils.biggestCategory(fp)).toBe("transport");
  });
  it("returns food when food is biggest", () => {
    const fp = { transport: 0.5, energy: 0.5, food: 4.0, lifestyle: 0.3 };
    expect(EcoUtils.biggestCategory(fp)).toBe("food");
  });
  it("returns energy when energy is biggest", () => {
    const fp = { transport: 1.0, energy: 5.0, food: 2.0, lifestyle: 0.5 };
    expect(EcoUtils.biggestCategory(fp)).toBe("energy");
  });
});

describe("EcoUtils.percentDelta", () => {
  it("calculates positive delta", () => {
    expect(EcoUtils.percentDelta(6.0, 5.0)).toBeCloseTo(20, 1);
  });
  it("calculates negative delta", () => {
    expect(EcoUtils.percentDelta(4.0, 5.0)).toBeCloseTo(-20, 1);
  });
  it("returns 0 when base is 0", () => {
    expect(EcoUtils.percentDelta(10, 0)).toBe(0);
  });
  it("returns 0 when values are equal", () => {
    expect(EcoUtils.percentDelta(5, 5)).toBe(0);
  });
});

describe("EcoUtils.formatEmission", () => {
  it("formats with default 1 decimal", () => {
    expect(EcoUtils.formatEmission(3.567)).toBe("3.6t");
  });
  it("respects custom decimals", () => {
    expect(EcoUtils.formatEmission(3.567, 2)).toBe("3.57t");
  });
  it("respects custom unit", () => {
    expect(EcoUtils.formatEmission(3.5, 1, " kg")).toBe("3.5 kg");
  });
});

describe("EcoUtils.formatDate", () => {
  it("returns a non-empty string for a valid ISO date", () => {
    const result = EcoUtils.formatDate("2024-06-15T10:00:00.000Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
  it("returns the input string on invalid date", () => {
    const result = EcoUtils.formatDate("not-a-date");
    expect(typeof result).toBe("string");
  });
});

describe("Constants integrity", () => {
  it("EMISSION_FACTORS has all four category keys", () => {
    expect(typeof EMISSION_FACTORS.transport).toBe("object");
    expect(typeof EMISSION_FACTORS.energy).toBe("object");
    expect(typeof EMISSION_FACTORS.food).toBe("object");
    expect(typeof EMISSION_FACTORS.lifestyle).toBe("object");
  });

  it("all transport emission factors are positive numbers", () => {
    Object.values(EMISSION_FACTORS.transport).forEach(v => {
      expect(v).toBeGreaterThan(0);
    });
  });

  it("electric car has lower factor than petrol", () => {
    expect(EMISSION_FACTORS.transport.car_electric).toBeLessThan(EMISSION_FACTORS.transport.car_petrol);
  });

  it("CATEGORY_COLORS has four entries", () => {
    expect(Object.keys(CATEGORY_COLORS).length).toBe(4);
  });

  it("CATEGORY_COLORS values are valid hex strings", () => {
    Object.values(CATEGORY_COLORS).forEach(c => {
      expect(c.startsWith("#")).toBeTruthy();
      expect(c.length).toBe(7);
    });
  });

  it("ACTIONS_CATALOGUE has 12 entries", () => {
    expect(ACTIONS_CATALOGUE.length).toBe(12);
  });

  it("each action has required fields", () => {
    ACTIONS_CATALOGUE.forEach(action => {
      expect(typeof action.id).toBe("number");
      expect(typeof action.title).toBe("string");
      expect(typeof action.saving).toBe("number");
      expect(["high", "medium", "low"]).toContain(action.impact);
      expect(["transport", "energy", "food", "lifestyle"]).toContain(action.category);
    });
  });

  it("BENCHMARKS paris target is less than uk average", () => {
    expect(BENCHMARKS.paris_2030).toBeLessThan(BENCHMARKS.uk_average);
  });
});