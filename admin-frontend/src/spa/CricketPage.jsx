import React, { useEffect, useState } from "react";

const emptyForm = {
  id: "",
  title: "",
  teamA: "",
  teamB: "",
  status: "Live",
  activeOver: "1",
  bettingOpen: "true"
};

export function CricketPage({ apiBase, token, fetchApi, PageHeader, PageState }) {
  const [state, setState] = useState({ loading: true, error: "", matches: [], rates: {} });
  const [form, setForm] = useState(emptyForm);
  const [resultForm, setResultForm] = useState({ matchId: "", runs: "", wicket: "false", boundary: "false" });
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
          activeOver: Number(form.activeOver || 1),
          bettingOpen: form.bettingOpen === "true"
        }
      });
      setForm(emptyForm);
      setMessage("Cricket match saved.");
      await load();
    } catch (error) {
      setMessage(error?.message || "Match save failed.");
    }
  }

  async function settleResult() {
    setMessage("");
    try {
      const data = await fetchApi(apiBase, "/api/admin/cricket/settle", token, {
        method: "POST",
        body: {
          matchId: resultForm.matchId,
          runs: Number(resultForm.runs || 0),
          wicket: resultForm.wicket === "true",
          boundary: resultForm.boundary === "true"
        }
      });
      setMessage(`Result settled. Processed ${data.settlement.processed}, Won ${data.settlement.won}, Lost ${data.settlement.lost}.`);
      await load();
    } catch (error) {
      setMessage(error?.message || "Result settle failed.");
    }
  }

  function edit(match) {
    setForm({
      id: match.id,
      title: match.title || "",
      teamA: match.teamA || "",
      teamB: match.teamB || "",
      status: match.status || "Live",
      activeOver: String(match.activeOver || 1),
      bettingOpen: match.bettingOpen ? "true" : "false"
    });
    setResultForm((current) => ({ ...current, matchId: match.id }));
  }

  if (state.loading) return <PageState title="Cricket" subtitle="Loading cricket games..." />;
  if (state.error) return <PageState title="Cricket" subtitle={state.error} tone="error" />;

  return (
    <>
      <PageHeader title="Cricket Games" subtitle="Create over markets and settle cricket prediction bets." />
      <section className="panel">
        <div className="panel-head">
          <h2>{form.id ? "Update Match" : "Create Match"}</h2>
          <p>Live match app ke Play Cricket section me show hoga.</p>
        </div>
        <div className="form-grid">
          <label><span>Match Title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="IND vs AUS T20" /></label>
          <label><span>Team A</span><input value={form.teamA} onChange={(e) => setForm({ ...form, teamA: e.target.value })} /></label>
          <label><span>Team B</span><input value={form.teamB} onChange={(e) => setForm({ ...form, teamB: e.target.value })} /></label>
          <label><span>Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Live</option><option>Closed</option><option>Hidden</option></select></label>
          <label><span>Active Over</span><input inputMode="numeric" value={form.activeOver} onChange={(e) => setForm({ ...form, activeOver: e.target.value })} /></label>
          <label><span>Betting</span><select value={form.bettingOpen} onChange={(e) => setForm({ ...form, bettingOpen: e.target.value })}><option value="true">Open</option><option value="false">Closed</option></select></label>
        </div>
        <div className="actions">
          <button className="primary" onClick={saveMatch}>{form.id ? "Update Match" : "Create Match"}</button>
          {form.id ? <button className="secondary" onClick={() => setForm(emptyForm)}>Cancel</button> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Settle Over Result</h2>
          <p>Runs, wicket aur boundary result enter karte hi pending bets settle hongi.</p>
        </div>
        <div className="form-grid">
          <label><span>Match</span><select value={resultForm.matchId} onChange={(e) => setResultForm({ ...resultForm, matchId: e.target.value })}><option value="">Select match</option>{state.matches.map((match) => <option key={match.id} value={match.id}>{match.title} - Over {match.activeOver}</option>)}</select></label>
          <label><span>Over Runs</span><input inputMode="numeric" value={resultForm.runs} onChange={(e) => setResultForm({ ...resultForm, runs: e.target.value })} /></label>
          <label><span>Wicket</span><select value={resultForm.wicket} onChange={(e) => setResultForm({ ...resultForm, wicket: e.target.value })}><option value="false">No</option><option value="true">Yes</option></select></label>
          <label><span>Boundary</span><select value={resultForm.boundary} onChange={(e) => setResultForm({ ...resultForm, boundary: e.target.value })}><option value="false">No</option><option value="true">Yes</option></select></label>
        </div>
        <div className="actions"><button className="primary" onClick={settleResult}>Settle Result</button></div>
        {message ? <p className={`message ${message.includes("failed") ? "error" : "success"}`}>{message}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Matches</h2><p>Current cricket markets.</p></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Match</th><th>Teams</th><th>Over</th><th>Status</th><th>Betting</th><th>Result</th><th>Action</th></tr></thead>
            <tbody>
              {state.matches.length ? state.matches.map((match) => (
                <tr key={match.id}>
                  <td>{match.title}</td>
                  <td>{match.teamA} vs {match.teamB}</td>
                  <td>{match.activeOver}</td>
                  <td>{match.status}</td>
                  <td>{match.bettingOpen ? "Open" : "Closed"}</td>
                  <td>{match.resultRuns == null ? "-" : `${match.resultRuns} runs`}</td>
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
