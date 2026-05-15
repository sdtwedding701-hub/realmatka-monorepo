"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Cashfree?: (options: { mode: "production" | "sandbox" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: "_self" | "_blank" }) => Promise<void>;
    };
  }
}

type CashfreePayButtonProps = {
  paymentSessionId?: string;
  mode?: string;
  autoOpen?: boolean;
};

export function CashfreePayButton({ paymentSessionId = "", mode = "production", autoOpen = false }: CashfreePayButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");
  const didAutoOpen = useRef(false);

  useEffect(() => {
    if (!paymentSessionId) {
      return;
    }

    if (window.Cashfree) {
      setIsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => setIsReady(true);
    script.onerror = () => setError("Payment checkout load nahi hua. Please dobara try karein.");
    document.body.appendChild(script);
  }, [paymentSessionId]);

  async function openCheckout() {
    setError("");
    if (!paymentSessionId) {
      setError("Payment session missing hai. App se dobara Add Fund try karein.");
      return;
    }
    if (!window.Cashfree) {
      setError("Payment checkout abhi ready nahi hai. Kuch seconds baad retry karein.");
      return;
    }

    try {
      const cashfree = window.Cashfree({
        mode: mode === "sandbox" ? "sandbox" : "production"
      });
      await cashfree.checkout({
        paymentSessionId,
        redirectTarget: "_self"
      });
    } catch {
      setError("Payment checkout open nahi ho paya. Please dobara try karein.");
    }
  }

  useEffect(() => {
    if (!autoOpen || !isReady || !paymentSessionId || didAutoOpen.current) {
      return;
    }

    didAutoOpen.current = true;
    const timer = window.setTimeout(() => {
      void openCheckout();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [autoOpen, isReady, paymentSessionId]);

  return (
    <>
      <button
        className="button buttonPrimary fullButton"
        disabled={!paymentSessionId || !isReady}
        onClick={openCheckout}
        type="button"
      >
        {isReady ? "Open Payment Checkout" : "Loading Payment..."}
      </button>
      {error ? <p className="checkoutError">{error}</p> : null}
    </>
  );
}
