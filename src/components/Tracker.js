/**
 * components/Tracker.js
 * Historical emissions tracker with stacked bar chart and data table.
 */

"use strict";

function Tracker({ history }) {
  const { createElement: h, useRef, useEffect } = React;

  const chartRef  = useRef(null);
  const chartInst = useRef(null);

  useEffect(() => {
    if (!chartRef.current || history.length < 1) return;
    chartInst.current?.destroy();

    chartInst.current = new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels: history.map(e => EcoUtils.formatShortDate(e.date)),
        datasets: [
          { label: "Transport", data: history.map(e => +(e.transport || 0).toFixed(2)), backgroundColor: CATEGORY_COLORS.transport, stack: "a" },
          { label: "Energy",    data: history.map(e => +(e.energy    || 0).toFixed(2)), backgroundColor: CATEGORY_COLORS.energy,    stack: "a" },
          { label: "Food",      data: history.map(e => +(e.food      || 0).toFixed(2)), backgroundColor: CATEGORY_COLORS.food,      stack: "a" },
          { label: "Lifestyle", data: history.map(e => +(e.lifestyle || 0).toFixed(2)), backgroundColor: CATEGORY_COLORS.lifestyle, stack: "a" },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.raw}t` } } },
        scales: {
          x: { stacked: true, ticks: { maxRotation: 45 } },
          y: { stacked: true, ticks: { callback: v => v + "t" } },
        },
      },
    });

    return () => chartInst.current?.destroy();
  }, [history]);

  if (history.length === 0) {
    return h("main", {
      id: "main-content", tabIndex: -1, role: "tabpanel", "aria-labelledby": "nav-tab-tracker",
      style: { maxWidth: 960, margin: "0 auto", padding: "24px 16px", textAlign: "center" },
    },
      h("div", { style: { padding: "60px 20px", color: "var(--text3)" } },
        h("div", { "aria-hidden": "true", style: { fontSize: 48, marginBottom: 12 } }, "📊"),
        h("p", { style: { fontSize: 16, fontWeight: 500, marginBottom: 8 } }, "No data yet"),
        h("p", { style: { fontSize: 14 } }, "Use the Calculator tab to log your first footprint estimate."),
      ),
    );
  }

  const trend = history.length >= 2
    ? history[history.length - 1].total - history[0].total
    : 0;

  return h("main", {
    id: "main-content", tabIndex: -1, role: "tabpanel", "aria-labelledby": "nav-tab-tracker",
    style: { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
  },
    h("h1", { style: { fontSize: 22, fontWeight: 600, marginBottom: 4 } }, "Footprint tracker"),
    h("p", { style: { color: "var(--text2)", fontSize: 14, marginBottom: 24 } }, "Your progress over time"),

    h("div", {
      style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 },
    },
      h(MetricCard, { label: "Entries logged",    value: history.length, icon: "📝", color: "#378ADD" }),
      h(MetricCard, { label: "Latest estimate",   value: history[history.length - 1].total.toFixed(1), unit: "t CO₂e", icon: "🌍", color: "#639922" }),
      h(MetricCard, {
        label: "Overall trend",
        value: (trend > 0 ? "+" : "") + trend.toFixed(2), unit: "t",
        icon: trend <= 0 ? "📉" : "📈",
        color: trend <= 0 ? "#1D9E75" : "#D85A30",
        sub: trend <= 0 ? "Improving" : "Needs attention",
      }),
      h(MetricCard, { label: "Best recorded", value: Math.min(...history.map(e => e.total)).toFixed(1), unit: "t CO₂e", icon: "🏆", color: "#BA7517" }),
    ),

    /* Chart */
    h("section", {
      "aria-label": "Stacked bar chart of emissions over time",
      style: { background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: 20 },
    },
      h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } },
        h("h2", { style: { fontSize: 14, fontWeight: 500 } }, "Stacked emissions over time"),
        h("div", { style: { display: "flex", gap: 12 } },
          Object.keys(CATEGORY_COLORS).map(k =>
            h("span", {
              key: k,
              style: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text2)" },
            },
              h("span", { style: { width: 8, height: 8, borderRadius: 1, background: CATEGORY_COLORS[k] }, "aria-hidden": "true" }),
              k.charAt(0).toUpperCase() + k.slice(1),
            )
          )
        ),
      ),
      h("div", { style: { height: 280, position: "relative" } },
        h("canvas", { ref: chartRef, role: "img", "aria-label": "Stacked bar chart of carbon footprint history" }),
      ),
    ),

    /* Data table */
    h("section", { "aria-label": "Carbon footprint history table" },
      h("div", { style: { background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "auto" } },
        h("table", {
          style: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
          "aria-label": "Historical carbon footprint data",
        },
          h("thead", null,
            h("tr", { style: { background: "var(--bg2)" } },
              ["Date", "Transport", "Energy", "Food", "Lifestyle", "Total"].map(col =>
                h("th", {
                  key: col,
                  scope: "col",
                  style: { padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "var(--text2)", fontSize: 12, borderBottom: "0.5px solid var(--border)" },
                }, col)
              )
            )
          ),
          h("tbody", null,
            [...history].reverse().map((entry, i) =>
              h("tr", { key: i, style: { borderBottom: "0.5px solid var(--border)" } },
                h("td", { style: { padding: "10px 16px", color: "var(--text2)" } }, EcoUtils.formatDate(entry.date)),
                ["transport", "energy", "food", "lifestyle"].map(k =>
                  h("td", { key: k, style: { padding: "10px 16px" } }, (entry[k] || 0).toFixed(2), "t")
                ),
                h("td", { style: { padding: "10px 16px", fontWeight: 500, color: "var(--green-400)" } }, (entry.total || 0).toFixed(2), "t"),
              )
            )
          ),
        ),
      ),
    ),
  );
}