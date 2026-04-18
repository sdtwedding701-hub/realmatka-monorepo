import React, { useEffect, useState } from "react";

const NOTIFICATIONS_PAGE_SIZE = 100;

export function NotificationsPage({ apiBase, fetchApi, formatDate, PageHeader, PageState, token }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    users: [],
    notifications: [],
    notificationMeta: { total: 0, offset: 0, limit: NOTIFICATIONS_PAGE_SIZE, hasMore: false },
    summary: null
  });
  const [form, setForm] = useState({ title: "", body: "", channel: "general", userId: "" });
  const [message, setMessage] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  function normalizeNotificationsResponse(data) {
    if (Array.isArray(data)) {
      return {
        items: data,
        pagination: { total: data.length, offset: 0, limit: NOTIFICATIONS_PAGE_SIZE, hasMore: false }
      };
    }
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      pagination: {
        total: Number(data?.pagination?.total || 0),
        offset: Number(data?.pagination?.offset || 0),
        limit: Number(data?.pagination?.limit || NOTIFICATIONS_PAGE_SIZE),
        hasMore: Boolean(data?.pagination?.hasMore)
      }
    };
  }

  useEffect(() => {
    Promise.all([
      fetchApi(apiBase, "/api/admin/users", token),
      fetchApi(apiBase, `/api/admin/notifications?limit=${NOTIFICATIONS_PAGE_SIZE}&offset=0`, token),
      fetchApi(apiBase, "/api/admin/notifications-summary", token)
    ])
      .then(([users, notifications, summary]) => {
        const normalizedNotifications = normalizeNotificationsResponse(notifications);
        setState({
          loading: false,
          error: "",
          users,
          notifications: normalizedNotifications.items,
          notificationMeta: normalizedNotifications.pagination,
          summary
        });
      })
      .catch((error) =>
        setState({
          loading: false,
          error: error.message,
          users: [],
          notifications: [],
          notificationMeta: { total: 0, offset: 0, limit: NOTIFICATIONS_PAGE_SIZE, hasMore: false },
          summary: null
        })
      );
  }, [apiBase, fetchApi, token]);

  async function send() {
    await fetchApi(apiBase, "/api/admin/notifications", token, { method: "POST", body: form });
    const [notifications, summary] = await Promise.all([
      fetchApi(apiBase, `/api/admin/notifications?limit=${NOTIFICATIONS_PAGE_SIZE}&offset=0`, token),
      fetchApi(apiBase, "/api/admin/notifications-summary", token)
    ]);
    const normalizedNotifications = normalizeNotificationsResponse(notifications);
    setState((current) => ({
      ...current,
      notifications: normalizedNotifications.items,
      notificationMeta: normalizedNotifications.pagination,
      summary
    }));
    setForm({ title: "", body: "", channel: "general", userId: "" });
    setMessage("Notification sent successfully.");
  }

  async function loadMore() {
    if (loadingMore || !state.notificationMeta.hasMore) return;
    setLoadingMore(true);
    try {
      const notifications = await fetchApi(
        apiBase,
        `/api/admin/notifications?limit=${state.notificationMeta.limit || NOTIFICATIONS_PAGE_SIZE}&offset=${(state.notificationMeta.offset || 0) + (state.notificationMeta.limit || NOTIFICATIONS_PAGE_SIZE)}`,
        token
      );
      const normalizedNotifications = normalizeNotificationsResponse(notifications);
      setState((current) => ({
        ...current,
        notifications: [
          ...current.notifications,
          ...normalizedNotifications.items.filter((item) => !current.notifications.some((existing) => existing.id === item.id))
        ],
        notificationMeta: normalizedNotifications.pagination
      }));
      setMessage("Older notifications loaded.");
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    } finally {
      setLoadingMore(false);
    }
  }

  if (state.loading) return <PageState title="Notifications" subtitle="Loading notifications..." />;
  if (state.error) return <PageState title="Notifications" subtitle={state.error} tone="error" />;

  return (
    <>
      <PageHeader title="Notifications" subtitle="Broadcast or target user-facing notices." />
      <section className="panel">
        <div className="mini-stats">
          <div className="mini-stat"><span>Recent Notifications</span><strong>{state.summary?.total ?? state.notifications.length}</strong></div>
          <div className="mini-stat"><span>Unread</span><strong>{state.summary?.unreadCount ?? 0}</strong></div>
          <div className="mini-stat"><span>Users Reached</span><strong>{state.summary?.uniqueUsers ?? 0}</strong></div>
          <div className="mini-stat"><span>Latest Push</span><strong>{state.summary?.latestCreatedAt ? formatDate(state.summary.latestCreatedAt) : "-"}</strong></div>
        </div>
      </section>
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
        {state.notificationMeta.hasMore ? (
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="button" className="secondary" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? "Loading..." : `Load More (${Math.max((state.notificationMeta.total || 0) - state.notifications.length, 0)} left)`}
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
}
