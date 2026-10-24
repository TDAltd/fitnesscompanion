import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Calculator, CircleUserRound, ClipboardList, LineChart, User, UtensilsCrossed, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Activity },
    { href: "/progress", label: "Progress", icon: LineChart },
    { href: "/workout", label: "Workout", icon: Zap },
    { href: "/meals", label: "Meals", icon: UtensilsCrossed },
    { href: "/stats", label: "Stats", icon: User },
    { href: "/calorie-calculator", label: "Calorie calculator", icon: Calculator },
    { href: "/plan", label: "My plan", icon: ClipboardList },
    { href: "/account", label: "Account", icon: CircleUserRound },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background md:flex-row">
      <nav className="fixed bottom-0 z-50 w-full border-t border-border bg-card/80 backdrop-blur-md pb-safe md:relative md:w-16 md:border-t-0 md:border-r md:h-[100dvh] md:pb-0">
        <div className="hidden md:flex h-14 items-center justify-center border-b border-border">
          <span className="font-black text-sm tracking-tighter uppercase text-primary">F90</span>
        </div>
        <div className="flex justify-around md:flex-col md:justify-start md:px-2 md:gap-1 md:pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
            <Link key={item.href} href={item.href} aria-label={item.label}>
                <div
                  className={cn(
                    "flex items-center justify-center p-3 cursor-pointer transition-colors md:rounded-lg",
                    isActive
                      ? "text-primary md:bg-primary md:text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground md:hover:bg-muted"
                  )}
                  title={item.label}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
