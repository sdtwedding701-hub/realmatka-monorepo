import React, { useEffect, useState } from "react";

export function AuditPage({ apiBase, downloadTextFile, exportAdminData, fetchApi, formatDate, PageHeader, PageState, token }) {
  const [state, setState] = useState({ loading: true, error: "", items: [], monitoring: null });
  const [query, setQuery] = useState("");
  const [restoreText, setRestoreText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([fetchApi(apiBase, "/api/admin/audit-logs", token), fetchApi(apiBase, "/api/admin/monitoring-summary", token)])
      .then(([items, monitoring]) => setState({ loading: false, error: "", items, monitoring }))
      .catch((error) => setState({ loading: false, error: error.message, items: [], monitoring: null }));
  }, [apiBase, fetchApi, token]);

  if (state.loading) return <PageState title="Audit Logs" subtitle="Loading audit logs..." />;
  if (state.error) return <PageState title="Audit Logs" subtitle={state.error} tone="error" />;

  const filtered = state.items.filter((item) => !query || item.action.toLowerCase().includes(query.toLowerCase()) || item.entityId.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Backend-level operator trail for results, wallet, and user actions." />
      <section className="panel">
        <div className="form-grid">
          <label className="wide"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Action or entity id" /></label>
          <div className="actions wide">
            <button className="secondary" onClick={() => void exportAdminData(apiBase, token, "audit")}>Export Audit CSV</button>
            <button className="secondary" onClick={() => void downloadBackup()}>Download Backup Snapshot</button>
          </div>
          <label className="wide"><span>Safe Restore Snapshot JSON</span><textarea rows={8} value={restoreText} onChange={(event) => setRestoreText(event.target.value)} placeholder="Paste backup snapshot JSON here" /></label>
          <div className="actions wide">
            <button className="secondary" onClick={() => void restoreBackup(true)}>Dry Run Restore</button>
            <button className="primary" onClick={() => void restoreBackup(false)}>Apply Safe Restore</button>
          </div>
          {message ? <p className={`message ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("error") ? "error" : "success"} wide`}>{message}</p> : null}
        </div>
      </section>
      <section className="panel">
        <div className="dashboard-grid">
          <div className="subpanel">
            <h3>Monitoring Alerts</h3>
            <div className="compact-list">
              {state.monitoring?.alerts?.length ? state.monitoring.alerts.map((item, index) => (
                <div className="compact-row" key={`${item.title}-${index}`}><strong>{item.title}</strong><span>{item.body}</span></div>
              )) : <div className="empty-card">No monitoring alerts.</div>}
            </div>
          </div>
          <div className="subpanel">
            <h3>Recent Audit Flags</h3>
            <div className="compact-list">
              {state.monitoring?.recentAuditFlags?.length ? state.monitoring.recentAuditFlags.map((item) => (
                <div className="compact-row" key={item.id}><strong>{item.action}</strong><span>{formatDate(item.createdAt)}</span></div>
              )) : <div className="empty-card">No flagged audit logs.</div>}
            </div>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="compact-list">
          {filtered.map((item) => (
            <div className="audit-item" key={item.id}>
              <strong>{item.action}</strong>
              <span>{item.entityType} - {item.entityId}</span>
              <span>{formatDate(item.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );

  async function downloadBackup() {
    try {
      const data = await fetchApi(apiBase, "/api/admin/backup-snapshot", token);
      downloadTextFile(data.filename, JSON.stringify(data.snapshot, null, 2), "application/json");
      setMessage("Backup snapshot downloaded.");
    } catch (error) {
      setMessage(error.message || "Backup export failed.");
    }
  }

  async function restoreBackup(dryRun) {
    try {
      const parsed = JSON.parse(restoreText);
      const data = await fetchApi(apiBase, "/api/admin/backup-snapshot", token, {
        method: "POST",
        body: { snapshot: parsed, dryRun }
      });
      setMessage(dryRun ? `Dry run passed: ${data.summary.markets} markets, ${data.summary.charts} charts, ${data.summary.settings} settings.` : "Safe restore applied successfully.");
    } catch (error) {
      setMessage(error.message || "Restore failed.");
    }
  }
}
