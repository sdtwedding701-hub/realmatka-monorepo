(function () {
  const params = new URLSearchParams(window.location.search);
  const amount = Number(params.get("amount") || 0);
  const upiId = String(params.get("upiId") || "").trim();
  const upiName = String(params.get("upiName") || "Real Matka").trim();
  const apiBase = String(params.get("apiBase") || "").trim();
  const token = String(params.get("token") || "").trim();
  const packages = {
    googlePay: "com.google.android.apps.nbu.paisa.user",
    phonePe: "com.phonepe.app",
    paytm: "net.one97.paytm"
  };

  const state = {
    referenceId: "",
    lastTarget: "googlePay",
    lastResponse: null,
    secondsLeft: 30
  };

  const elements = {
    amount: document.getElementById("checkoutAmount"),
    status: document.getElementById("checkoutStatus"),
    reference: document.getElementById("checkoutReference"),
    beneficiary: document.getElementById("checkoutBeneficiary"),
    upiId: document.getElementById("checkoutUpiId"),
    amountPreview: document.getElementById("checkoutAmountPreview"),
    upiUrl: document.getElementById("checkoutUpiUrl"),
    timer: document.getElementById("checkoutTimer"),
    hint: document.getElementById("checkoutHint"),
    message: document.getElementById("checkoutMessage"),
    primary: document.getElementById("checkoutPrimary"),
    googlePay: document.getElementById("checkoutGooglePay"),
    phonePe: document.getElementById("checkoutPhonePe"),
    paytm: document.getElementById("checkoutPaytm"),
    other: document.getElementById("checkoutOther"),
    refresh: document.getElementById("checkoutRefresh"),
    submitted: document.getElementById("checkoutSubmitted"),
    failed: document.getElementById("checkoutFailed"),
    cancelled: document.getElementById("checkoutCancelled"),
    rawResponse: document.getElementById("checkoutRawResponse"),
    result: document.getElementById("checkoutResult")
  };

  function buildReferenceId() {
    return ("RM" + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 4).toUpperCase()).slice(0, 12);
  }

  function buildUpiUrl(target) {
    if (!upiId || !Number.isFinite(amount) || amount <= 0) {
      return "";
    }

    const query = new URLSearchParams({
      pa: upiId,
      pn: upiName,
      am: amount.toFixed(2),
      cu: "INR"
    }).toString();

    if (!target || target === "generic") {
      return "upi://pay?" + query;
    }

    return "intent://pay?" + query + "#Intent;scheme=upi;package=" + packages[target] + ";end";
  }

  function buildReadableUpiUrl() {
    if (!upiId || !Number.isFinite(amount) || amount <= 0) {
      return "";
    }
    const parts = ["pa=" + upiId];
    if (upiName) {
      parts.push("pn=" + upiName);
    }
    parts.push("am=" + amount.toFixed(2));
    parts.push("cu=INR");
    return "upi://pay?" + parts.join("&");
  }

  function setMessage(text, isError) {
    elements.message.textContent = text;
    elements.message.style.color = isError ? "#b91c1c" : "#475569";
  }

  function syncUi() {
    const canOpen = Boolean(buildUpiUrl("generic"));
    elements.amount.value = Number.isFinite(amount) ? amount.toFixed(2) : "";
    elements.beneficiary.textContent = upiName || "-";
    elements.upiId.textContent = upiId || "-";
    elements.amountPreview.textContent = Number.isFinite(amount) ? "INR " + amount.toFixed(2) : "-";
    elements.upiUrl.textContent = buildReadableUpiUrl() || "Preparing UPI URL...";
    elements.reference.textContent = state.referenceId ? "Ref: " + state.referenceId : "Creating payment reference...";
    elements.hint.textContent = "Choose your payment app. Current target: " + state.lastTarget;
    elements.timer.textContent = "processor auto-opens in: 0 Min : " + String(state.secondsLeft).padStart(2, "0") + " Secs";
    elements.primary.disabled = !canOpen;
    elements.googlePay.disabled = !canOpen;
    elements.phonePe.disabled = !canOpen;
    elements.paytm.disabled = !canOpen;
    elements.other.disabled = !canOpen;
    elements.result.textContent = JSON.stringify(state.lastResponse || {}, null, 2);
  }

  async function apiRequest(path, method, body) {
    if (!apiBase || !token) {
      throw new Error("API Base URL aur Bearer token required hain.");
    }
    const response = await fetch(apiBase.replace(/\/$/, "") + path, {
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

  async function createSession() {
    state.referenceId = buildReferenceId();
    elements.status.textContent = "Creating secure deposit session...";
    syncUi();

    if (!token) {
      elements.status.textContent = "Secure processor ready";
      setMessage("Backend token nahi diya gaya. UI-only checkout test active hai.", false);
      return;
    }

    try {
      const data = await apiRequest("/api/payments/upi-start", "POST", {
        amount,
        referenceId: state.referenceId,
        appName: "PAYMENT_SYSTEM_CHECKOUT"
      });
      state.lastResponse = data;
      elements.status.textContent = "Secure processor ready";
      setMessage("Deposit session created. Payment app select karo.", false);
      syncUi();
    } catch (error) {
      elements.status.textContent = "Processor session failed";
      setMessage(error.message || "Deposit session create nahi ho payi.", true);
      syncUi();
    }
  }

  function openUpi(target) {
    const url = buildUpiUrl(target);
    if (!url) {
      setMessage("UPI ID ya amount invalid hai.", true);
      return;
    }
    state.lastTarget = target || "generic";
    elements.status.textContent = "Opening payment app...";
    setMessage("Redirecting to " + state.lastTarget + "...", false);
    syncUi();
    window.location.href = url;
  }

  async function reportStatus(status) {
    if (!token) {
      const nextPage = status === "FAILED" ? "./failed.html" : status === "CANCELLED" ? "./pending.html" : "./success.html";
      const nextUrl = new URL(nextPage, window.location.href);
      nextUrl.searchParams.set("referenceId", state.referenceId);
      window.location.href = nextUrl.toString();
      return;
    }

    try {
      const data = await apiRequest("/api/payments/upi-report", "POST", {
        referenceId: state.referenceId,
        appName: "PAYMENT_SYSTEM_CHECKOUT",
        appReportedStatus: status,
        rawResponse: String(elements.rawResponse.value || "").trim()
      });
      state.lastResponse = data;
      const nextPage = status === "FAILED" ? "./failed.html" : status === "CANCELLED" ? "./pending.html" : "./success.html";
      const nextUrl = new URL(nextPage, window.location.href);
      nextUrl.searchParams.set("referenceId", state.referenceId);
      window.location.href = nextUrl.toString();
    } catch (error) {
      setMessage(error.message || "Status report nahi ho paya.", true);
      syncUi();
    }
  }

  async function refreshStatus() {
    try {
      const data = await apiRequest("/api/payments/upi-status?referenceId=" + encodeURIComponent(state.referenceId), "GET");
      state.lastResponse = data;
      elements.status.textContent = "Latest backend status loaded";
      setMessage("Status refreshed from backend.", false);
      syncUi();
    } catch (error) {
      setMessage(error.message || "Status refresh nahi ho paya.", true);
    }
  }

  let autoTimer = null;
  function startTimer() {
    if (autoTimer) {
      clearInterval(autoTimer);
    }
    autoTimer = setInterval(function () {
      state.secondsLeft = Math.max(0, state.secondsLeft - 1);
      syncUi();
      if (state.secondsLeft === 0) {
        clearInterval(autoTimer);
      }
    }, 1000);
  }

  elements.primary.addEventListener("click", function () {
    openUpi("googlePay");
  });
  elements.googlePay.addEventListener("click", function () {
    openUpi("googlePay");
  });
  elements.phonePe.addEventListener("click", function () {
    openUpi("phonePe");
  });
  elements.paytm.addEventListener("click", function () {
    openUpi("paytm");
  });
  elements.other.addEventListener("click", function () {
    openUpi("generic");
  });
  elements.refresh.addEventListener("click", function () {
    void refreshStatus();
  });
  elements.submitted.addEventListener("click", function () {
    void reportStatus("SUBMITTED");
  });
  elements.failed.addEventListener("click", function () {
    void reportStatus("FAILED");
  });
  elements.cancelled.addEventListener("click", function () {
    void reportStatus("CANCELLED");
  });

  if (!Number.isFinite(amount) || amount <= 0 || !upiId) {
    elements.status.textContent = "Invalid checkout parameters";
    setMessage("Amount aur UPI ID ke bina checkout page open nahi ho sakti.", true);
  } else {
    void createSession();
    startTimer();
    setTimeout(function () {
      openUpi("googlePay");
    }, 1200);
  }

  syncUi();
})();
