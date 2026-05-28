import React, { useEffect, useState } from "react";

const emptyForm = {
  id: "",
  title: "",
  teamA: "",
  teamB: "",
  status: "Live",
  startAt: "",
  tossCloseAt: "",
  matchCloseAt: "",
  tossBettingOpen: "true",
  matchBettingOpen: "true"
};

function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function CricketPage({ apiBase, token, fetchApi, PageHeader, PageState }) {
  const [state, setState] = useState({ loading: true, error: "", matches: [], rates: {} });
  const [form, setForm] = useState(emptyForm);
  const [resultForm, setResultForm] = useState({ matchId: "", marketType: "toss_winner", winner: "team_a" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    void load();
  }, [apiBase, fetchApi, token]);

  async function load() {
    try {
      setState((current) => ({ ...current, loading: true, error: "" }));
      const data = await fetchApi(apiBase, "/api/admin/cricket/matches", token);
      setState({ loading: false, error: "", matches: data.matches || [], rates: data.rates || {} });
    } catch (error) {
      setState({ loading: false, error: error?.message || "Cricket data load failed.", matches: [], rates: {} });
    }
  }

  async function saveMatch() {
    setMessage("");
    try {
      await fetchApi(apiBase, "/api/admin/cricket/matches", token, {
        method: "POST",
        body: {
          ...form,
          startAt: toIso(form.startAt),
          tossCloseAt: toIso(form.tossCloseAt),
          matchCloseAt: toIso(form.matchCloseAt),
          tossBettingOpen: form.tossBettingOpen === "true",
          matchBettingOpen: form.matchBettingOpen === "true"
        }
      });
      setForm(emptyForm);
      setMessage("Cricket match saved.");
      await load();
    } catch (error) {
      setMessage(error?.message || "Match save failed.");
    }
  }

  async function publishResult() {
    setMessage("");
    try {
      const data = await fetchApi(apiBase, "/api/admin/cricket/settle", token, {
        method: "POST",
        body: {
          matchId: resultForm.matchId,
          marketType: resultForm.marketType,
          winner: resultForm.winner
        }
      });
      setMessage(`Result published. Processed ${data.settlement.processed}, Won ${data.settlement.won}, Lost ${data.settlement.lost}, Refund ${data.settlement.refunded || 0}.`);
      await load();
    } catch (error) {
      setMessage(error?.message || "Result publish failed.");
    }
  }

  function edit(match) {
    setForm({
      id: match.id,
      title: match.title || "",
      teamA: match.teamA || "",
      teamB: match.teamB || "",
      status: match.status || "Live",
      startAt: toDateTimeInput(match.startAt),
      tossCloseAt: toDateTimeInput(match.tossCloseAt),
      matchCloseAt: toDateTimeInput(match.matchCloseAt),
      tossBettingOpen: match.tossBettingOpen ? "true" : "false",
      matchBettingOpen: match.matchBettingOpen ? "true" : "false"
    });
    setResultForm((current) => ({ ...current, matchId: match.id }));
  }

  const selectedResultMatch = state.matches.find((match) => match.id === resultForm.matchId);

  if (state.loading) return <PageState title="Cricket" subtitle="Loading cricket games..." />;
  if (state.error) return <PageState title="Cricket" subtitle={state.error} tone="error" />;

  return (
    <>
      <PageHeader title="Cricket Games" subtitle="Create scheduled Toss Winner and Match Winner markets." />
      <section className="panel">
        <div className="panel-head">
          <h2>{form.id ? "Update Match" : "Create Match"}</h2>
          <p>Match ko pehle se schedule karo. Toss 35 min pehle aur match winner 5 min pehle auto close ho sakta hai.</p>
        </div>
        <div className="form-grid">
          <label><span>Match Title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="RCB vs CSK Final" /></label>
          <label><span>Team A</span><input value={form.teamA} onChange={(e) => setForm({ ...form, teamA: e.target.value })} placeholder="RCB" /></label>
          <label><span>Team B</span><input value={form.teamB} onChange={(e) => setForm({ ...form, teamB: e.target.value })} placeholder="CSK" /></label>
          <label><span>Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Live</option><option>Closed</option><option>Hidden</option></select></label>
          <label><span>Match Start Time</span><input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></label>
          <label><span>Toss Auto Close</span><input type="datetime-local" value={form.tossCloseAt} onChange={(e) => setForm({ ...form, tossCloseAt: e.target.value })} /></label>
          <label><span>Match Winner Auto Close</span><input type="datetime-local" value={form.matchCloseAt} onChange={(e) => setForm({ ...form, matchCloseAt: e.target.value })} /></label>
          <label><span>Toss Betting</span><select value={form.tossBettingOpen} onChange={(e) => setForm({ ...form, tossBettingOpen: e.target.value })}><option value="true">Open</option><option value="false">Closed</option></select></label>
          <label><span>Match Winner Betting</span><select value={form.matchBettingOpen} onChange={(e) => setForm({ ...form, matchBettingOpen: e.target.value })}><option value="true">Open</option><option value="false">Closed</option></select></label>
        </div>
        <div className="actions">
          <button className="primary" onClick={saveMatch}>{form.id ? "Update Match" : "Create Match"}</button>
          {form.id ? <button className="secondary" onClick={() => setForm(emptyForm)}>Cancel</button> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Publish Result</h2>
          <p>Toss winner ya match winner publish karte hi pending bets settle hongi.</p>
        </div>
        <div className="form-grid">
          <label><span>Match</span><select value={resultForm.matchId} onChange={(e) => setResultForm({ ...resultForm, matchId: e.target.value })}><option value="">Select match</option>{state.matches.map((match) => <option key={match.id} value={match.id}>{match.title}</option>)}</select></label>
          <label><span>Market</span><select value={resultForm.marketType} onChange={(e) => setResultForm({ ...resultForm, marketType: e.target.value })}><option value="toss_winner">Toss Winner</option><option value="match_winner">Match Winner</option></select></label>
          <label><span>Winner</span><select value={resultForm.winner} onChange={(e) => setResultForm({ ...resultForm, winner: e.target.value })}><option value="team_a">{selectedResultMatch?.teamA || "Team A"}</option><option value="team_b">{selectedResultMatch?.teamB || "Team B"}</option><option value="cancel">Cancel / Refund</option></select></label>
        </div>
        <div className="actions"><button className="primary" onClick={publishResult}>Publish Result</button></div>
        {message ? <p className={`message ${message.includes("failed") ? "error" : "success"}`}>{message}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Matches</h2><p>Current cricket winner markets.</p></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Match</th><th>Teams</th><th>Start</th><th>Toss</th><th>Match Winner</th><th>Result</th><th>Action</th></tr></thead>
            <tbody>
              {state.matches.length ? state.matches.map((match) => (
                <tr key={match.id}>
                  <td>{match.title}</td>
                  <td>{match.teamA} vs {match.teamB}</td>
                  <td>{formatDate(match.startAt)}</td>
                  <td>{match.tossBettingOpen ? "Open" : "Closed"}<br /><small>Close: {formatDate(match.tossCloseAt)}</small></td>
                  <td>{match.matchBettingOpen ? "Open" : "Closed"}<br /><small>Close: {formatDate(match.matchCloseAt)}</small></td>
                  <td>Toss: {match.tossWinner || "-"}<br />Match: {match.matchWinner || "-"}</td>
                  <td><button className="secondary" onClick={() => edit(match)}>Edit</button></td>
                </tr>
              )) : <tr><td colSpan={7}>No cricket matches yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
