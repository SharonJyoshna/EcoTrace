/**
 * components/Calculator.js
 * Multi-section carbon calculator with live preview.
 * All inputs are sanitised via EcoUtils before calculation.
 */

"use strict";

function Calculator({ footprint, setFootprint, addHistory }) {
  const { createElement: h, useState, useCallback } = React;

  const [activeTab, setActiveTab] = useState("transport");
  const [vals, setVals] = useState({
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

  /** Update a single field; numbers are sanitised immediately */
  const update = useCallback((key, rawValue) => {
    setVals(prev => ({
      ...prev,
      [key]: typeof rawValue === "string" && isNaN(+rawValue)
        ? EcoUtils.sanitizeSelect(rawValue, Object.keys(EMISSION_FACTORS.transport), prev[key])
        : EcoUtils.sanitizeNumber(rawValue, 0, 1_000_000, 0),
    }));
  }, []);

  const preview = EcoUtils.calculateFootprint(vals);
  const previewTotal = EcoUtils.totalFootprint(preview);

  const handleSave = () => {
    const fp = EcoUtils.calculateFootprint(vals);
    setFootprint(fp);
    addHistory({
      date:  new Date().toISOString(),
      total: EcoUtils.totalFootprint(fp),
      ...fp,
    });
    // Announce to screen readers
    const liveRegion = document.getElementById("calc-save-announce");
    if (liveRegion) liveRegion.textContent = "Footprint saved! View your dashboard for the updated results.";
    alert("Footprint saved! Check your dashboard.");
  };

  const tabs = [
    { id: "transport", icon: "🚗", label: "Transport" },
    { id: "energy",    icon: "⚡", label: "Energy"    },
    { id: "food",      icon: "🍽️", label: "Food"      },
    { id: "lifestyle", icon: "🛍️", label: "Lifestyle" },
  ];

  /* Reusable field row */
  const FieldRow = ({ id, label, hint, children }) =>
    h("div", { style: { marginBottom: 16 } },
      h("label", {
        htmlFor: id,
        style: { display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text2)" },
      },
        label,
        hint && h("span", { style: { fontWeight: 400, color: "var(--text3)", marginLeft: 4 } }, hint),
      ),
      children,
    );

  const inputStyle = {
    width: "100%", padding: "8px 12px",
    border: "1px solid var(--border2)",
    borderRadius: "var(--radius)",
    background: "var(--bg)", color: "var(--text)",
    fontSize: 14,
  };

  return h("main", {
    id: "main-content",
    tabIndex: -1,
    role: "tabpanel",
    "aria-labelledby": "nav-tab-calculator",
    style: { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
  },
    /* Screen reader live region */
    h("div", { id: "calc-save-announce", "aria-live": "polite", className: "sr-only" }),

    h("h1", { style: { fontSize: 22, fontWeight: 600, marginBottom: 4 } }, "Carbon calculator"),
    h("p", { style: { color: "var(--text2)", fontSize: 14, marginBottom: 24 } },
      "Answer honestly — all your data stays in your browser and is never sent anywhere."),

    h("div", { style: { display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" } },

      /* Left: tabbed form */
      h("div", {
        style: { background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" },
      },
        /* Tab bar */
        h("div", {
          role: "tablist",
          "aria-label": "Calculator sections",
          style: { display: "flex", borderBottom: "0.5px solid var(--border)" },
        },
          tabs.map(t => h("button", {
            key: t.id,
            id: `calc-tab-${t.id}`,
            role: "tab",
            "aria-selected": activeTab === t.id,
            "aria-controls": `calc-panel-${t.id}`,
            tabIndex: activeTab === t.id ? 0 : -1,
            onClick: () => setActiveTab(t.id),
            style: {
              flex: 1, padding: "12px 8px", background: "none", border: "none",
              borderBottom: `2px solid ${activeTab === t.id ? "var(--green-400)" : "transparent"}`,
              color: activeTab === t.id ? "var(--green-400)" : "var(--text2)",
              fontSize: 12, fontWeight: activeTab === t.id ? 500 : 400, cursor: "pointer",
            },
          }, t.icon, " ", t.label))
        ),

        /* Tab panels */
        h("div", { style: { padding: "20px" } },

          activeTab === "transport" && h("section", {
            id: "calc-panel-transport",
            role: "tabpanel",
            "aria-labelledby": "calc-tab-transport",
          },
            h("h2", { className: "sr-only" }, "Transport emissions"),
            h(FieldRow, { id: "car_type", label: "Car type" },
              h("select", {
                id: "car_type",
                value: vals.car_type,
                onChange: e => update("car_type", e.target.value),
                style: inputStyle,
                "aria-describedby": "car_type_hint",
              },
                h("option", { value: "car_petrol" },   "Petrol car"),
                h("option", { value: "car_diesel" },   "Diesel car"),
                h("option", { value: "car_electric" }, "Electric car"),
                h("option", { value: "motorcycle" },   "Motorcycle"),
              ),
            ),
            h(FieldRow, { id: "car_km", label: "Distance driven per year", hint: "(km)" },
              h("input", { id: "car_km", type: "number", min: 0, max: 200000, value: vals.car_km, onChange: e => update("car_km", e.target.value), style: inputStyle }),
            ),
            h(FieldRow, { id: "bus_km", label: "Bus travel per year", hint: "(km)" },
              h("input", { id: "bus_km", type: "number", min: 0, value: vals.bus_km, onChange: e => update("bus_km", e.target.value), style: inputStyle }),
            ),
            h(FieldRow, { id: "train_km", label: "Train travel per year", hint: "(km)" },
              h("input", { id: "train_km", type: "number", min: 0, value: vals.train_km, onChange: e => update("train_km", e.target.value), style: inputStyle }),
            ),
            h(FieldRow, { id: "flights", label: "Return long-haul flights per year" },
              h("input", { id: "flights", type: "number", min: 0, max: 365, value: vals.flights, onChange: e => update("flights", e.target.value), style: inputStyle }),
            ),
          ),

          activeTab === "energy" && h("section", {
            id: "calc-panel-energy",
            role: "tabpanel",
            "aria-labelledby": "calc-tab-energy",
          },
            h("h2", { className: "sr-only" }, "Home energy emissions"),
            h(FieldRow, { id: "electricity_kwh", label: "Electricity use per year", hint: "(kWh — avg UK home: 3,000–4,000)" },
              h("input", { id: "electricity_kwh", type: "number", min: 0, value: vals.electricity_kwh, onChange: e => update("electricity_kwh", e.target.value), style: inputStyle }),
            ),
            h(FieldRow, { id: "gas_m3", label: "Natural gas use per year", hint: "(m³ — enter 0 if not applicable)" },
              h("input", { id: "gas_m3", type: "number", min: 0, value: vals.gas_m3, onChange: e => update("gas_m3", e.target.value), style: inputStyle }),
            ),
          ),

          activeTab === "food" && h("section", {
            id: "calc-panel-food",
            role: "tabpanel",
            "aria-labelledby": "calc-tab-food",
          },
            h("h2", { className: "sr-only" }, "Food emissions"),
            h(FieldRow, { id: "beef_meals", label: "Beef or lamb meals per week" },
              h("input", { id: "beef_meals", type: "number", min: 0, max: 21, value: vals.beef_meals, onChange: e => update("beef_meals", e.target.value), style: inputStyle }),
            ),
            h(FieldRow, { id: "chicken_meals", label: "Chicken or fish meals per week" },
              h("input", { id: "chicken_meals", type: "number", min: 0, max: 21, value: vals.chicken_meals, onChange: e => update("chicken_meals", e.target.value), style: inputStyle }),
            ),
            h(FieldRow, { id: "veg_meals", label: "Vegetarian or vegan meals per week" },
              h("input", { id: "veg_meals", type: "number", min: 0, max: 21, value: vals.veg_meals, onChange: e => update("veg_meals", e.target.value), style: inputStyle }),
            ),
            h(FieldRow, { id: "dairy_daily", label: "Dairy servings per day" },
              h("input", { id: "dairy_daily", type: "number", min: 0, max: 20, value: vals.dairy_daily, onChange: e => update("dairy_daily", e.target.value), style: inputStyle }),
            ),
          ),

          activeTab === "lifestyle" && h("section", {
            id: "calc-panel-lifestyle",
            role: "tabpanel",
            "aria-labelledby": "calc-tab-lifestyle",
          },
            h("h2", { className: "sr-only" }, "Lifestyle emissions"),
            h(FieldRow, { id: "new_clothes", label: "New clothing items bought per year" },
              h("input", { id: "new_clothes", type: "number", min: 0, value: vals.new_clothes, onChange: e => update("new_clothes", e.target.value), style: inputStyle }),
            ),
            h(FieldRow, { id: "streaming_hrs", label: "Daily streaming hours (Netflix, YouTube…)" },
              h("input", { id: "streaming_hrs", type: "number", min: 0, max: 24, value: vals.streaming_hrs, onChange: e => update("streaming_hrs", e.target.value), style: inputStyle }),
            ),
            h(FieldRow, { id: "devices", label: "Electronic devices replaced per year" },
              h("input", { id: "devices", type: "number", min: 0, value: vals.devices, onChange: e => update("devices", e.target.value), style: inputStyle }),
            ),
          ),
        ),
      ),

      /* Right: live preview */
      h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
        h("div", {
          role: "region",
          "aria-label": "Live carbon estimate",
          "aria-live": "polite",
          style: { background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" },
        },
          h("p", { style: { fontSize: 13, fontWeight: 500, marginBottom: 12 } }, "Live estimate"),
          h("div", { style: { textAlign: "center", marginBottom: 16 } },
            h("p", { style: { fontSize: 40, fontWeight: 600, color: "var(--green-400)", lineHeight: 1 } }, previewTotal.toFixed(1)),
            h("p", { style: { fontSize: 13, color: "var(--text2)", marginTop: 4 } }, "tonnes CO₂e / year"),
          ),

          ["transport", "energy", "food", "lifestyle"].map(cat =>
            h("div", {
              key: cat,
              style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
            },
              h("span", { style: { fontSize: 12, color: "var(--text2)" } },
                h("span", { "aria-hidden": "true" }, CATEGORY_ICONS[cat], " "),
                cat.charAt(0).toUpperCase() + cat.slice(1),
              ),
              h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                h("div", {
                  role: "progressbar",
                  "aria-valuenow": preview[cat],
                  "aria-valuemin": 0,
                  "aria-valuemax": previewTotal || 1,
                  "aria-label": `${cat} ${preview[cat].toFixed(2)} tonnes`,
                  style: { width: 80, height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" },
                },
                  h("div", {
                    style: {
                      width: `${Math.min(100, (preview[cat] / (previewTotal || 0.01)) * 100)}%`,
                      height: "100%",
                      background: CATEGORY_COLORS[cat],
                      borderRadius: 3,
                      transition: "width 0.3s ease",
                    },
                  }),
                ),
                h("span", { style: { fontSize: 12, fontWeight: 500, minWidth: 36, textAlign: "right" } },
                  preview[cat].toFixed(2), "t"),
              ),
            )
          ),

          h("button", {
            onClick: handleSave,
            style: {
              width: "100%", marginTop: 12, padding: "10px 0",
              background: "var(--green-400)", color: "#fff",
              border: "none", borderRadius: "var(--radius)",
              fontWeight: 500, fontSize: 14, cursor: "pointer",
            },
            "aria-label": "Save carbon footprint estimate to dashboard",
          }, "Save to dashboard ✓"),
        ),

        h("div", {
          role: "note",
          style: { background: "var(--green-50)", border: "0.5px solid var(--green-100)", borderRadius: "var(--radius-lg)", padding: 16 },
        },
          h("p", { style: { fontSize: 12, color: "var(--green-600)", fontWeight: 500, marginBottom: 6 } }, "🌍 Context"),
          h("p", { style: { fontSize: 12, color: "var(--green-600)" } },
            `World avg: ${BENCHMARKS.world_average}t | UK avg: ${BENCHMARKS.uk_average}t | Paris 2030 target: ${BENCHMARKS.paris_2030}t`),
        ),
      ),
    ),
  );
}