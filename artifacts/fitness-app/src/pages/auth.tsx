import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Loader2, MailCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { withBase } from "@/lib/base-path";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthActions } from "@/lib/auth";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [consent, setConsent] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [config, setConfig] = useState<{ signupsOpen: boolean; emailEnabled: boolean } | null>(null);
  useEffect(() => {
    fetch(withBase("/api/auth/config")).then((r) => (r.ok ? r.json() : null)).then(setConfig).catch(() => undefined);
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { login, signup } = useAuthActions();

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (isForgot) {
      setBusy(true);
      try {
        const res = await fetch(withBase("/api/auth/forgot"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
        setSentTo(email);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (isSignup && !consent) {
      setError("Please agree to the privacy notice to continue.");
      return;
    }
    if (isSignup && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await (isSignup ? signup(email, password, consent) : login(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="onboarding-page flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Logo showTagline className="mb-8" />

        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em]">
          {isSignup ? "Start your plan" : isForgot ? "Forgot your password?" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignup
            ? "Create an account to save your workouts, meals and progress."
            : isForgot
              ? "Enter your email and we'll send you a link to choose a new one."
              : "Log in to pick up where you left off."}
        </p>

        <Card className="mt-6 border-border/80 bg-card/95 shadow-xl shadow-foreground/5">
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                />
              </div>
              {!isForgot && (<div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignup && config?.emailEnabled && (
                    <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => { setMode("forgot"); setError(null); setSentTo(null); }} data-testid="button-forgot">
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                />
                {isSignup && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}
              </div>)}
              {isSignup && (
                <div className="flex items-start gap-2.5">
                  <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" data-testid="checkbox-consent" />
                  <Label htmlFor="consent" className="text-sm font-normal leading-snug">
                    I agree to the{" "}
                    <Link href="/privacy" className="font-semibold text-primary hover:underline">privacy notice</Link>, including
                    storing my body measurements and food logs to build my plan.
                  </Label>
                </div>
              )}
              {isForgot && sentTo && (
                <p className="flex gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm" role="status">
                  <MailCheck className="h-4 w-4 shrink-0 translate-y-0.5 text-primary" />
                  If {sentTo} has an account, a reset link is on its way. Check your spam folder too. The link works for an hour.
                </p>
              )}
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert" data-testid="text-auth-error">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={busy} data-testid="button-auth-submit">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignup ? "Create account" : isForgot ? (sentTo ? "Send again" : "Send reset link") : "Log in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isForgot ? (
          <p className="mt-5 text-center text-sm">
            <button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setMode("login"); setError(null); }}>
              Back to log in
            </button>
          </p>
        ) : config?.signupsOpen === false && !isSignup ? null : (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setError(null);
            }}
            data-testid="button-toggle-auth-mode"
          >
            {isSignup ? "Log in" : "Create an account"}
          </button>
        </p>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:underline">Privacy notice</Link>
        </p>
      </div>
    </main>
  );
}
