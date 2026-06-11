/**
 * components/NavBar.js
 * Primary navigation bar with ARIA landmark, keyboard support,
 * and active-state announcement for screen readers.
 */

"use strict";

function NavBar({ page, setPage }) {
  const { createElement: h } = React;

  const tabs = [
    { id: "dashboard",  icon: "🌍", label: "Dashboard"  },
    { id: "calculator", icon: "🧮", label: "Calculator" },
    { id: "tracker",    icon: "📊", label: "Tracker"    },
    { id: "actions",    icon: "✅", label: "Actions"    },
    { id: "learn",      icon: "📚", label: "Learn"      },
  ];

  // Keyboard handler: allow arrow-key navigation between tabs
  const handleKeyDown = (e, index) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (e.key === "ArrowLeft")  next = (index - 1 + tabs.length) % tabs.length;
    if (next !== index) {
      e.preventDefault();
      setPage(tabs[next].id);
      document.getElementById(`nav-tab-${tabs[next].id}`)?.focus();
    }
  };

  return h("header", { role: "banner" },
    h("nav", {
      role: "navigation",
      "aria-label": "Main navigation",
      style: {
        background: "var(--bg)",
        borderBottom: "0.5px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      },
    },
      h("div", {
        style: {
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 16px",
          overflowX: "auto",
        },
      },
        // Brand logo
        h("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingRight: 16,
            borderRight: "0.5px solid var(--border)",
            marginRight: 8,
            flexShrink: 0,
          },
        },
          h("span", { "aria-hidden": "true", style: { fontSize: 20 } }, "🌱"),
          h("span", {
            style: { fontWeight: 600, fontSize: 15, color: "var(--green-400)", whiteSpace: "nowrap" },
          }, "EcoTrace"),
        ),

        // Tab list with role="tablist"
        h("div", { role: "tablist", "aria-label": "App sections", style: { display: "flex" } },
          tabs.map((t, i) =>
            h("button", {
              key: t.id,
              id: `nav-tab-${t.id}`,
              role: "tab",
              "aria-selected": page === t.id,
              "aria-controls": `panel-${t.id}`,
              tabIndex: page === t.id ? 0 : -1,
              onClick: () => setPage(t.id),
              onKeyDown: (e) => handleKeyDown(e, i),
              style: {
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "14px 12px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${page === t.id ? "var(--green-400)" : "transparent"}`,
                color: page === t.id ? "var(--green-400)" : "var(--text2)",
                fontWeight: page === t.id ? 500 : 400,
                fontSize: 13,
                flexShrink: 0,
                transition: "color 0.15s, border-color 0.15s",
                cursor: "pointer",
              },
            },
              h("span", { "aria-hidden": "true" }, t.icon),
              h("span", null, t.label),
            )
          )
        )
      )
    )
  );
}