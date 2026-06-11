/**
 * utils.js
 * Pure utility functions: input sanitisation, storage helpers, and
 * carbon calculation logic.  All functions are exported via the global
 * `EcoUtils` namespace so they can be tested independently of React.
 */

"use strict";

const EcoUtils = (() => {

  /* ----------------------------------------------------------------
     Security — Input sanitisation
     ---------------------------------------------------------------- */

  /**
   * Sanitise a numeric input value.
   * Returns a clamped, finite number or the provided fallback.
   *
   * @param {*}      value    - Raw user input
   * @param {number} min      - Minimum allowed value (default 0)
   * @param {number} max      - Maximum allowed value (default 1_000_000)
   * @param {number} fallback - Value to return if input is invalid
   * @returns {number}
   */
  function sanitizeNumber(value, min = 0, max = 1_000_000, fallback = 0) {
    const n = parseFloat(value);
    if (Number.isNaN(n)) return fallback;
    if (n === Infinity) return max;
    if (n === -Infinity) return min;
    return Math.min(max, Math.max(min, n));
  }

  /**
   * Sanitise a string value from a select/option element.
   * Returns the value only if it exists in the allowed set.
   *
   * @param {string}   value   - Raw user input
   * @param {string[]} allowed - Whitelist of acceptable values
   * @param {string}   fallback
   * @returns {string}
   */
  function sanitizeSelect(value, allowed, fallback) {
    return allowed.includes(String(value)) ? String(value) : fallback;
  }

  /**
   * Strip any HTML tags from a string to prevent XSS.
   * @param {string} str
   * @returns {string}
   */
  function sanitizeString(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ----------------------------------------------------------------
     LocalStorage helpers
     ---------------------------------------------------------------- */

  /**
   * Safely read a JSON value from localStorage.
   * Returns `defaultValue` on any error.
   *
   * @param {string} key
   * @param {*}      defaultValue
   * @returns {*}
   */
  function storageGet(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Safely write a JSON value to localStorage.
   * Silently fails if storage is unavailable (private browsing, quota exceeded).
   *
   * @param {string} key
   * @param {*}      value
   * @returns {boolean} true if written successfully
   */
  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safely remove a key from localStorage.
   * @param {string} key
   */
  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }

  /* ----------------------------------------------------------------
     Carbon calculation engine
     ---------------------------------------------------------------- */

  /**
   * Calculate annual carbon footprint (in tCO₂e) from user inputs.
   *
   * All inputs are sanitised internally — callers do not need to
   * pre-sanitise values.
   *
   * @param {object} inputs - Raw form values
   * @returns {{ transport: number, energy: number, food: number, lifestyle: number }}
   */
  function calculateFootprint(inputs) {
    const ef = EMISSION_FACTORS;

    // --- Transport (kg → tonnes) ---
    const carKm        = sanitizeNumber(inputs.car_km,          0, 200_000, 0);
    const busKm        = sanitizeNumber(inputs.bus_km,          0, 200_000, 0);
    const trainKm      = sanitizeNumber(inputs.train_km,        0, 200_000, 0);
    const flights      = sanitizeNumber(inputs.flights,         0, 365,     0);
    const carType      = sanitizeSelect(inputs.car_type, Object.keys(ef.transport), "car_petrol");

    const transportKg  = (carKm   * ef.transport[carType])
                       + (busKm   * ef.transport.bus)
                       + (trainKm * ef.transport.train)
                       + (flights * ef.transport.flight_international * 2 * 1000); // round-trip, avg 1000 km/flight
    const transport    = transportKg / 1000;

    // --- Energy ---
    const elecKwh      = sanitizeNumber(inputs.electricity_kwh, 0, 100_000, 0);
    const gasM3        = sanitizeNumber(inputs.gas_m3,          0, 10_000,  0);

    const energyKg     = (elecKwh * ef.energy.electricity)
                       + (gasM3   * ef.energy.natural_gas);
    const energy       = energyKg / 1000;

    // --- Food (meals per week × 52 weeks × avg serving 0.2 kg × factor) ---
    const beefMeals    = sanitizeNumber(inputs.beef_meals,    0, 21, 0);
    const chickenMeals = sanitizeNumber(inputs.chicken_meals, 0, 21, 0);
    const vegMeals     = sanitizeNumber(inputs.veg_meals,     0, 21, 0);
    const dairyDaily   = sanitizeNumber(inputs.dairy_daily,   0, 20, 0);

    const foodKg       = (beefMeals    * 52 * ef.food.beef        * 0.2)
                       + (chickenMeals * 52 * ef.food.chicken      * 0.2)
                       + (vegMeals     * 52 * ef.food.vegetables   * 0.2)
                       + (dairyDaily   * 365 * ef.food.dairy       * 0.25);
    const food         = foodKg / 1000;

    // --- Lifestyle ---
    const newClothes   = sanitizeNumber(inputs.new_clothes,    0, 1000, 0);
    const streamingHrs = sanitizeNumber(inputs.streaming_hrs,  0, 24,   0);
    const devices      = sanitizeNumber(inputs.devices,        0, 20,   0);

    const lifestyleKg  = (newClothes   * ef.lifestyle.new_clothing)
                       + (streamingHrs * 365 * ef.lifestyle.streaming_hour)
                       + (devices      * ef.lifestyle.laptop_year);
    const lifestyle    = lifestyleKg / 1000;

    return {
      transport: +transport.toFixed(3),
      energy:    +energy.toFixed(3),
      food:      +food.toFixed(3),
      lifestyle: +lifestyle.toFixed(3),
    };
  }

  /**
   * Sum all categories into a single total.
   * @param {{ transport: number, energy: number, food: number, lifestyle: number }} fp
   * @returns {number}
   */
  function totalFootprint(fp) {
    return Object.values(fp).reduce((acc, v) => acc + v, 0);
  }

  /**
   * Determine the highest-emitting category.
   * @param {object} fp
   * @returns {string} category name
   */
  function biggestCategory(fp) {
    return Object.keys(fp).reduce((a, b) => fp[a] > fp[b] ? a : b, "transport");
  }

  /**
   * Format a number to a fixed number of decimal places with a unit.
   * @param {number} value
   * @param {number} decimals
   * @param {string} unit
   * @returns {string}
   */
  function formatEmission(value, decimals = 1, unit = "t") {
    return `${sanitizeNumber(value, -9999, 9999, 0).toFixed(decimals)}${unit}`;
  }

  /**
   * Calculate percentage delta between two values.
   * Returns 0 if base is 0 to avoid division by zero.
   * @param {number} current
   * @param {number} base
   * @returns {number}
   */
  function percentDelta(current, base) {
    if (base === 0) return 0;
    return ((current / base) - 1) * 100;
  }

  /* ----------------------------------------------------------------
     Date helpers
     ---------------------------------------------------------------- */

  /**
   * Format an ISO date string for display.
   * @param {string} iso
   * @returns {string}
   */
  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  /**
   * Format an ISO date string for short chart labels.
   * @param {string} iso
   * @returns {string}
   */
  function formatShortDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short",
      });
    } catch {
      return iso;
    }
  }

  /* ----------------------------------------------------------------
     Public API
     ---------------------------------------------------------------- */
  return {
    sanitizeNumber,
    sanitizeSelect,
    sanitizeString,
    storageGet,
    storageSet,
    storageRemove,
    calculateFootprint,
    totalFootprint,
    biggestCategory,
    formatEmission,
    percentDelta,
    formatDate,
    formatShortDate,
  };

})();