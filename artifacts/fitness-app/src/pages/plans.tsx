import { FITNESS_PLANS, WEEKLY_SCHEDULE } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dumbbell, Utensils, Target, ShieldAlert, Calendar } from "lucide-react";

export default function PlansPage() {
  const getIconForPlan = (id: string) => {
    switch (id) {
      case 'workout': return Dumbbell;
      case 'diet': return Utensils;
      case 'targets': return Target;
      case 'plateau': return ShieldAlert;
      case 'phases': return Calendar;
      default: return Target;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
          THE PLAYBOOK
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono">
          Read it. Internalize it. Execute it.
        </p>
      </header>

      {/* WEEKLY SCHEDULE HIGHLIGHT */}
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader>
          <CardTitle className="uppercase tracking-wide text-primary">Weekly Schedule</CardTitle>
          <CardDescription className="text-foreground/80">Your recurring weekly battlefield</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {WEEKLY_SCHEDULE.map((day) => (
              <div 
                key={day.day} 
                className={`p-3 rounded-lg border ${day.rest ? 'bg-card border-border' : 'bg-background border-primary/20'}`}
              >
                <p className={`text-xs font-bold uppercase ${day.rest ? 'text-muted-foreground' : 'text-primary'}`}>
                  {day.label}
                </p>
                <p className="font-bold text-sm mt-1 leading-snug">
                  {day.workout}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FITNESS_PLANS.map((plan) => {
          const Icon = getIconForPlan(plan.id);
          return (
            <Card key={plan.id} className="shadow-sm flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="uppercase tracking-tight text-lg">{plan.title}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{plan.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 bg-muted/20 pt-4 rounded-b-xl border-t border-border">
                <ul className="space-y-3">
                  {plan.details.map((detail, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-primary font-bold shrink-0">•</span>
                      <span className="font-medium text-foreground/90">{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
