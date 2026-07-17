import { useState } from "react";
import { useLocation } from "wouter";
import { authClient } from "../lib/auth";
import { Logo } from "../components/logo";

export default function SignIn() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res =
        mode === "in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name });
      if (res.error) setError(res.error.message ?? "Something went wrong");
      else navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError("");
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
    if (result.error) setError(result.error.message ?? "Google sign-in failed");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-neon opacity-20 blur-[120px] animate-drift" />

      <div className="glass-card glow-border relative z-10 w-full max-w-md p-8">
        <div className="mb-6">
          <Logo size="lg" />
        </div>

        <h1 className="font-display text-2xl font-bold">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-[#9AA0AC]">
          {mode === "in" ? "Sign in to keep turning videos into viral clips." : "Start turning one video into 100 viral clips."}
        </p>

        <button
          onClick={google}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium transition hover:bg-white/10"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-[#9AA0AC]">
          <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "up" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-[#00E5FF]/50"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-[#00E5FF]/50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={8}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-[#00E5FF]/50"
          />
          {error && <p className="text-sm text-[#FF4D4D]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-xl bg-gradient-neon py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#9AA0AC]">
          {mode === "in" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="font-medium text-[#00E5FF] hover:underline">
            {mode === "in" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
