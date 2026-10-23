import { useState, type FormEvent } from "react";
import { Activity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthActions } from "@/lib/auth";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { login, signup } = useAuthActions();

  const isSignup = mode === "signup";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (isSignup && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await (isSignup ? signup : login)(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="onboarding-page flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight">F90</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your pace, your plan</p>
          </div>
        </div>

        <h1 className="text-3xl font-black leading-tight tracking-[-0.04em]">
          {isSignup ? (
            <>Start your <span className="text-primary">plan.</span></>
          ) : (
            <>Welcome <span className="text-primary">back.</span></>
          )}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignup ? "Create an account to save your workouts, meals and progress." : "Log in to pick up where you left off."}
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
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
              </div>
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert" data-testid="text-auth-error">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={busy} data-testid="button-auth-submit">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignup ? "Create account" : "Log in"}
              </Button>
            </form>
          </CardContent>
        </Card>

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
      </div>
    </main>
  );
}
