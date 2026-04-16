(function () {
  const defaultApiBase =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.protocol + "//" + window.location.hostname + ":3000"
      : "http://localhost:3000";

  const state = {
    referenceId: "",
    lastResponse: null,
    lastTarget: "googlePay"
  };

  const elements = {
    apiBase: document.getElementById("apiBase"),
    token: document.getElementById("token"),
    upiId: document.getElementById("upiId"),
    amount: document.getElementById("amount"),
    rawResponse: document.getElementById("rawResponse"),
    referenceValue: document.getElementById("referenceValue"),
    referenceText: document.getElementById("referenceText"),
    statusValue: document.getElementById("statusValue"),
    amountPreview: document.getElementById("amountPreview"),
    upiIdPreview: document.getElementById("upiIdPreview"),
    upiUrlValue: document.getElementById("upiUrlValue"),
    timerText: document.getElementById("timerText"),
    launchHint: document.getElementById("launchHint"),
    resultPanel: document.getElementById("resultPanel"),
    message: document.getElementById("message"),
    startButton: document.getElementById("startButton"),
    refreshButton: document.getElementById("refreshButton"),
    successButton: document.getElementById("successButton"),
    failedButton: document.getElementById("failedButton"),
    cancelledButton: document.getElementById("cancelledButton"),
    googlePayButton: document.getElementById("googlePayButton"),
    phonePeButton: document.getElementById("phonePeButton"),
    paytmButton: document.getElementById("paytmButton"),
    otherUpiButton: document.getElementById("otherUpiButton")
  };

  elements.apiBase.value = defaultApiBase;

  const packages = {
    googlePay: "com.google.android.apps.nbu.paisa.user",
    phonePe: "com.phonepe.app",
    paytm: "net.one97.paytm"
  };

  function buildReferenceId() {
    return ("RM" + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 4).toUpperCase()).slice(0, 12);
  }

  function buildUpiUrl(target) {
    const amount = Number(elements.amount.value || 0);
    const upiId = String(elements.upiId.value || "").trim();
    if (!upiId || !Number.isFinite(amount) || amount <= 0) {
      return "";
    }
    const params = new URLSearchParams({
      pa: upiId,
      am: amount.toFixed(2),
      cu: "INR"
    });
    const query = params.toString();
    if (!target || target === "generic") {
      return "upi://pay?" + query;
    }
    return "intent://pay?" + query + "#Intent;scheme=upi;package=" + packages[target] + ";end";
  }

  async function apiRequest(path, method, body) {
    const apiBase = String(elements.apiBase.value || "").replace(/\/$/, "");
    const token = String(elements.token.value || "").trim();
    if (!apiBase) {
      throw new Error("API Base URL required hai.");
    }
    if (!token) {
      throw new Error("Bearer token required hai.");
    }
    const response = await fetch(apiBase + path, {
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Request failed");
    }
    return payload.data;
  }

  function syncUi() {
    const amount = Number(elements.amount.value || 0);
    const upiId = String(elements.upiId.value || "").trim();
    const upiUrl = buildUpiUrl("generic");
    elements.referenceValue.textContent = state.referenceId || "-";
    elements.referenceText.textContent = state.referenceId ? "Ref: " + state.referenceId : "Creating payment reference...";
    elements.upiUrlValue.value = upiUrl || "";
    elements.upiIdPreview.textContent = upiId || "-";
    elements.amountPreview.textContent = Number.isFinite(amount) && amount > 0 ? "INR " + amount.toFixed(2) : "-";
    elements.refreshButton.disabled = !state.referenceId;
    elements.successButton.disabled = !state.referenceId;
    elements.failedButton.disabled = !state.referenceId;
    elements.cancelledButton.disabled = !state.referenceId;
    const canOpenUpi = Boolean(upiUrl);
    elements.googlePayButton.disabled = !canOpenUpi;
    elements.phonePeButton.disabled = !canOpenUpi;
    elements.paytmButton.disabled = !canOpenUpi;
    elements.otherUpiButton.disabled = !canOpenUpi;
    elements.resultPanel.textContent = JSON.stringify(state.lastResponse || {}, null, 2);
    elements.statusValue.textContent = state.lastResponse?.status || (state.referenceId ? "INITIATED" : "Idle");
    elements.launchHint.textContent = "Launch target: " + state.lastTarget;
  }

  function setMessage(text, isError) {
    elements.message.textContent = text;
    elements.message.style.color = isError ? "#b91c1c" : "#475569";
  }

  async function startDeposit() {
    try {
      const upiUrl = buildUpiUrl("googlePay");
      if (!upiUrl) {
        throw new Error("UPI ID aur valid amount required hai.");
      }
      state.referenceId = state.referenceId || buildReferenceId();
      elements.timerText.textContent = "Opening googlePay...";
      setMessage("Direct UPI launch test start ho raha hai.", false);
      syncUi();
      window.location.href = upiUrl;
    } catch (error) {
      setMessage(error.message || "UPI app open nahi ho paya.", true);
    }
  }

  function openUpiApp(target) {
    const upiUrl = buildUpiUrl(target);
    if (!upiUrl) {
      return;
    }
    state.lastTarget = target || "generic";
    elements.timerText.textContent = "Opening " + state.lastTarget + "...";
    syncUi();
    window.location.href = upiUrl;
  }

  async function refreshStatus() {
    try {
      const data = await apiRequest("/api/payments/upi-status?referenceId=" + encodeURIComponent(state.referenceId), "GET");
      state.lastResponse = data;
      setMessage("Latest backend payment status loaded.", false);
      syncUi();
    } catch (error) {
      setMessage(error.message || "Unable to load payment status.", true);
    }
  }

  async function reportStatus(status) {
    try {
      const data = await apiRequest("/api/payments/upi-report", "POST", {
        referenceId: state.referenceId,
        appName: "LOCAL_PROCESSOR",
        appReportedStatus: status,
        rawResponse: String(elements.rawResponse.value || "").trim()
      });
      state.lastResponse = data;
      setMessage("Reported " + status + " to backend.", false);
      syncUi();
    } catch (error) {
      setMessage(error.message || "Unable to report payment status.", true);
    }
  }

  elements.startButton.addEventListener("click", function () {
    void startDeposit();
  });

  elements.googlePayButton.addEventListener("click", function () {
    openUpiApp("googlePay");
  });

  elements.phonePeButton.addEventListener("click", function () {
    openUpiApp("phonePe");
  });

  elements.paytmButton.addEventListener("click", function () {
    openUpiApp("paytm");
  });

  elements.otherUpiButton.addEventListener("click", function () {
    openUpiApp("generic");
  });

  elements.refreshButton.addEventListener("click", function () {
    void refreshStatus();
  });

  elements.successButton.addEventListener("click", function () {
    void reportStatus("SUCCESS");
  });

  elements.failedButton.addEventListener("click", function () {
    void reportStatus("FAILED");
  });

  elements.cancelledButton.addEventListener("click", function () {
    void reportStatus("CANCELLED");
  });

  elements.upiId.addEventListener("input", syncUi);
  elements.amount.addEventListener("input", syncUi);

  syncUi();
})();
