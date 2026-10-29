import { useState } from "react";
import { ChevronDown, ExternalLink, Info, Play, Youtube } from "lucide-react";
import { TodaySession } from "@/components/train/today-session";
import { EQUIPMENT, type Session } from "@workspace/plan";
import { SessionLogger } from "@/components/train/session-logger";
import { Link } from "wouter";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { usePlan } from "@/lib/plan";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BADGE_COLORS = ["bg-primary/10 text-primary border-primary/20", "bg-dusk/15 text-foreground border-dusk/30"];

const CHANNELS = [
  {
    name: "Athlean-X",
    description: "Science-based strength & muscle training. 13M+ subscribers.",
    url: "https://www.youtube.com/@AthleanX"
  },
  {
    name: "Jeff Nippard",
    description: "Evidence-based bodybuilding and fat loss.",
    url: "https://www.youtube.com/@JeffNippard"
  },
  {
    name: "Pamela Reif",
    description: "No-equipment home workouts, arms & core focus.",
    url: "https://www.youtube.com/@PamelaRf1"
  },
  {
    name: "Chloe Ting",
    description: "Free workout programs, belly fat & toning.",
    url: "https://www.youtube.com/@ChloeTing"
  },
  {
    name: "Sydney Cummings Houdyshell",
    description: "Full workout programs for women, strength & cardio.",
    url: "https://www.youtube.com/@SydneyCummings"
  }
];

export default function WorkoutPage() {
  const { data: profile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });
  const { plan } = usePlan();
  const [active, setActive] = useState<Session | null>(null);
  // Setup details are folded away by default; remember the choice on this device
  const [showSetup, setShowSetup] = useState(() => {
    try {
      return localStorage.getItem("fc-show-training-setup") === "1";
    } catch {
      return false;
    }
  });
  const toggleSetup = () =>
    setShowSetup((v) => {
      try {
        localStorage.setItem("fc-show-training-setup", v ? "0" : "1");
      } catch {
        /* private mode */
      }
      return !v;
    });
  const circuits = (plan?.sessions ?? []).map((s, i) => ({
    session: s,
    id: i + 1,
    title: s.title,
    badgeColor: BADGE_COLORS[i % BADGE_COLORS.length],
    when: s.when,
    goal: s.focus,
    note: s.note,
    exercises: s.exercises,
  }));

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      <PageHeader title="Train" description="Today's session first, then your full week." />

      {plan && <TodaySession plan={plan} onStart={setActive} />}

      {profile && (
        <Card className="overflow-hidden border-primary/20 bg-primary/5" data-testid="training-setup">
          <button
            type="button"
            onClick={() => toggleSetup()}
            aria-expanded={showSetup}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left md:px-6"
            data-testid="button-toggle-setup"
          >
            <span className="min-w-0">
              <span className="block text-xs font-bold text-primary">Your training setup</span>
              <span className="block truncate text-sm font-semibold">
                {profile.fitnessGoal || "General fitness"} · {profile.workoutDaysPerWeek ?? 3} days · {profile.workoutLocation || "Flexible"}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
              {showSetup ? "Hide" : "Show"} <ChevronDown className={`h-4 w-4 transition-transform ${showSetup ? "rotate-180" : ""}`} />
            </span>
          </button>
          {showSetup && (
          <CardContent className="flex flex-col gap-4 border-t border-primary/10 p-5 pt-4 sm:flex-row sm:items-center sm:justify-between md:p-6 md:pt-4">
            <div>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {profile.workoutDaysPerWeek ?? 3} training days per week · {profile.workoutLocation || "Flexible location"} · {profile.trainingExperience || "Beginner"} level
                {profile.workoutLocation !== "Gym" && (
                  <>
                    {" · "}
                    {profile.equipment?.length
                      ? `Kit: ${EQUIPMENT.filter((e) => profile.equipment?.includes(e.id)).map((e) => e.label.toLowerCase()).join(", ")}`
                      : "No equipment needed"}
                  </>
                )}
                .
                {" "}Each session below matches a day in your weekly plan. Adjust around how you feel and recover.
              </p>
              {(profile.workoutTimePreference || profile.workoutDurationMinutes != null || profile.sleepHoursPerNight != null) && (
                <p className="mt-2 text-xs font-medium text-foreground/75">
                  {[
                    profile.workoutTimePreference ? `Workout time: ${profile.workoutTimePreference}` : null,
                    profile.workoutDurationMinutes != null ? `${profile.workoutDurationMinutes} min available` : null,
                    profile.sleepHoursPerNight != null ? `${profile.sleepHoursPerNight} h sleep/night` : null,
                  ].filter(Boolean).join(" · ")}
                </p>
              )}
              {profile.dailySchedule && (
                <p className="mt-1 text-xs text-muted-foreground">Typical day: {profile.dailySchedule}</p>
              )}
            </div>
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <Link href="/onboarding">Change setup</Link>
            </Button>
          </CardContent>
          )}
        </Card>
      )}

      <h2 className="font-display text-xl font-medium">This week's sessions</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {circuits.map((circuit) => (
          <Card key={circuit.id} className="shadow-sm flex flex-col overflow-hidden">
            <CardHeader className="pb-4 bg-muted/20 border-b border-border">
              <div className="flex justify-between items-start gap-4 mb-2">
                <Badge variant="outline" className={`font-bold ${circuit.badgeColor}`}>
                  Session {circuit.id}
                </Badge>
              </div>
              <CardTitle className="text-xl tracking-tight leading-tight">{circuit.title}</CardTitle>
              <div className="space-y-1 mt-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">When:</strong> {circuit.when}
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Goal:</strong> {circuit.goal}
                </p>
                {circuit.note && (
                  <p className="text-xs text-muted-foreground mt-2 border-l-2 border-primary/50 pl-2">
                    Note: {circuit.note}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col gap-4">
              <div className="space-y-3">
                {circuit.exercises.map((exercise, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="font-bold text-sm text-foreground/90">{exercise.name}</span>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 whitespace-nowrap">
                        {exercise.sets} × {exercise.reps}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold text-muted-foreground hover:text-primary shrink-0" asChild>
                        <a href={exercise.url} target="_blank" rel="noopener noreferrer">
                          Watch <ExternalLink className="ml-1.5 h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-auto h-11 w-full gap-2" onClick={() => setActive(circuit.session)} data-testid={`button-start-${circuit.session.id}`}>
                <Play className="h-4 w-4" /> Start session
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {active && <SessionLogger session={active} open={!!active} onOpenChange={(o) => !o && setActive(null)} />}

      <div className="bg-card border-l-4 border-l-primary rounded-r-lg p-4 shadow-sm flex items-start gap-3 my-8">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm font-medium leading-relaxed">
          <strong className="text-primary font-semibold mr-2 tracking-wide">Daily steps:</strong>
          {(plan?.targets.steps ?? 8000).toLocaleString()} steps every single day. Daily walking adds up to more calories burned than most single workouts.
        </p>
      </div>

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Youtube className="h-5 w-5 text-primary" />
            Learn from the best
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Recommended fitness channels for form and home workouts
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((channel, i) => (
            <Card key={i} className="shadow-sm border-border/60 hover:border-primary/50 transition-colors flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{channel.name}</CardTitle>
                <CardDescription className="text-xs mt-1">{channel.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-2 pb-4">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold" asChild>
                  <a href={channel.url} target="_blank" rel="noopener noreferrer">
                    Visit channel <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}