import { Link } from "wouter";
import { getGetProfileQueryKey, useGetProfile } from "@workspace/api-client-react";
import { BellRing, ChevronRight, ClipboardList, HeartPulse, LogOut, Ruler, Settings2, UserRoundPen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuthActions, useCurrentUser } from "@/lib/auth";
import { useSyncStatus } from "@/lib/health";
import { usePlan } from "@/lib/plan";

const LINKS = [
  { href: "/plan", icon: ClipboardList, title: "My plan", body: "Your week, weight-loss pace and daily targets" },
  { href: "/body", icon: Ruler, title: "Body & measurements", body: "BMI and body measurements" },
  { href: "/connect-health", icon: HeartPulse, title: "Health devices", body: "iPhone, Apple Watch, Oraimo, Xiaomi, Huawei, Amazfit or a ring" },
  { href: "/reminders", icon: BellRing, title: "Reminders", body: "Water and workout alerts on your phone's calendar" },
  { href: "/onboarding", icon: UserRoundPen, title: "Update my answers", body: "Goal, weight, schedule, where you train" },
  { href: "/account", icon: Settings2, title: "Account & data", body: "Back up, import, and your login" },
];

export default function MePage() {
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const { data: user } = useCurrentUser();
  const { data: sync } = useSyncStatus();
  const { plan } = usePlan();
  const { logout } = useAuthActions();

  const facts = [
    profile?.fitnessGoal,
    profile?.workoutDaysPerWeek ? `${profile.workoutDaysPerWeek} training days` : null,
    plan ? `${plan.targets.calories.toLocaleString()} kcal a day` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader title={profile?.name ? profile.name : "Me"} description={user?.email} />

      {facts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {facts.map((f) => (
            <span key={f} className="rounded-full bg-sage/70 px-3 py-1 text-sm font-semibold text-foreground dark:bg-sage">
              {f}
            </span>
          ))}
        </div>
      )}

      <nav className="overflow-hidden rounded-2xl border bg-card" aria-label="Settings and tools">
        {LINKS.map(({ href, icon: Icon, title, body }, i) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/60 ${i > 0 ? "border-t" : ""}`}
            data-testid={`me-link-${href.slice(1)}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {title}
                {href === "/connect-health" && (
                  <span className={`ml-2 align-middle text-xs font-semibold ${sync?.connected ? "text-primary" : "text-muted-foreground"}`}>
                    {sync?.connected ? "Connected" : "Not connected"}
                  </span>
                )}
              </span>
              <span className="block text-sm text-muted-foreground">{body}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => void logout()}
        className="flex items-center gap-2 px-1 text-sm font-semibold text-destructive hover:underline"
        data-testid="button-me-logout"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}
