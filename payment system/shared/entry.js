(function () {
  const amountInput = document.getElementById("entryAmount");
  const upiIdInput = document.getElementById("entryUpiId");
  const upiNameInput = document.getElementById("entryUpiName");
  const apiBaseInput = document.getElementById("entryApiBase");
  const tokenInput = document.getElementById("entryToken");
  const message = document.getElementById("entryMessage");
  const goButton = document.getElementById("goToCheckout");

  const defaultApiBase =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.protocol + "//" + window.location.hostname + ":3000"
      : "http://localhost:3000";

  apiBaseInput.value = defaultApiBase;

  function setMessage(text, isError) {
    message.textContent = text;
    message.style.color = isError ? "#b91c1c" : "#667085";
  }

  goButton.addEventListener("click", function () {
    const amount = Number(amountInput.value || 0);
    const upiId = String(upiIdInput.value || "").trim();
    const upiName = String(upiNameInput.value || "").trim();
    const apiBase = String(apiBaseInput.value || "").trim();
    const token = String(tokenInput.value || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Valid amount enter karo.", true);
      return;
    }

    if (!upiId) {
      setMessage("UPI ID required hai.", true);
      return;
    }

    const nextUrl = new URL("./checkout.html", window.location.href);
    nextUrl.searchParams.set("amount", String(amount));
    nextUrl.searchParams.set("upiId", upiId);
    nextUrl.searchParams.set("upiName", upiName || "Real Matka");
    nextUrl.searchParams.set("apiBase", apiBase || defaultApiBase);
    if (token) {
      nextUrl.searchParams.set("token", token);
    }

    window.location.href = nextUrl.toString();
  });
})();
