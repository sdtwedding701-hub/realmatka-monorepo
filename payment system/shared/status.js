(function () {
  const params = new URLSearchParams(window.location.search);
  const referenceId = String(params.get("referenceId") || "").trim();
  const id =
    document.getElementById("successReference") ||
    document.getElementById("failedReference") ||
    document.getElementById("pendingReference");
  const backLink =
    document.getElementById("successBackCheckout") ||
    document.getElementById("failedBackCheckout") ||
    document.getElementById("pendingBackCheckout");

  if (id) {
    id.textContent = referenceId || "-";
  }

  if (backLink && referenceId) {
    const nextUrl = new URL(backLink.getAttribute("href"), window.location.href);
    nextUrl.searchParams.set("referenceId", referenceId);
    backLink.setAttribute("href", nextUrl.toString());
  }
})();
