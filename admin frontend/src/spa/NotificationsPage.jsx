import React, { useEffect, useState } from "react";

export function NotificationsPage({ apiBase, fetchApi, formatDate, PageHeader, PageState, token }) {
  const [state, setState] = useState({ loading: true, error: "", users: [], notifications: [] });
  const [form, setForm] = useState({ title: "", body: "", channel: "general", userId: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([fetchApi(apiBase, "/api/admin/users", token), fetchApi(apiBase, "/api/admin/notifications", token)])
      .then(([users, notifications]) => setState({ loading: false, error: "", users, notifications }))
      .catch((error) => setState({ loading: false, error: error.message, users: [], notifications: [] }));
  }, [apiBase, fetchApi, token]);

  async function send() {
    await fetchApi(apiBase, "/api/admin/notifications", token, { method: "POST", body: form });
    const notifications = await fetchApi(apiBase, "/api/admin/notifications", token);
    setState((current) => ({ ...current, notifications }));
    setForm({ title: "", body: "", channel: "general", userId: "" });
    setMessage("Notification sent successfully.");
  }

  if (state.loading) return <PageState title="Notifications" subtitle="Loading notifications..." />;
  if (state.error) return <PageState title="Notifications" subtitle={state.error} tone="error" />;

  return (
    <>
      <PageHeader title="Notifications" subtitle="Broadcast or target user-facing notices." />
      <section className="panel">
        <div className="form-grid">
          <label><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label><span>Channel</span><input value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} /></label>
          <label><span>Target User</span><select value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })}><option value="">All Users</option>{state.users.filter((user) => user.role !== "admin").map((user) => <option key={user.id} value={user.id}>{user.name} ({user.phone})</option>)}</select></label>
          <label className="wide"><span>Message</span><textarea rows={4} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label>
        </div>
        <div className="actions"><button className="primary" onClick={() => void send()}>Send Notification</button></div>
        <p className="message success">{message}</p>
      </section>
      <section className="panel">
        <div className="compact-list">
          {state.notifications.map((item) => (
            <div className="compact-row" key={item.id}><strong>{item.title} ({item.channel})</strong><span>{formatDate(item.createdAt)}</span></div>
          ))}
        </div>
      </section>
    </>
  );
}
