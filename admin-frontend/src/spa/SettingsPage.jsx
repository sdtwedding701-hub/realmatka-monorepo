import React, { useEffect, useState } from "react";

export function SettingsPage({ apiBase, token, fetchApi, PageHeader, PageState }) {
  const [state, setState] = useState({ loading: true, error: "", settings: [] });
  const [form, setForm] = useState({ notice_text: "", support_phone: "", support_hours: "", bonus_enabled: "true", bonus_text: "", admin_two_factor_enabled: "true" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchApi(apiBase, "/api/admin/settings", token)
      .then((settings) => {
        setState({ loading: false, error: "", settings });
        const map = Object.fromEntries(settings.map((item) => [item.key, item.value]));
        setForm({
          notice_text: map.notice_text || "",
          support_phone: map.support_phone || "",
          support_hours: map.support_hours || "",
          bonus_enabled: map.bonus_enabled || "true",
          bonus_text: map.bonus_text || "",
          admin_two_factor_enabled: map.admin_two_factor_enabled || "true"
        });
      })
      .catch((error) => setState({ loading: false, error: error.message, settings: [] }));
  }, [apiBase, fetchApi, token]);

  async function save() {
    const settings = await fetchApi(apiBase, "/api/admin/settings", token, { method: "POST", body: form });
    setState((current) => ({ ...current, settings }));
    setMessage("Settings updated successfully.");
  }

  if (state.loading) return <PageState title="Settings" subtitle="Loading settings..." />;
  if (state.error) return <PageState title="Settings" subtitle={state.error} tone="error" />;

  return (
    <>
      <PageHeader title="Settings" subtitle="Shared settings for admin, mobile, and web surfaces." />
      <section className="panel">
        <div className="form-grid">
          <label className="wide"><span>Notice Text</span><textarea rows={4} value={form.notice_text} onChange={(e) => setForm({ ...form, notice_text: e.target.value })} /></label>
          <label><span>Support Phone</span><input value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} /></label>
          <label><span>Support Hours</span><input value={form.support_hours} onChange={(e) => setForm({ ...form, support_hours: e.target.value })} /></label>
          <label><span>Bonus Enabled</span><select value={form.bonus_enabled} onChange={(e) => setForm({ ...form, bonus_enabled: e.target.value })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
          <label><span>Admin Authenticator 2FA</span><select value={form.admin_two_factor_enabled} onChange={(e) => setForm({ ...form, admin_two_factor_enabled: e.target.value })}><option value="true">Required</option><option value="false">Disabled</option></select></label>
          <label className="wide"><span>Bonus Text</span><input value={form.bonus_text} onChange={(e) => setForm({ ...form, bonus_text: e.target.value })} /></label>
        </div>
        <div className="actions"><button className="primary" onClick={save}>Save Settings</button></div>
        <p className="message success">{message}</p>
      </section>
    </>
  );
}
