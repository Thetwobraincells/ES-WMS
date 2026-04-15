import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InfoBanner } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";

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
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7F6] p-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 space-y-1 text-center">
          <div className="text-2xl font-bold text-[#2E7D32]">ES-WMS</div>
          <p className="text-sm text-gray-600">Command Center</p>
        </div>

        <InfoBanner className="mb-4">
          Admin access only. Use your official command center credentials.
        </InfoBanner>

        {error ? <InfoBanner className="mb-4 border-red-100 bg-red-50 text-red-700">{error}</InfoBanner> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
          />

          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
          />

          <Input
            type="text"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="Optional 2FA code"
            autoComplete="one-time-code"
          />

          <Button
            type="submit"
            className="flex w-full items-center gap-2 bg-[#2E7D32] text-white hover:opacity-95"
            disabled={isLoading}
          >
            {isLoading ? <Spinner /> : null}
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
