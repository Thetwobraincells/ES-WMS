import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import { Shield } from "lucide-react";

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await login(email, password, otp || undefined);
      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(message);
    }
  }

  return (
    <main className="gradient-login flex min-h-screen items-center justify-center p-4">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-brand-500/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-teal-500/15 blur-[100px]" />
      </div>

      <Card
        variant="glass"
        className="animate-scale-in relative w-full max-w-md border-white/20 bg-white/10 p-8 backdrop-blur-xl"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 shadow-glow">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">ES-WMS</h1>
            <p className="text-sm font-medium text-white/60">
              Integrated Command &amp; Control Centre
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mb-6 rounded-xl border border-brand-500/20 bg-brand-500/10 px-4 py-2.5 text-center text-xs text-brand-200">
          Admin access only — use your official credentials
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2.5 text-center text-xs text-red-200">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand-400/40 focus:ring-2 focus:ring-brand-400/20"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand-400/40 focus:ring-2 focus:ring-brand-400/20"
          />

          <input
            type="text"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="Optional 2FA code"
            autoComplete="one-time-code"
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand-400/40 focus:ring-2 focus:ring-brand-400/20"
          />

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-brand-500 text-sm font-semibold text-white shadow-glow hover:bg-brand-600"
            disabled={isLoading}
          >
            {isLoading ? <Spinner /> : null}
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[10px] text-white/30">
          © 2026 Brihanmumbai Municipal Corporation — SWM Digital Platform
        </p>
      </Card>
    </main>
  );
}
