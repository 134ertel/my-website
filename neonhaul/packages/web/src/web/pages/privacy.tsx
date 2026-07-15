import { Link } from "wouter";
import { Logo } from "../components/logo";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/8 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-[#9AA0AC] hover:text-white">Back to home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="font-display text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#9AA0AC]">Last updated: {new Date().toISOString().slice(0, 10)}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-[#c7cad1]">
          <p>
            This Privacy Policy explains what data Clipzy (the "Service") collects, why, and how it's used when you
            upload or link video, generate AI clips, and connect social accounts to post them.
          </p>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">1. Information We Collect</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong className="text-white">Account info:</strong> name, email, and authentication data when you sign up or sign in.</li>
              <li><strong className="text-white">Uploaded content:</strong> videos or video URLs you submit, and the audio transcript, captions, and clips generated from them.</li>
              <li><strong className="text-white">Connected social accounts:</strong> OAuth access/refresh tokens and basic profile info (account name, avatar) for any YouTube, TikTok, or Instagram account you connect, used only to post clips and read publishing status on your behalf.</li>
              <li><strong className="text-white">Usage data:</strong> basic product analytics (pages visited, features used) to help us improve the Service.</li>
              <li><strong className="text-white">Billing data:</strong> subscription plan and payment status, handled by our payment processor — we do not store your full card details ourselves.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">2. How We Use Your Information</h2>
            <p className="mt-2">We use the information above to:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Transcribe your video and detect AI-suggested "viral moments" using third-party AI providers (e.g. speech-to-text and language models).</li>
              <li>Render vertical clips with burned-in captions, filters, and any customizations you choose.</li>
              <li>Publish or schedule clips to the social accounts you explicitly connect and authorize.</li>
              <li>Operate, maintain, and improve the Service, including diagnosing failed uploads or renders.</li>
              <li>Process payments and manage your subscription plan.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">3. Third-Party Services</h2>
            <p className="mt-2">
              We share data with third-party providers only as needed to run the Service: cloud storage for your
              uploaded/rendered video files, an AI provider for transcription and moment-detection, a payment
              processor for billing, and the specific social media platforms (YouTube, TikTok, Instagram) you choose
              to connect. We do not sell your personal data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">4. Data Retention</h2>
            <p className="mt-2">
              We retain uploaded videos, transcripts, and rendered clips for as long as your account is active, or
              until you delete them. You can disconnect a social account at any time, which removes its stored
              access tokens from our systems.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">5. Your Choices</h2>
            <p className="mt-2">
              You can disconnect any connected social account from the Connections page at any time. You can request
              deletion of your account and associated data by contacting us through your account's support settings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">6. Security</h2>
            <p className="mt-2">
              We use industry-standard measures (encrypted storage, access-token-based authentication) to protect
              your data, but no method of transmission or storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">7. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. Material changes will be reflected by updating
              the "Last updated" date above.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-white">8. Contact</h2>
            <p className="mt-2">
              Questions about this policy or your data can be sent to the contact address listed in the app's
              support settings.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
