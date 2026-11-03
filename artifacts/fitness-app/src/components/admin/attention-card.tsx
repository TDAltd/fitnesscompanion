import { Link } from "wouter";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAlerts } from "@/lib/admin-alerts";
import { cn } from "@/lib/utils";

/** The few things on the Overview that need the admin, each linking to its section. */
export function AttentionCard({ signupsOpen }: { signupsOpen: boolean }) {
  const a = useAdminAlerts();
  if (!a.loaded) return null;
  const items: { ok: boolean; text: string; href: string }[] = [
    {
      ok: a.openProblems === 0,
      text: a.openProblems === 0 ? "No open problems" : `${a.openProblems} open problem${a.openProblems === 1 ? "" : "s"} to look at`,
      href: "/admin/problems",
    },
    {
      ok: !!a.offsiteOk,
      text: a.offsiteOk ? "Nightly backup to GitHub is working" : "Nightly GitHub backup isn't set up yet (3 minutes)",
      href: "/admin/settings",
    },
    { ok: signupsOpen, text: signupsOpen ? "Sign-ups are open" : "Sign-ups are closed", href: "/admin/settings" },
  ];
  const todo = items.filter((i) => !i.ok).length;
  return (
    <Card data-testid="attention-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{todo ? `Needs you (${todo})` : "All good"}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <ul className="divide-y">
          {items.map((i) => (
            <li key={i.text}>
              <Link href={i.href} className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/50">
                {i.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
                <span className={cn("flex-1", !i.ok && "font-semibold")}>{i.text}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
