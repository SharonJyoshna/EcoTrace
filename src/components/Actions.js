/**
 * components/Actions.js
 * Personalised action plan — sorted by category relevance and impact.
 * Checkbox state is persisted by the parent (App.js).
 */

"use strict";

function Actions({ footprint, actions, setActions }) {
  const { createElement: h } = React;

  const biggestCat = EcoUtils.biggestCategory(footprint);

  /* Sort: biggest-category actions first, then by impact level */
  const impactOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...ACTIONS_CATALOGUE].sort((a, b) => {
    if (a.category === biggestCat && b.category !== biggestCat) return -1;
    if (b.category === biggestCat && a.category !== biggestCat) return  1;
    return impactOrder[a.impact] - impactOrder[b.impact];
  });

  const toggle = id =>
    setActions(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));

  const getAction  = id => actions.find(a => a.id === id) || { done: false };

  const totalSaved = actions
    .filter(a => a.done)
    .reduce((s, a) => {
      const found = ACTIONS_CATALOGUE.find(x => x.id === a.id);
      return s + (found?.saving || 0);
    }, 0);

  const impactColors = { high: "var(--green-400)", medium: "var(--amber-400)", low: "var(--gray-400)" };
  const catBg  = { transport: "var(--green-50)",  energy: "var(--teal-50)",  food: "var(--amber-50)",  lifestyle: "var(--coral-50)"  };
  const catClr = { transport: "var(--green-600)", energy: "var(--teal-600)", food: "var(--amber-400)", lifestyle: "var(--coral-400)" };

  return h("main", {
    id: "main-content", tabIndex: -1, role: "tabpanel", "aria-labelledby": "nav-tab-actions",
    style: { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
  },
    h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 } },
      h("div", null,
        h("h1", { style: { fontSize: 22, fontWeight: 600, marginBottom: 4 } }, "Action plan"),
        h("p",  { style: { color: "var(--text2)", fontSize: 14 } }, "Personalised actions sorted by impact for your profile."),
      ),
      h("div", { style: { textAlign: "right" }, "aria-live": "polite", "aria-atomic": "true" },
        h("p", { style: { fontSize: 28, fontWeight: 600, color: "var(--green-400)", lineHeight: 1 } }, totalSaved.toFixed(2), "t"),
        h("p", { style: { fontSize: 12, color: "var(--text3)" } }, "CO₂e saved"),
      ),
    ),

    h("ul", {
      style: { display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0 },
      "aria-label": "Carbon reduction action checklist",
    },
      sorted.map(action => {
        const done = getAction(action.id).done;
        return h("li", {
          key: action.id,
          style: {
            background: "var(--bg)", border: "0.5px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "16px 20px",
            display: "flex", gap: 16, alignItems: "flex-start",
            opacity: done ? 0.6 : 1, transition: "opacity 0.2s",
          },
        },
          h("div", null,
            h("input", {
              type: "checkbox",
              id: `action-${action.id}`,
              checked: done,
              onChange: () => toggle(action.id),
              "aria-label": `Mark "${action.title}" as ${done ? "incomplete" : "complete"}`,
              style: { width: 18, height: 18, cursor: "pointer", accentColor: "var(--green-400)", marginTop: 2 },
            }),
          ),
          h("div", { style: { flex: 1 } },
            h("label", {
              htmlFor: `action-${action.id}`,
              style: {
                display: "flex", alignItems: "center", gap: 8, marginBottom: 4, cursor: "pointer",
              },
            },
              h("span", {
                style: {
                  fontSize: 14, fontWeight: 500,
                  textDecoration: done ? "line-through" : "none",
                  color: done ? "var(--text3)" : "var(--text)",
                },
              }, action.title),
              h("span", {
                style: {
                  fontSize: 10, padding: "2px 8px", borderRadius: 10,
                  background: catBg[action.category],
                  color: catClr[action.category],
                },
                "aria-label": `Category: ${action.category}`,
              }, CATEGORY_ICONS[action.category], " ", action.category),
            ),
            h("p", { style: { fontSize: 13, color: "var(--text2)", marginBottom: 8 } }, action.description),
            h("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" }, "aria-label": "Action metadata" },
              h("span", { style: { fontSize: 11, color: impactColors[action.impact], fontWeight: 500 } },
                "● ", action.impact, " impact"),
              h("span", { style: { fontSize: 11, color: "var(--text3)" } },
                "saves ~", action.saving, "t CO₂e/yr"),
              h("span", { style: { fontSize: 11, color: "var(--text3)" } },
                "effort: ", action.effort),
            ),
          ),
        );
      })
    ),
  );
}