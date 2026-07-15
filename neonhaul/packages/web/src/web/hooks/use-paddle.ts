import { useCallback } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

function getPaddle() {
  if (!paddlePromise) {
    paddlePromise = initializePaddle({ token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN, environment: "production" });
  }
  return paddlePromise;
}

export function usePaddleCheckout() {
  const openCheckout = useCallback(async (opts: { priceId: string; userId: string; email?: string }) => {
    const paddle = await getPaddle();
    paddle?.Checkout.open({
      items: [{ priceId: opts.priceId, quantity: 1 }],
      customer: opts.email ? { email: opts.email } : undefined,
      customData: { userId: opts.userId },
      settings: { successUrl: `${window.location.origin}/pricing?checkout=success` },
    });
  }, []);

  return { openCheckout };
}
