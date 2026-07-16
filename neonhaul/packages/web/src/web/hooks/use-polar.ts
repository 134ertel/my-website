import { useCallback } from "react";
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import { api } from "../lib/api";

export function usePolarCheckout() {
  const openCheckout = useCallback(async (planId: "pro" | "business") => {
    const res = await api.billing.checkout.$post({ json: { planId } });
    const { url } = await res.json();
    await PolarEmbedCheckout.create(url, { theme: "dark" });
  }, []);

  return { openCheckout };
}
