import { ExternalLink, Info, Youtube } from "lucide-react";
import { Link } from "wouter";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CIRCUITS = [
  {
    id: 1,
    title: "Post-Class Arm Circuit",
    badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    when: "Monday & Wednesday, 10 mins after class",
    goal: "Target tricep and bicep definition",
    exercises: [
      { name: "Tricep Dips", sets: 3, reps: "15", url: "https://www.youtube.com/results?search_query=tricep+dips+proper+form+beginners" },
      { name: "Push-Ups (Close Grip)", sets: 3, reps: "12", url: "https://www.youtube.com/results?search_query=close+grip+push+ups+form" },
      { name: "Overhead Tricep Extension", sets: 3, reps: "12", url: "https://www.youtube.com/results?search_query=overhead+tricep+extension+dumbbell" },
      { name: "Bicep Curls", sets: 3, reps: "15", url: "https://www.youtube.com/results?search_query=bicep+curls+proper+form" }
    ]
  },
  {
    id: 2,
    title: "Arm Toning Protocol",
    badgeColor: "bg-green-500/10 text-green-500 border-green-500/20",
    when: "3 days per week (Mon, Wed, Fri), 15 mins",
    goal: "Eliminate arm jiggle, build shoulder width to make arms look slimmer",
    exercises: [
      { name: "Tricep Pushdowns / Dips", sets: 4, reps: "15", url: "https://www.youtube.com/results?search_query=tricep+pushdown+cable+form" },
      { name: "Close-Grip Push-Ups", sets: 3, reps: "12", url: "https://www.youtube.com/results?search_query=close+grip+push+ups+chest+triceps" },
      { name: "Hammer Curls", sets: 3, reps: "12", url: "https://www.youtube.com/results?search_query=hammer+curls+dumbbell+form" },
      { name: "Lateral Raises", sets: 3, reps: "15", url: "https://www.youtube.com/results?search_query=lateral+raises+shoulder+form" }
    ]
  },
  {
    id: 3,
    title: "Core & Belly Fat Protocol",
    badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    when: "After class, 3× per week",
    goal: "Belly fat reduction through core strength + posture",
    note: "Belly fat is almost entirely a nutrition + consistency problem — core work builds the foundation underneath",
    exercises: [
      { name: "Plank Hold", sets: 3, reps: "45s", url: "https://www.youtube.com/results?search_query=plank+proper+form+beginners" },
      { name: "Dead Bugs", sets: 3, reps: "10", url: "https://www.youtube.com/results?search_query=dead+bug+exercise+core+form" },
      { name: "Leg Raises", sets: 3, reps: "12", url: "https://www.youtube.com/results?search_query=lying+leg+raises+lower+abs+form" }
    ]
  },
  {
    id: 4,
    title: "Saturday Home Arm Workout",
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    when: "Saturday morning, 15 mins",
    goal: "Maintain arm training on non-class day",
    exercises: [
      { name: "Tricep Dips (chair)", sets: 3, reps: "15", url: "https://www.youtube.com/results?search_query=chair+tricep+dips+at+home" },
      { name: "Close-Grip Push-Ups", sets: 3, reps: "12", url: "https://www.youtube.com/results?search_query=close+grip+push+ups+form" },
      { name: "Hammer Curls", sets: 3, reps: "15", url: "https://www.youtube.com/results?search_query=hammer+curls+dumbbell+form" },
      { name: "Lateral Raises", sets: 3, reps: "15", url: "https://www.youtube.com/results?search_query=lateral+raises+shoulder+form" }
    ]
  }
];

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

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
          CIRCUITS
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono">
          Your post-class & home protocols
        </p>
      </header>

      {profile && (
        <Card className="overflow-hidden border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Your training setup</p>
              <h2 className="mt-1 text-lg font-black">{profile.fitnessGoal || "General fitness"}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {profile.workoutDaysPerWeek ?? 3} training days per week · {profile.workoutLocation || "Flexible location"} · {profile.trainingExperience || "Beginner"} level.
                {" "}Use these circuits as starting points and adjust around your schedule and recovery.
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
              <Link href="/onboarding">Edit preferences</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {CIRCUITS.map((circuit) => (
          <Card key={circuit.id} className="shadow-sm flex flex-col overflow-hidden">
            <CardHeader className="pb-4 bg-muted/20 border-b border-border">
              <div className="flex justify-between items-start gap-4 mb-2">
                <Badge variant="outline" className={`font-bold uppercase tracking-wider ${circuit.badgeColor}`}>
                  Circuit {circuit.id}
                </Badge>
              </div>
              <CardTitle className="text-xl uppercase tracking-tight leading-tight">{circuit.title}</CardTitle>
              <div className="space-y-1 mt-3">
                <p className="text-xs font-mono text-muted-foreground">
                  <strong className="text-foreground">When:</strong> {circuit.when}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  <strong className="text-foreground">Goal:</strong> {circuit.goal}
                </p>
                {circuit.note && (
                  <p className="text-xs font-mono text-muted-foreground mt-2 italic border-l-2 border-primary/50 pl-2">
                    Note: {circuit.note}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              <div className="space-y-3">
                {circuit.exercises.map((exercise, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="font-bold text-sm text-foreground/90">{exercise.name}</span>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 whitespace-nowrap">
                        {exercise.sets} × {exercise.reps}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs uppercase font-bold text-muted-foreground hover:text-primary shrink-0" asChild>
                        <a href={exercise.url} target="_blank" rel="noopener noreferrer">
                          Watch <ExternalLink className="ml-1.5 h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-card border-l-4 border-l-orange-500 rounded-r-lg p-4 shadow-sm flex items-start gap-3 my-8">
        <Info className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
        <p className="text-sm font-medium leading-relaxed">
          <strong className="uppercase text-orange-500 font-black mr-2 tracking-wide">Non-negotiable:</strong>
          10,000 steps every single day. This alone burns an extra 300–400 kcal without a single extra workout.
        </p>
      </div>

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Learn From The Best
          </h2>
          <p className="text-muted-foreground mt-1 text-xs font-mono">
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
                <Button variant="outline" size="sm" className="w-full text-xs font-bold uppercase tracking-wider" asChild>
                  <a href={channel.url} target="_blank" rel="noopener noreferrer">
                    Visit Channel <ExternalLink className="ml-2 h-3 w-3" />
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