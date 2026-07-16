import { Link } from "wouter";
import { Logo } from "../components/logo";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/8 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-[#9AA0AC] hover:text-white">Back to home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="font-display text-3xl font-bold">Refund Policy</h1>
        <p className="mt-2 text-sm text-[#9AA0AC]">Last updated: {new Date().toISOString().slice(0, 10)}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-[#c7cad1]">
          <section>
            <h2 className="font-display text-lg font-semibold text-white">1. No Refunds</h2>
            <p className="mt-2">
              Payments for Clipzy's Pro and Business plans are non-refundable. This applies to the initial payment
              and to every recurring renewal charge.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">2. Cancelling Your Plan</h2>
            <p className="mt-2">
              You can cancel your subscription at any time from the Pricing page in the app. When you cancel, your
              plan remains fully active until the end of your current billing period — you keep access to
              everything you're paying for until then. At the end of that period, your plan automatically moves to
              the Free plan and you won't be charged again. We don't issue partial or prorated refunds for the
              unused portion of a billing period.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">3. Billing Errors</h2>
            <p className="mt-2">
              If you believe you were charged in error (e.g. a duplicate charge or a charge after you cancelled),
              contact us using the details below and we'll investigate.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">4. Payment Processing</h2>
            <p className="mt-2">
              Payments are processed by Polar Software, Inc., our authorized reseller and merchant of record. Polar
              handles billing and payment collection on our behalf.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">5. Contact</h2>
            <p className="mt-2">
              Questions about a charge can be sent to the contact address listed on your account or in the app's
              support settings.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
