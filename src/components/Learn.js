/**
 * components/Learn.js
 * Expandable article cards covering climate science and carbon reduction.
 */

"use strict";

function Learn() {
  const { createElement: h, useState } = React;
  const [openId, setOpenId] = useState(null);

  const toggle = id => setOpenId(prev => prev === id ? null : id);

  return h("main", {
    id: "main-content", tabIndex: -1, role: "tabpanel", "aria-labelledby": "nav-tab-learn",
    style: { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
  },
    h("h1", { style: { fontSize: 22, fontWeight: 600, marginBottom: 4 } }, "Learn"),
    h("p",  { style: { color: "var(--text2)", fontSize: 14, marginBottom: 24 } },
      "Understanding the science behind your footprint."),

    h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 } },
      LEARN_ARTICLES.map(article => {
        const isOpen = openId === article.id;
        return h("article", {
          key: article.id,
          style: {
            background: "var(--bg)",
            border: `0.5px solid ${isOpen ? "var(--green-400)" : "var(--border)"}`,
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            cursor: "pointer",
            transition: "border-color 0.2s",
          },
          onClick: () => toggle(article.id),
        },
          h("div", {
            style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
          },
            h("div", null,
              h("p", { style: { fontSize: 14, fontWeight: 500 } },
                h("span", { "aria-hidden": "true" }, article.icon, " "),
                article.title,
              ),
              h("p", { style: { fontSize: 12, color: "var(--text3)", marginTop: 4 } },
                h("span", { "aria-hidden": "true" }, "📖 "),
                article.readTime, " read",
              ),
            ),
            h("button", {
              "aria-expanded": isOpen,
              "aria-controls": `article-body-${article.id}`,
              "aria-label": `${isOpen ? "Collapse" : "Expand"} article: ${article.title}`,
              onClick: e => { e.stopPropagation(); toggle(article.id); },
              style: {
                background: "none", border: "none", fontSize: 18,
                color: "var(--text3)", cursor: "pointer",
                transform: isOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              },
            }, "⌄"),
          ),
          h("div", {
            id: `article-body-${article.id}`,
            role: "region",
            "aria-labelledby": `article-title-${article.id}`,
            hidden: !isOpen,
          },
            isOpen && h("p", {
              style: {
                fontSize: 13, color: "var(--text2)", lineHeight: 1.7,
                marginTop: 12, borderTop: "0.5px solid var(--border)", paddingTop: 12,
              },
            }, article.content),
          ),
        );
      })
    ),

    /* Key facts */
    h("section", {
      "aria-label": "Key climate facts",
      style: {
        marginTop: 24, background: "var(--green-50)",
        border: "0.5px solid var(--green-100)",
        borderRadius: "var(--radius-lg)", padding: 20,
      },
    },
      h("h2", { style: { fontSize: 14, fontWeight: 500, color: "var(--green-800)", marginBottom: 12 } },
        "📊 Key benchmarks at a glance"),
      h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 } },
        [
          { label: "Global average",   value: `${BENCHMARKS.world_average}t`, sub: "CO₂e / person / yr" },
          { label: "UK average",        value: `${BENCHMARKS.uk_average}t`,   sub: "CO₂e / person / yr" },
          { label: "Paris 2030 target", value: `${BENCHMARKS.paris_2030}t`,   sub: "CO₂e / person / yr" },
          { label: "Net-zero target",   value: "2050",                          sub: "Global goal year"    },
        ].map((fact, i) =>
          h("div", { key: i, style: { textAlign: "center" } },
            h("p", { style: { fontSize: 22, fontWeight: 600, color: "var(--green-400)" } }, fact.value),
            h("p", { style: { fontSize: 12, color: "var(--green-600)", fontWeight: 500 } }, fact.label),
            h("p", { style: { fontSize: 11, color: "var(--green-400)" } }, fact.sub),
          )
        )
      ),
    ),
  );
}