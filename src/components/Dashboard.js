/**
 * components/Dashboard.js
 * Overview dashboard: summary metrics, doughnut breakdown,
 * trend line, and personalised top tip.
 */

"use strict";

function Dashboard({ footprint, history, actions }) {
  const { createElement: h, useRef, useEffect } = React;

  const total            = EcoUtils.totalFootprint(footprint);
  const completedActions = actions.filter(a => a.done).length;
  const savings          = actions
    .filter(a => a.done)
    .reduce((s, a) => s + (a.saving || 0), 0);

  /* ---- Doughnut chart ---- */
  const doughnutRef  = useRef(null);
  const doughnutInst = useRef(null);

  useEffect(() => {
    if (!doughnutRef.current) return;
    doughnutInst.current?.destroy();

    const labels = Object.keys(footprint).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const data   = Object.values(footprint);
    const colors = Object.keys(footprint).map(k => CATEGORY_COLORS[k] || "#639922");

    doughnutInst.current = new Chart(doughnutRef.current, {
      type: "doughnut",
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(1)} tCO₂e` } },
        },
      },
    });

    return () => doughnutInst.current?.destroy();
  }, [footprint]);

  /* ---- Trend line chart ---- */
  const trendRef  = useRef(null);
  const trendInst = useRef(null);

  useEffect(() => {
    if (!trendRef.current || history.length < 2) return;
    trendInst.current?.destroy();

    const last7 = history.slice(-7);

    trendInst.current = new Chart(trendRef.current, {
      type: "line",
      data: {
        labels: last7.map(h => EcoUtils.formatShortDate(h.date)),
        datasets: [{
          label: "Total tCO₂e",
          data: last7.map(h => +(h.total || 0).toFixed(2)),
          borderColor: "#639922",
          backgroundColor: "rgba(99,153,34,0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#639922",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: false, ticks: { callback: v => v + "t" } } },
      },
    });

    return () => trendInst.current?.destroy();
  }, [history]);

  /* ---- Personalised tip ---- */
  const topTip = (() => {
    const biggest = EcoUtils.biggestCategory(footprint);
    const tips = {
      food:      "Reducing beef and lamb consumption once a week could save ~0.5 tCO₂e per year.",
      transport: "Switching 2 car trips a week to public transport could save ~0.3 tCO₂e per year.",
      energy:    "Installing LED bulbs and a smart thermostat could reduce energy emissions by 15%.",
      lifestyle: "Buying second-hand clothing and repairing devices could save up to 0.5 tCO₂e per year.",
    };
    return tips[biggest] || "You're doing well! Consider offsetting remaining emissions through verified carbon credits.";
  })();

  const deltaVsUK = EcoUtils.percentDelta(total, BENCHMARKS.uk_average);

  return h("main", {
    id: "main-content",
    tabIndex: -1,
    role: "tabpanel",
    "aria-labelledby": "nav-tab-dashboard",
    style: { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
  },
    h("h1", { style: { fontSize: 22, fontWeight: 600, marginBottom: 4 } }, "Your carbon dashboard"),
    h("p", { style: { color: "var(--text2)", marginBottom: 24, fontSize: 14 } },
      "Estimated annual carbon footprint based on your latest inputs."),

    /* Metric cards */
    h("div", {
      role: "region",
      "aria-label": "Summary metrics",
      style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 24 },
    },
      h(MetricCard, {
        label: "Annual footprint", value: total.toFixed(1), unit: "tCO₂e", icon: "🌍", color: "#639922",
        sub: `${total > BENCHMARKS.uk_average ? "Above" : "Below"} UK average of ${BENCHMARKS.uk_average}t`,
      }),
      h(MetricCard, {
        label: "vs UK average", value: `${deltaVsUK > 0 ? "+" : ""}${deltaVsUK.toFixed(0)}%`, icon: "📉",
        color: deltaVsUK > 0 ? "#D85A30" : "#1D9E75",
        sub: deltaVsUK > 0 ? "Room for improvement" : "Great job!",
      }),
      h(MetricCard, {
        label: "CO₂ saved", value: savings.toFixed(2), unit: "tCO₂e", icon: "♻️", color: "#1D9E75",
        sub: `${completedActions} action${completedActions !== 1 ? "s" : ""} completed`,
      }),
      h(MetricCard, {
        label: "Biggest source",
        value: EcoUtils.biggestCategory(footprint),
        icon: "🔍", color: "#BA7517",
        sub: `${Math.max(...Object.values(footprint)).toFixed(1)}t CO₂e/yr`,
      }),
    ),

    /* Charts */
    h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 } },
      /* Doughnut */
      h("section", {
        "aria-label": "Carbon footprint breakdown by category",
        style: { background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" },
      },
        h("h2", { style: { fontSize: 14, fontWeight: 500, marginBottom: 16 } }, "Breakdown by category"),
        h("div", { style: { height: 200, position: "relative" } },
          h("canvas", {
            ref: doughnutRef,
            role: "img",
            "aria-label": `Doughnut chart: Transport ${footprint.transport.toFixed(1)}t, Energy ${footprint.energy.toFixed(1)}t, Food ${footprint.food.toFixed(1)}t, Lifestyle ${footprint.lifestyle.toFixed(1)}t`,
          }),
        ),
        h("div", { style: { display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 12 } },
          Object.keys(footprint).map(k =>
            h("span", {
              key: k,
              style: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text2)" },
            },
              h("span", { style: { width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[k], flexShrink: 0 }, "aria-hidden": "true" }),
              `${k.charAt(0).toUpperCase() + k.slice(1)}: ${footprint[k].toFixed(1)}t`,
            )
          )
        ),
      ),

      /* Trend */
      h("section", {
        "aria-label": "Carbon footprint over time",
        style: { background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" },
      },
        h("h2", { style: { fontSize: 14, fontWeight: 500, marginBottom: 16 } }, "Footprint over time"),
        history.length >= 2
          ? h("div", { style: { height: 200, position: "relative" } },
              h("canvas", {
                ref: trendRef,
                role: "img",
                "aria-label": "Line chart of carbon footprint trend over recent entries",
              })
            )
          : h("div", {
              style: { height: 200, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "var(--text3)", fontSize: 13, textAlign: "center" },
              "aria-live": "polite",
            },
              h("span", { "aria-hidden": "true", style: { fontSize: 32 } }, "📈"),
              "Track your footprint a few times to see your trend.",
            ),
      ),
    ),

    /* Top tip */
    h("aside", {
      "aria-label": "Personalised carbon reduction tip",
      style: { background: "var(--teal-50)", border: "0.5px solid var(--teal-100)", borderRadius: "var(--radius-lg)", padding: "20px" },
    },
      h("p", { style: { fontSize: 14, fontWeight: 500, color: "var(--teal-800)", marginBottom: 8 } }, "💡 Top personalised action"),
      h("p", { style: { fontSize: 13, color: "var(--teal-600)" } }, topTip),
    ),
  );
}