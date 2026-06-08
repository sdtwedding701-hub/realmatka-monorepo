import React, { useEffect, useMemo, useState } from "react";
import { formatApiError } from "../lib/api.js";

function normalizeMarkets(payload) {
  const markets = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.markets)
      ? payload.markets
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

  return markets
    .map((market) => ({
      slug: String(market?.slug || "").trim(),
      name: String(market?.name || market?.title || market?.slug || "").trim()
    }))
    .filter((market) => market.slug);
}

export function JodiPredictorPage({ apiBase, token, fetchApi, PageHeader, PageState }) {
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetchApi(apiBase, "/api/markets/list", token)
      .then((data) => {
        if (!active) return;
        const normalized = normalizeMarkets(data);
        setMarkets(normalized);
        setSelectedMarket((current) => current || normalized[0]?.slug || "");
        setState({ loading: false, error: "" });
      })
      .catch((error) => {
        if (active) {
          setState({ loading: false, error: formatApiError(error, "Market list load nahi hui.") });
        }
      });

    return () => {
      active = false;
    };
  }, [apiBase, fetchApi, token]);

  const selectedMarketName = useMemo(() => {
    return markets.find((market) => market.slug === selectedMarket)?.name || selectedMarket || "-";
  }, [markets, selectedMarket]);

  async function generatePrediction() {
    if (!selectedMarket) {
      setMessage("Market select karo.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const data = await fetchApi(apiBase, `/api/admin/jodi-prediction?market=${encodeURIComponent(selectedMarket)}`, token);
      setPrediction(data);
      setMessage(`${selectedMarketName} ke liye 40 jodi ready hai.`);
    } catch (error) {
      setPrediction(null);
      setMessage(formatApiError(error, "Prediction generate nahi ho payi."));
    } finally {
      setBusy(false);
    }
  }

  async function copyJodis(jodis) {
    const text = jodis.join(" ");
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Jodi copied.");
    } catch {
      setMessage(text);
    }
  }

  if (state.loading) return <PageState title="Jodi Predictor" subtitle="Loading markets..." />;
  if (state.error) return <PageState title="Jodi Predictor" subtitle={state.error} tone="error" />;

  return (
    <>
      <PageHeader title="Jodi Predictor" subtitle="Market chart se today ke liye trend aur failure learning jodi auto generate karo." />
      <section className="panel">
        <div className="form-grid predictor-form">
          <label>
            <span>Market</span>
            <select value={selectedMarket} onChange={(event) => setSelectedMarket(event.target.value)}>
              {markets.map((market) => <option key={market.slug} value={market.slug}>{market.name || market.slug}</option>)}
            </select>
          </label>
          <div className="actions predictor-actions">
            <button className="primary" disabled={busy || !selectedMarket} onClick={generatePrediction}>
              {busy ? "Generating..." : "Generate 40 Jodi"}
            </button>
            {prediction?.combined40?.length ? (
              <button className="secondary" onClick={() => copyJodis(prediction.combined40)}>Copy Full 40</button>
            ) : null}
          </div>
        </div>
        {message ? <p className={`message ${prediction ? "success" : ""}`}>{message}</p> : null}
      </section>

      {prediction ? (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2>{selectedMarketName}</h2>
              <p>Chart results: {prediction.stats?.totalResults || 0} | Generated: {new Date(prediction.generatedAt).toLocaleString("en-IN")}</p>
            </div>
            <div className="mini-stats predictor-stats">
              <div className={`mini-stat confidence-${prediction.stats?.confidence || "weak"}`}><span>Confidence</span><strong>{prediction.stats?.confidence || "weak"}</strong></div>
              <div className="mini-stat"><span>Last 30 Hit</span><strong>{prediction.stats?.last30Hits || 0}/30</strong></div>
              <div className="mini-stat"><span>Last 60 Hit</span><strong>{prediction.stats?.last60Hits || 0}/60</strong></div>
              <div className="mini-stat"><span>Last 90 Hit</span><strong>{prediction.stats?.last90Hits || 0}/90</strong></div>
              <div className="mini-stat"><span>Miss Streak</span><strong>{prediction.stats?.missStreak ?? "-"}</strong></div>
              <div className="mini-stat"><span>Backtest</span><strong>{prediction.stats?.backtest?.hitRate || 0}%</strong></div>
              <div className="mini-stat"><span>Recent Skipped</span><strong>{prediction.stats?.skippedRecentJodis || 0}</strong></div>
              <div className="mini-stat"><span>Digit Balance</span><strong>{prediction.stats?.combinedGroupDigitLimit || 6} max</strong></div>
              <div className="mini-stat"><span>Soft Penalty</span><strong>{prediction.stats?.recentSoftPenaltyDays || 21} days</strong></div>
            </div>
          </section>

          <PredictionBlock title="Trend Top 20" jodis={prediction.first20 || []} onCopy={copyJodis} />
          <PredictionBlock title="Failure Learning 20" jodis={prediction.second20 || []} onCopy={copyJodis} />
          <PredictionBlock title="Full 40 Jodi" jodis={prediction.combined40 || []} onCopy={copyJodis} wide />

          <section className="panel">
            <div className="panel-head">
              <h2>Recent Skip List</h2>
              <p>Last {prediction.stats?.recentSkipDays || 7} old result hard skip hain.</p>
            </div>
            <div className="jodi-chip-grid compact">
              {(prediction.skippedRecent || []).map((jodi, index) => <span className="jodi-chip muted" key={`${jodi}-${index}`}>{jodi}</span>)}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}

function PredictionBlock({ title, jodis, onCopy, wide = false }) {
  return (
    <section className={`panel prediction-block${wide ? " prediction-block-wide" : ""}`}>
      <div className="panel-head prediction-head">
        <div>
          <h2>{title}</h2>
          <p>{jodis.length} jodi</p>
        </div>
        <button className="secondary" onClick={() => onCopy(jodis)}>Copy</button>
      </div>
      <div className="jodi-chip-grid">
        {jodis.map((jodi, index) => <span className="jodi-chip" key={`${title}-${jodi}-${index}`}>{jodi}</span>)}
      </div>
    </section>
  );
}
