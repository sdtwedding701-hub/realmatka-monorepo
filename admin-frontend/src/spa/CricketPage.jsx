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

const cricketMarkets = [
  { value: "toss_winner", label: "Toss Winner" },
  { value: "match_winner", label: "Match Winner" },
  { value: "first_over_runs", label: "First Over Runs" },
  { value: "first_2_over_runs", label: "First 2 Overs Runs" },
  { value: "first_3_over_runs", label: "First 3 Overs Runs" }
];

const runOptions = {
  first_over_runs: ["0_5", "6_10", "11_15", "16_plus"],
  first_2_over_runs: ["0_10", "11_18", "19_26", "27_plus"],
  first_3_over_runs: ["0_15", "16_27", "28_39", "40_plus"]
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

function formatSelection(value) {
  return String(value || "").replace(/_/g, "-").replace("-plus", "+");
}

export function CricketPage({ apiBase, token, fetchApi, mode = "cricket", PageHeader, PageState }) {
  const [state, setState] = useState({ loading: true, error: "", matches: [], rates: {}, bets: [] });
  const [form, setForm] = useState(emptyForm);
  const [resultForm, setResultForm] = useState({ matchId: "", marketType: "toss_winner", winner: "team_a" });
  const [betsFilter, setBetsFilter] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void load();
  }, [apiBase, fetchApi, token]);

  async function load() {
    try {
      setState((current) => ({ ...current, loading: true, error: "" }));
      const [data, bets] = await Promise.all([
        fetchApi(apiBase, "/api/admin/cricket/matches", token),
        fetchApi(apiBase, "/api/admin/cricket/bets?limit=500", token)
      ]);
      setState({ loading: false, error: "", matches: data.matches || [], rates: data.rates || {}, bets: bets || [] });
    } catch (error) {
      setState({ loading: false, error: error?.message || "Cricket data load failed.", matches: [], rates: {}, bets: [] });
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
      const preview = buildSettlementPreview(state.bets, resultForm.matchId, resultForm.marketType, resultForm.winner);
      const matchTitle = selectedResultMatch?.title || "selected match";
      const winnerLabel = resultForm.winner === "team_a"
        ? selectedResultMatch?.teamA || "Team A"
        : resultForm.winner === "team_b"
          ? selectedResultMatch?.teamB || "Team B"
          : resultForm.winner === "cancel"
            ? "Cancel / Refund"
            : formatSelection(resultForm.winner);
      const confirmed = window.confirm(
        `Publish result for ${matchTitle}?\n\nMarket: ${cricketMarkets.find((item) => item.value === resultForm.marketType)?.label || resultForm.marketType}\nWinner: ${winnerLabel}\nPending bets: ${preview.processed}\nExpected payout/refund: Rs ${Math.round(preview.totalPayout)}\n\nConfirm karne ke baad pending bets settle hongi.`
      );
      if (!confirmed) return;
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

  async function cancelMatch(match) {
    const pendingCount = state.bets.filter((bet) => bet.matchId === match.id && bet.status === "Pending").length;
    const pendingAmount = state.bets
      .filter((bet) => bet.matchId === match.id && bet.status === "Pending")
      .reduce((sum, bet) => sum + Number(bet.amount || 0), 0);
    const confirmed = window.confirm(
      `Cancel / refund ${match.title}?\n\nPending bets: ${pendingCount}\nRefund amount: Rs ${Math.round(pendingAmount)}\n\nYe action pending cricket bets ko refund karega aur match close karega.`
    );
    if (!confirmed) return;
    setMessage("");
    try {
      const data = await fetchApi(apiBase, "/api/admin/cricket/cancel", token, {
        method: "POST",
        body: { matchId: match.id }
      });
      setMessage(`Match cancelled. Refunded ${data.settlement.refunded || 0} bets, total Rs ${Math.round(data.settlement.totalPayout || 0)}.`);
      await load();
    } catch (error) {
      setMessage(error?.message || "Match cancel/refund failed.");
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
  const winnerOptions = runOptions[resultForm.marketType] || ["team_a", "team_b", "cancel"];
  const filteredBets = betsFilter ? state.bets.filter((bet) => bet.matchId === betsFilter) : state.bets;
  const liveMatches = state.matches.filter((match) => String(match.status || "").toLowerCase() === "live").length;
  const pendingBets = state.bets.filter((bet) => bet.status === "Pending").length;
  const totalStake = state.bets.reduce((sum, bet) => sum + Number(bet.amount || 0), 0);
  const totalPayout = state.bets.reduce((sum, bet) => sum + Number(bet.payout || 0), 0);
  const exposureRows = buildExposureRows(state.matches, state.bets);
  const pageCopy = getCricketPageCopy(mode);
  const showStats = mode === "cricket";
  const showForm = mode === "cricket" || mode === "cricket-add";
  const showResult = mode === "cricket" || mode === "cricket-results";
  const showBets = mode === "cricket" || mode === "cricket-bets";
  const showMatches = mode === "cricket" || mode === "cricket-add" || mode === "cricket-matches" || mode === "cricket-results";
  const showExposure = mode === "cricket" || mode === "cricket-matches" || mode === "cricket-results";

  if (state.loading) return <PageState title="Cricket" subtitle="Loading cricket games..." />;
  if (state.error) return <PageState title="Cricket" subtitle={state.error} tone="error" />;

  return (
    <>
      <PageHeader title={pageCopy.title} subtitle={pageCopy.subtitle} />
      {message ? <p className={`message ${message.includes("failed") ? "error" : "success"}`}>{message}</p> : null}
      {showStats ? <section className="stats-grid">
        <article className="stat-card"><span>Live Matches</span><strong>{liveMatches}</strong></article>
        <article className="stat-card"><span>Pending Bets</span><strong>{pendingBets}</strong></article>
        <article className="stat-card"><span>Total Stake</span><strong>Rs {Math.round(totalStake)}</strong></article>
        <article className="stat-card"><span>Total Payout</span><strong>Rs {Math.round(totalPayout)}</strong></article>
      </section> : null}
      {showForm ? <section className="panel">
        <div className="panel-head">
          <h2>{form.id ? "Update Match" : "Create Match"}</h2>
          <p>Match ko pehle se schedule karo. Toss 35 min pehle aur baaki cricket markets match start time par auto close honge.</p>
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
      </section> : null}

      {showResult ? <section className="panel">
        <div className="panel-head">
          <h2>Publish Result</h2>
          <p>Toss, match winner, aur runs market result publish karte hi pending bets settle hongi.</p>
        </div>
        <div className="form-grid">
          <label><span>Match</span><select value={resultForm.matchId} onChange={(e) => setResultForm({ ...resultForm, matchId: e.target.value })}><option value="">Select match</option>{state.matches.map((match) => <option key={match.id} value={match.id}>{match.title}</option>)}</select></label>
          <label><span>Market</span><select value={resultForm.marketType} onChange={(e) => setResultForm({ ...resultForm, marketType: e.target.value, winner: runOptions[e.target.value]?.[0] || "team_a" })}>{cricketMarkets.map((market) => <option key={market.value} value={market.value}>{market.label}</option>)}</select></label>
          <label><span>Winner</span><select value={resultForm.winner} onChange={(e) => setResultForm({ ...resultForm, winner: e.target.value })}>
            {winnerOptions.map((option) => (
              <option key={option} value={option}>
                {option === "team_a" ? selectedResultMatch?.teamA || "Team A" : option === "team_b" ? selectedResultMatch?.teamB || "Team B" : option === "cancel" ? "Cancel / Refund" : formatSelection(option)}
              </option>
            ))}
          </select></label>
        </div>
        <div className="actions"><button className="primary" onClick={publishResult}>Publish Result</button></div>
      </section> : null}

      {showExposure ? <section className="panel">
        <div className="panel-head">
          <h2>Market Exposure</h2>
          <p>Pending cricket bets ka market-wise stake aur possible payout yahan dekho.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Match</th><th>Market</th><th>Selection</th><th>Bets</th><th>Stake</th><th>Possible Payout</th></tr></thead>
            <tbody>
              {exposureRows.length ? exposureRows.map((row) => (
                <tr key={`${row.matchId}:${row.marketType}:${row.selection}`}>
                  <td>{row.matchTitle}</td>
                  <td>{row.marketLabel}</td>
                  <td>{row.selectionLabel}</td>
                  <td>{row.count}</td>
                  <td>Rs {Math.round(row.stake)}</td>
                  <td>Rs {Math.round(row.potentialPayout)}</td>
                </tr>
              )) : <tr><td colSpan={6}>No pending cricket exposure.</td></tr>}
            </tbody>
          </table>
        </div>
      </section> : null}

      {showBets ? <section className="panel">
        <div className="panel-head">
          <h2>Cricket Bets History</h2>
          <p>Live aur settled cricket bets yahin se monitor karo. Match filter se specific match ki history dekho.</p>
        </div>
        <div className="form-grid">
          <label>
            <span>Filter Match</span>
            <select value={betsFilter} onChange={(event) => setBetsFilter(event.target.value)}>
              <option value="">All cricket matches</option>
              {state.matches.map((match) => <option key={match.id} value={match.id}>{match.title}</option>)}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Placed</th><th>Match</th><th>Market</th><th>Selection</th><th>Amount</th><th>Rate</th><th>Status</th><th>Payout</th><th>Result</th></tr></thead>
            <tbody>
              {filteredBets.length ? filteredBets.map((bet) => (
                <tr key={bet.id}>
                  <td>{formatDate(bet.createdAt)}</td>
                  <td>{bet.matchTitle}</td>
                  <td>{cricketMarkets.find((market) => market.value === bet.marketType)?.label || bet.marketType}</td>
                  <td>{formatSelection(bet.selection)}</td>
                  <td>Rs {Number(bet.amount || 0)}</td>
                  <td>{Number(bet.rate || 0)}x</td>
                  <td>{bet.status}</td>
                  <td>Rs {Number(bet.payout || 0)}</td>
                  <td>{bet.settledResult || "-"}</td>
                </tr>
              )) : <tr><td colSpan={9}>No cricket bets yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section> : null}

      {showMatches ? <section className="panel">
        <div className="panel-head"><h2>Matches</h2><p>Current scheduled cricket markets.</p></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Match</th><th>Teams</th><th>Start</th><th>Toss</th><th>Markets Close</th><th>Result</th><th>Action</th></tr></thead>
            <tbody>
              {state.matches.length ? state.matches.map((match) => (
                <tr key={match.id}>
                  <td>{match.title}</td>
                  <td>{match.teamA} vs {match.teamB}</td>
                  <td>{formatDate(match.startAt)}</td>
                  <td>{match.tossBettingOpen ? "Open" : "Closed"}<br /><small>Close: {formatDate(match.tossCloseAt)}</small></td>
                  <td>{match.matchBettingOpen ? "Open" : "Closed"}<br /><small>Close: {formatDate(match.matchCloseAt || match.startAt)}</small></td>
                  <td>Toss: {match.tossWinner || "-"}<br />Match: {match.matchWinner || "-"}<br /><small>Run markets result publish section se dekho.</small></td>
                  <td>
                    <button className="secondary" onClick={() => edit(match)}>Edit</button>
                    <button className="secondary" onClick={() => cancelMatch(match)} style={{ marginLeft: 8, borderColor: "#fecaca", color: "#b91c1c" }}>Cancel / Refund</button>
                  </td>
                </tr>
              )) : <tr><td colSpan={7}>No cricket matches yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section> : null}
    </>
  );
}

function getCricketPageCopy(mode) {
  if (mode === "cricket-add") {
    return { title: "Add Cricket Match", subtitle: "Schedule match, teams, and betting close time." };
  }
  if (mode === "cricket-matches") {
    return { title: "Live Cricket Matches", subtitle: "All scheduled cricket matches and result state." };
  }
  if (mode === "cricket-results") {
    return { title: "Cricket Result", subtitle: "Publish result and settle cricket bets." };
  }
  if (mode === "cricket-bets") {
    return { title: "Cricket Bets", subtitle: "Live and settled cricket bet history." };
  }
  return { title: "Cricket Overview", subtitle: "Cricket match summary, pending bets, and quick controls." };
}

function buildSettlementPreview(bets, matchId, marketType, winner) {
  return (bets || [])
    .filter((bet) => bet.matchId === matchId && bet.marketType === marketType && bet.status === "Pending")
    .reduce(
      (summary, bet) => {
        const isRefund = winner === "cancel";
        const isWin = !isRefund && bet.selection === winner;
        const payout = isRefund ? Number(bet.amount || 0) : isWin ? Number(bet.amount || 0) * Number(bet.rate || 0) : 0;
        summary.processed += 1;
        summary.totalPayout += payout;
        if (isRefund) summary.refunded += 1;
        else if (isWin) summary.won += 1;
        else summary.lost += 1;
        return summary;
      },
      { processed: 0, won: 0, lost: 0, refunded: 0, totalPayout: 0 }
    );
}

function buildExposureRows(matches, bets) {
  const matchMap = new Map((matches || []).map((match) => [match.id, match]));
  const exposure = new Map();
  for (const bet of bets || []) {
    if (bet.status !== "Pending") continue;
    const key = `${bet.matchId}:${bet.marketType}:${bet.selection}`;
    const match = matchMap.get(bet.matchId);
    const entry = exposure.get(key) || {
      matchId: bet.matchId,
      matchTitle: bet.matchTitle || match?.title || "-",
      marketType: bet.marketType,
      marketLabel: cricketMarkets.find((item) => item.value === bet.marketType)?.label || bet.marketType,
      selection: bet.selection,
      selectionLabel: formatSelectionForMatch(match, bet.selection),
      count: 0,
      stake: 0,
      potentialPayout: 0
    };
    entry.count += 1;
    entry.stake += Number(bet.amount || 0);
    entry.potentialPayout += Number(bet.amount || 0) * Number(bet.rate || 0);
    exposure.set(key, entry);
  }
  return Array.from(exposure.values()).sort((a, b) => b.potentialPayout - a.potentialPayout);
}

function formatSelectionForMatch(match, selection) {
  if (selection === "team_a") return match?.teamA || "Team A";
  if (selection === "team_b") return match?.teamB || "Team B";
  if (selection === "cancel") return "Cancel / Refund";
  return formatSelection(selection);
}
