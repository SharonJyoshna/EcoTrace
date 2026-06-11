/**
 * components/MetricCard.js
 * Reusable metric display card with semantic markup and ARIA.
 */

"use strict";

/**
 * @param {object} props
 * @param {string} props.label  - Metric label
 * @param {string|number} props.value - Primary value to display
 * @param {string} [props.unit]   - Unit string displayed after value
 * @param {string} [props.color]  - Left border / accent colour
 * @param {string} [props.icon]   - Decorative emoji icon
 * @param {string} [props.sub]    - Secondary/helper text below value
 */
function MetricCard({ label, value, unit = "", color, icon, sub }) {
  const { createElement: h } = React;
  const accentColor = color || "var(--green-400)";

  return h("article", {
    style: {
      background: "var(--bg)",
      border: "0.5px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: "16px 20px",
      borderLeft: `3px solid ${accentColor}`,
    },
    "aria-label": `${label}: ${value}${unit}${sub ? ". " + sub : ""}`,
  },
    h("p", {
      style: { fontSize: 12, color: "var(--text3)", marginBottom: 6 },
      "aria-hidden": "true",
    },
      icon && h("span", { "aria-hidden": "true" }, icon, " "),
      label,
    ),
    h("p", {
      style: { fontSize: 26, fontWeight: 600, color: "var(--text)", lineHeight: 1 },
    },
      value,
      unit && h("span", { style: { fontSize: 13, fontWeight: 400, color: "var(--text2)", marginLeft: 4 } }, unit),
    ),
    sub && h("p", { style: { fontSize: 12, color: "var(--text3)", marginTop: 6 } }, sub),
  );
}