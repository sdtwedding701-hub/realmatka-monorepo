import React, { useEffect, useState } from "react";

export function SettingsPage({ apiBase, token, fetchApi, PageHeader, PageState }) {
  const [state, setState] = useState({ loading: true, error: "", settings: [] });
  const [form, setForm] = useState({
    notice_text: "",
    support_phone: "",
    support_hours: "",
    bonus_enabled: "true",
    bonus_text: "",
    admin_two_factor_enabled: "true",
    latest_app_version: "",
    latest_app_apk_url: "",
    latest_app_update_required: "false",
    latest_app_update_title: "",
    latest_app_update_message: ""
  });
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
          admin_two_factor_enabled: map.admin_two_factor_enabled || "true",
          latest_app_version: map.latest_app_version || "",
          latest_app_apk_url: map.latest_app_apk_url || "",
          latest_app_update_required: map.latest_app_update_required || "false",
          latest_app_update_title: map.latest_app_update_title || "New update available",
          latest_app_update_message: map.latest_app_update_message || "Please download the latest APK to continue."
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
        <div className="panel-head">
          <h2>Bonus Visibility</h2>
          <p>Current bonus rules ko operator side se clearly dekhne ke liye quick summary.</p>
        </div>
        <div className="mini-stats">
          {[
            <div className="mini-stat" key="signup-bonus"><span>Signup Bonus</span><strong>{form.bonus_enabled === "false" ? "Disabled" : "On Approval"}</strong></div>,
            <div className="mini-stat" key="first-deposit"><span>First Deposit Bonus</span><strong>Rs 1000 = 50 | Rs 2000+ = 100</strong></div>,
            <div className="mini-stat" key="repeat-rule"><span>Repeat Rule</span><strong>Only First Successful Deposit</strong></div>
          ]}
        </div>
      </section>
      <section className="panel">
        <div className="form-grid">
          <label className="wide"><span>Notice Text</span><textarea rows={4} value={form.notice_text} onChange={(e) => setForm({ ...form, notice_text: e.target.value })} /></label>
          <label><span>Support Phone</span><input value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} /></label>
          <label><span>Support Hours</span><input value={form.support_hours} onChange={(e) => setForm({ ...form, support_hours: e.target.value })} /></label>
          <label><span>Bonus Enabled</span><select value={form.bonus_enabled} onChange={(e) => setForm({ ...form, bonus_enabled: e.target.value })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
          <label><span>Admin Authenticator 2FA</span><select value={form.admin_two_factor_enabled} onChange={(e) => setForm({ ...form, admin_two_factor_enabled: e.target.value })}><option value="true">Required</option><option value="false">Disabled</option></select></label>
          <label className="wide"><span>Bonus Text</span><input value={form.bonus_text} onChange={(e) => setForm({ ...form, bonus_text: e.target.value })} /></label>
          <label><span>Latest App Version</span><input placeholder="1.0.3" value={form.latest_app_version} onChange={(e) => setForm({ ...form, latest_app_version: e.target.value })} /></label>
          <label><span>Latest APK URL</span><input placeholder="https://..." value={form.latest_app_apk_url} onChange={(e) => setForm({ ...form, latest_app_apk_url: e.target.value })} /></label>
          <label><span>Force Update</span><select value={form.latest_app_update_required} onChange={(e) => setForm({ ...form, latest_app_update_required: e.target.value })}><option value="false">No</option><option value="true">Yes</option></select></label>
          <label className="wide"><span>Update Popup Title</span><input value={form.latest_app_update_title} onChange={(e) => setForm({ ...form, latest_app_update_title: e.target.value })} /></label>
          <label className="wide"><span>Update Popup Message</span><textarea rows={3} value={form.latest_app_update_message} onChange={(e) => setForm({ ...form, latest_app_update_message: e.target.value })} /></label>
        </div>
        <div className="actions"><button className="primary" onClick={save}>Save Settings</button></div>
        <p className="message success">{message}</p>
      </section>
    </>
  );
}
