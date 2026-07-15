import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout/app-shell";
import { api } from "../lib/api";
import { authClient } from "../lib/auth";
import { usePaddleCheckout } from "../hooks/use-paddle";

const PLAN_ITEMS: Record<string, string[]> = {
  free: ["10 minute videos lengths", "20 uploads/month", "AI clips", "Auto captions"],
  pro: ["35 minutes videos uploads", "100 uploads/month", "60 videos/month", "Access to Editor", "Auto Post"],
  business: ["Everything in Pro", "Unlimited uploads", "Unlimited clips", "Unlimited posting", "Priority rendering"],
};

const DEALS: Record<string, { was: string; off: string }> = {
  pro: { was: "$49", off: "78% OFF" },
  business: { was: "$149", off: "70% OFF" },
};

export default function Pricing() {
  const qc = useQueryClient();
  const { data: session } = authClient.useSession();
  const { openCheckout } = usePaddleCheckout();
  const [pending, setPending] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const plans = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => (await api.billing.plans.$get()).json(),
  });

  const me = useQuery({
    queryKey: ["billing-me"],
    queryFn: async () => (await api.billing.me.$get()).json(),
    refetchInterval: polling ? 2000 : false,
  });

  const activePlanId = me.data?.planId ?? "free";
  const isPendingCancel = Boolean(me.data?.cancelAtPeriodEnd);

  const handleUpgrade = async (priceId: string | null) => {
    if (!priceId || !session?.user) return;
    await openCheckout({ priceId, userId: session.user.id, email: session.user.email });
    setPolling(true);
    setTimeout(() => setPolling(false), 15000);
  };

  const handleCancel = async () => {
    if (!window.confirm("Your plan will stay active until the end of the current billing period, then move to the Free plan. You won't be charged again. Continue?")) return;
    setPending("cancel");
    try {
      await api.billing.cancel.$post();
      await qc.invalidateQueries({ queryKey: ["billing-me"] });
    } finally {
      setPending(null);
    }
  };

  const handleUndoCancel = async () => {
    setPending("uncancel");
    try {
      await api.billing.uncancel.$post();
      await qc.invalidateQueries({ queryKey: ["billing-me"] });
    } finally {
      setPending(null);
    }
  };

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">Pricing</h1>
      <p className="mt-1 text-sm text-muted-foreground">Upgrade anytime. Cancel anytime.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {(plans.data ?? []).map((plan) => {
          const isActive = plan.id === activePlanId;
          const highlighted = plan.id === "pro";
          const deal = DEALS[plan.id];
          return (
            <div key={plan.id} className={`glass-card p-7 ${highlighted ? "glow-border" : ""}`}>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                {deal && (
                  <span className="rounded-full bg-gradient-neon px-2.5 py-1 text-xs font-bold text-black">{deal.off}</span>
                )}
              </div>
              {deal && <p className="mt-3 text-sm text-muted-foreground line-through">{deal.was}/mo</p>}
              <p className={`font-display text-3xl font-bold ${deal ? "mt-0.5" : "mt-3"}`}>
                {plan.priceDisplay ?? "Free"}
                {plan.priceDisplay && <span className="text-sm text-muted-foreground"> /mo</span>}
              </p>
              {deal && <p className="mt-1 text-xs text-[#2EFFB0]">Limited-time deal — lock in this price now.</p>}
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                {(PLAN_ITEMS[plan.id] ?? []).map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
              <button
                disabled={isActive || polling}
                onClick={() => handleUpgrade(plan.paddlePriceId)}
                className={`mt-6 w-full rounded-xl py-2.5 text-sm font-semibold ${
                  isActive ? "cursor-default border border-border text-muted-foreground" : highlighted ? "bg-gradient-neon text-black" : "border border-border bg-muted"
                }`}
              >
                {isActive ? "Current Plan" : polling ? "Finalizing…" : "Upgrade"}
              </button>
              {isActive && plan.id !== "free" && (
                isPendingCancel ? (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Cancels on {me.data?.currentPeriodEnd ? new Date(me.data.currentPeriodEnd).toLocaleDateString() : "your next billing date"} — then moves to Free.
                    </p>
                    <button
                      onClick={handleUndoCancel}
                      disabled={pending === "uncancel"}
                      className="mt-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      {pending === "uncancel" ? "Undoing…" : "Keep my plan"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCancel}
                    disabled={pending === "cancel"}
                    className="mt-2 w-full rounded-xl py-2 text-xs font-medium text-muted-foreground hover:text-[#FF4D4D] disabled:opacity-50"
                  >
                    {pending === "cancel" ? "Cancelling…" : "Cancel plan"}
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
