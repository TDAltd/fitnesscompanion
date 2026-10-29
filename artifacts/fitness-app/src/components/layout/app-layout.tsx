import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Dumbbell, LineChart, Salad, Sun, CircleUserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand/logo";

interface AppLayoutProps {
  children: ReactNode;
}

type NavItem = { href: string; label: string; icon: LucideIcon; also?: string[] };

export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/train", label: "Train", icon: Dumbbell },
  { href: "/eat", label: "Eat", icon: Salad },
  { href: "/progress", label: "Progress", icon: LineChart },
  {
    href: "/me",
    label: "Me",
    icon: CircleUserRound,
    also: ["/plan", "/body", "/account", "/connect-health", "/reminders", "/privacy"],
  },
];

const isActive = (item: NavItem, location: string) =>
  location === item.href || location.startsWith(`${item.href}/`) || (item.also ?? []).includes(location);

const TITLES: Record<string, string> = {
  "/today": "Today",
  "/train": "Train",
  "/eat": "Eat",
  "/progress": "Progress",
  "/me": "Me",
  "/plan": "My plan",
  "/body": "Body",
  "/account": "Account",
  "/connect-health": "Connect devices",
  "/reminders": "Reminders",
  "/privacy": "Privacy",
};

/** Each page opens at the top and names itself in the browser tab. */
export function usePageChrome(location: string) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    const name = TITLES[location];
    document.title = name ? `${name} · Fitness Companion` : "Fitness Companion";
  }, [location]);
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  usePageChrome(location);

  return (
    <div className="min-h-[100dvh] bg-background md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <Link href="/today" className="mb-8 px-2" aria-label="Fitness Companion home">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item, location);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone header */}
        <header className="sticky top-0 z-40 flex items-center border-b border-border/60 bg-background/85 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-md md:hidden">
          <Link href="/today" className="flex items-center gap-2" aria-label="Fitness Companion home">
            <LogoMark className="h-7 w-7" />
            <span className="font-display text-[15px] font-medium">Fitness Companion</span>
          </Link>
        </header>

        <main className="flex-1 pb-28 md:pb-12">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-10 md:py-10">{children}</div>
        </main>
      </div>

      {/* Phone tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item, location);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-testid={`tab-${item.label.toLowerCase()}`}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className={cn("rounded-full px-4 py-1 transition-colors", active && "bg-primary/12")}>
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
