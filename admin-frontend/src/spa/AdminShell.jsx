import React, { useMemo, useState } from "react";

export function AdminShell({ apiBase, route, setRoute, me, navItems, routeMeta, onLogout, pageFactory }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const currentMeta = routeMeta[route] || routeMeta.dashboard;
  const hideTopbar = route === "requests";

  const page = useMemo(() => pageFactory(refreshKey, () => setRefreshKey((value) => value + 1)), [pageFactory, refreshKey]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-badge">Admin Suite</span>
          <h1>Real Matka</h1>
          <p>Structured operator workspace with React core pages and legacy fallbacks.</p>
        </div>
        <div className="operator-card">
          <strong>{me.name}</strong>
          <span>{me.phone}</span>
          <small>Session active</small>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <a
              key={item.key}
              className={`nav-link${route === item.key ? " active" : ""}`}
              href={`#/${item.key}`}
              onClick={() => setRoute(item.key)}
            >
              <span className="nav-link-title">{item.label}</span>
              <span className="nav-link-caption">{routeMeta[item.key]?.eyebrow || "Section"}</span>
            </a>
          ))}
        </nav>
        <button className="secondary sidebar-logout" onClick={onLogout}>Logout</button>
      </aside>
      <main className="main">
        {hideTopbar ? null : (
          <section className="topbar">
            <div className="topbar-copy">
              {currentMeta.eyebrow ? <span className="topbar-eyebrow">{currentMeta.eyebrow}</span> : null}
              <h2>{currentMeta.title}</h2>
              <p>{currentMeta.subtitle}</p>
            </div>
            <div className="topbar-actions">
              <div className="topbar-chip">
                <span>API</span>
                <strong>{apiBase.replace(/^https?:\/\//, "")}</strong>
              </div>
              <div className="topbar-chip">
                <span>Operator</span>
                <strong>{me.name}</strong>
              </div>
              <button className="secondary" onClick={() => setRefreshKey((value) => value + 1)}>Refresh View</button>
            </div>
          </section>
        )}
        {page}
      </main>
    </div>
  );
}
