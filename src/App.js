/**
 * App.js
 * Root application component.
 * Manages global state (footprint, history, actions) with localStorage persistence.
 */

"use strict";

/**
 * Custom hook: useState backed by localStorage.
 * @param {string} key          - Storage key
 * @param {*}      initialValue - Default value if nothing stored
 */
function useLocalStorage(key, initialValue) {
  const [state, setState] = React.useState(() => EcoUtils.storageGet(key, initialValue));

  React.useEffect(() => {
    EcoUtils.storageSet(key, state);
  }, [key, state]);

  return [state, setState];
}

function App() {
  const { createElement: h, useState } = React;

  const [page, setPage] = useState("dashboard");

  /* Persistent state */
  const [footprint, setFootprint] = useLocalStorage("ecotrace_fp", {
    transport: 2.1,
    energy:    1.2,
    food:      1.8,
    lifestyle: 0.3,
  });

  const [history, setHistory] = useLocalStorage("ecotrace_history", []);

  const [actions, setActions] = useLocalStorage(
    "ecotrace_actions",
    ACTIONS_CATALOGUE.map(a => ({ id: a.id, done: false })),
  );

  /** Append a new history snapshot */
  const addHistory = entry => setHistory(prev => [...prev, entry]);

  /* Page → component map */
  const pages = {
    dashboard:  h(Dashboard,  { footprint, history, actions }),
    calculator: h(Calculator, { footprint, setFootprint, addHistory }),
    tracker:    h(Tracker,    { history }),
    actions:    h(Actions,    { footprint, actions, setActions }),
    learn:      h(Learn,      null),
  };

  return h("div", null,
    h(NavBar, { page, setPage }),
    pages[page] || pages.dashboard,
  );
}

/* Mount */
const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(h(App, null));
}