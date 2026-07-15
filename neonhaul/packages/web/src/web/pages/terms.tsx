import { Link } from "wouter";
import { Logo } from "../components/logo";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/8 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-[#9AA0AC] hover:text-white">Back to home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="font-display text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#9AA0AC]">Last updated: {new Date().toISOString().slice(0, 10)}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-[#c7cad1]">
          <p>
            These Terms of Service ("Terms") govern your use of Clipzy (the "Service"), an application that
            transcribes and edits video you upload or link, generates short vertical clips using AI, and lets you
            schedule or publish those clips to third-party social platforms you connect (currently YouTube, TikTok,
            and Instagram).
          </p>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">1. Your Account</h2>
            <p className="mt-2">
              You're responsible for the accuracy of information you provide and for keeping your login credentials
              secure. You must be legally permitted to use each connected social platform's API in your region.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">2. Content You Upload</h2>
            <p className="mt-2">
              You retain ownership of any video you upload or link. By using the Service, you grant us a limited
              license to store, process, transcribe, and transform that content solely to provide the Service
              (e.g. generating clips, captions, and thumbnails). You confirm you have the necessary rights to upload
              and process the content, and to publish any resulting clips to platforms you connect.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">3. Connected Social Accounts</h2>
            <p className="mt-2">
              When you connect a YouTube, TikTok, or Instagram account, you authorize the Service to post content on
              your behalf and to read basic account/video metadata, using the permissions you approve during that
              platform's own authorization flow. You can revoke this access at any time from the Connections page in
              the Service, or directly from the third-party platform's own app-permissions settings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">4. Acceptable Use</h2>
            <p className="mt-2">
              You agree not to use the Service to upload or publish content that is illegal, infringes on others'
              rights, or violates the terms of service of any platform you connect through the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">5. Plans and Billing</h2>
            <p className="mt-2">
              Paid plans are billed on a recurring basis through our payment processor. You can upgrade, downgrade,
              or cancel at any time; changes take effect according to the billing terms shown at checkout.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">6. Service Availability</h2>
            <p className="mt-2">
              The Service is provided "as is" without warranties of any kind. Video processing, AI-generated
              captions/moment detection, and posting to third-party platforms may occasionally fail or be delayed due
              to factors outside our control, including third-party API or platform outages.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">7. Changes</h2>
            <p className="mt-2">
              We may update these Terms from time to time. Continued use of the Service after an update constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">8. Contact</h2>
            <p className="mt-2">
              Questions about these Terms can be sent to the contact address listed on your account or in the app's
              support settings.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
