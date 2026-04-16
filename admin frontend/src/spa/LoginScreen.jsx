import React, { useEffect, useState } from "react";
import { fetchApi, normalizeAdminApiBase } from "../lib/api.js";
import { storeAdminSession } from "../lib/session.js";

export function LoginScreen({ apiBase, setApiBase, setToken, bootError }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [message, setMessage] = useState(bootError);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMessage(bootError);
  }, [bootError]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (challenge) {
      await handleVerifyTwoFactor();
      return;
    }

    const normalizedPhone = String(phone || "").replace(/[^0-9]/g, "");
    if (normalizedPhone.length !== 10) {
      setMessage("Valid 10 digit super admin phone dalo.");
      return;
    }
    if (!String(password || "").trim()) {
      setMessage("Password dalo.");
      return;
    }

    setBusy(true);
    setMessage("");
    const normalizedApiBase = normalizeAdminApiBase(apiBase);

    try {
      const data = await fetchApi(normalizedApiBase, "/api/auth/login", "", {
        method: "POST",
        body: { phone: normalizedPhone, password: String(password || "").trim() }
      });
      if (data.requiresTwoFactor) {
        setChallenge({
          challengeId: data.challengeId,
          expiresAt: data.expiresAt,
          provider: data.provider,
          devCode: data.devCode || ""
        });
        setOtp("");
        setMessage(data.provider === "local" ? "2FA code generate ho gaya. OTP enter karo." : "2FA code phone par bhej diya gaya hai.");
        return;
      }
      const me = await fetchApi(normalizedApiBase, "/api/auth/me", data.token);
      if (!["admin", "super_admin"].includes(me.role)) {
        throw new Error("Super admin access required");
      }
      storeAdminSession(data.token);
      setToken(data.token);
      window.location.hash = "#/dashboard";
    } catch (error) {
      setMessage(error.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyTwoFactor() {
    const normalizedOtp = String(otp || "").replace(/[^0-9]/g, "");
    if (normalizedOtp.length !== 6) {
      setMessage("Valid 6 digit 2FA code dalo.");
      return;
    }

    setBusy(true);
    setMessage("");
    const normalizedApiBase = normalizeAdminApiBase(apiBase);

    try {
      const data = await fetchApi(normalizedApiBase, "/api/auth/admin-verify-2fa", "", {
        method: "POST",
        body: { challengeId: challenge.challengeId, otp: normalizedOtp }
      });
      const me = await fetchApi(normalizedApiBase, "/api/auth/me", data.token);
      if (!["admin", "super_admin"].includes(me.role)) {
        throw new Error("Super admin access required");
      }
      storeAdminSession(data.token);
      setChallenge(null);
      setOtp("");
      setToken(data.token);
      window.location.hash = "#/dashboard";
    } catch (error) {
      setMessage(error.message || "2FA verify failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <section className={`panel login-card${busy ? " busy" : ""}`}>
        <div className="brand login-brand">
          <span className="brand-badge">Super Admin</span>
          <h1>Real Matka Control Room</h1>
          <p>Secure super admin workspace for results, requests, reports, operators, and daily monitoring.</p>
        </div>
        <div className="panel-head">
          <h2>Super Admin Login</h2>
          <p>{challenge ? "Password verify ho gaya. Ab 2FA code se login complete karo." : "Secure operator access with structured React dashboard and legacy fallback pages."}</p>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Phone</span>
            <input disabled={Boolean(challenge)} value={phone} onChange={(event) => setPhone(event.target.value)} type="text" />
          </label>
          <label>
            <span>Password</span>
            <input disabled={Boolean(challenge)} value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          {challenge ? (
            <>
              <label>
                <span>2FA Code</span>
                <input autoFocus inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value)} type="text" />
              </label>
              <div className="actions">
                <button type="submit" className="primary">Verify 2FA</button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setChallenge(null);
                    setOtp("");
                    setMessage("");
                  }}
                >
                  Back
                </button>
              </div>
            </>
          ) : <button type="submit" className="primary">Login</button>}
        </form>
        {challenge?.provider === "local" && challenge?.devCode ? <p className="sidebar-note login-note">Local dev 2FA code: <strong>{challenge.devCode}</strong></p> : null}
        <p className="sidebar-note login-note">React dashboard core pages live hain. Legacy operator pages sidebar se open ho sakti hain.</p>
        <p className={`message ${message ? "error" : ""}`}>{message}</p>
      </section>
    </div>
  );
}
