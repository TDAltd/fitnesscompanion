import { useState, useMemo, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { User, Activity, Target, Dumbbell, Utensils, ShieldAlert, Calendar, BookOpen, Ruler, Trash2, Plus } from "lucide-react";
import {
  useGetProfile,
  getGetProfileQueryKey,
  useUpsertProfile,
  useListMeasurements,
  getListMeasurementsQueryKey,
  useAddMeasurement,
  useDeleteMeasurement,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { usePlan } from "@/lib/plan";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  ageYears: z.coerce.number().min(10, { message: "Age must be at least 10." }),
  sex: z.string().min(1, { message: "Please select an option." }),
  heightCm: z.coerce.number().min(100, { message: "Height must be at least 100cm." }),
  currentWeightKg: z.coerce.number().min(30, { message: "Weight must be at least 30kg." }),
  goalWeightKg: z.coerce.number().min(30, { message: "Goal must be at least 30kg." }),
  activityLevel: z.string().min(1, { message: "Please select an activity level." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const EMPTY_M = { date: format(new Date(), "yyyy-MM-dd"), neckCm: "", chestCm: "", waistCm: "", hipsCm: "", leftArmCm: "", rightArmCm: "", leftThighCm: "", rightThighCm: "", notes: "" };

const PLAN_ICONS: Record<string, React.ElementType> = {
  workout: Dumbbell,
  diet: Utensils,
  targets: Target,
  plateau: ShieldAlert,
  phases: Calendar,
};

export default function StatsPage() {
  const { toast } = useToast();
  const { plan: myPlan } = usePlan();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });

  const { data: measurements } = useListMeasurements({
    query: { queryKey: getListMeasurementsQueryKey() }
  });

  const addMeasurement = useAddMeasurement();
  const deleteMeasurement = useDeleteMeasurement();

  const [mForm, setMForm] = useState(EMPTY_M);
  const [showMForm, setShowMForm] = useState(false);

  const upsertProfile = useUpsertProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      ageYears: 25,
      sex: "Prefer not to say",
      heightCm: 170,
      currentWeightKg: 70,
      goalWeightKg: 65,
      activityLevel: "Moderately Active",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || "",
        ageYears: profile.ageYears || 25,
        sex: profile.sex || "Prefer not to say",
        heightCm: profile.heightCm || 170,
        currentWeightKg: profile.currentWeightKg || 70,
        goalWeightKg: profile.goalWeightKg || 65,
        activityLevel: profile.activityLevel || "Moderately Active",
      });
    }
  }, [profile, form]);

  const heightCm = form.watch("heightCm");
  const currentWeightKg = form.watch("currentWeightKg");
  const goalWeightKg = form.watch("goalWeightKg");

  const bmiData = useMemo(() => {
    if (!heightCm || !currentWeightKg || heightCm <= 0 || currentWeightKg <= 0) return null;
    const heightM = heightCm / 100;
    const bmi = currentWeightKg / (heightM * heightM);
    let category = "", colorClass = "", progressValue = 0;
    if (bmi < 18.5) { category = "Underweight"; colorClass = "text-dusk"; progressValue = (bmi / 18.5) * 25; }
    else if (bmi <= 24.9) { category = "Normal weight"; colorClass = "text-primary"; progressValue = 25 + ((bmi - 18.5) / (24.9 - 18.5)) * 25; }
    else if (bmi <= 29.9) { category = "Overweight"; colorClass = "text-primary"; progressValue = 50 + ((bmi - 25) / (29.9 - 25)) * 25; }
    else { category = "Obese"; colorClass = "text-destructive"; progressValue = Math.min(100, 75 + ((bmi - 30) / 10) * 25); }
    const idealMin = 18.5 * (heightM * heightM);
    const idealMax = 24.9 * (heightM * heightM);
    return { value: bmi.toFixed(1), category, colorClass, progressValue, idealMin: idealMin.toFixed(1), idealMax: idealMax.toFixed(1), diffToGoal: (currentWeightKg - goalWeightKg).toFixed(1) };
  }, [heightCm, currentWeightKg, goalWeightKg]);

  function onSubmit(data: ProfileFormValues) {
    upsertProfile.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        toast({ title: "Profile updated", description: "Your stats have been saved successfully." });
      },
    });
  }

  const handleAddMeasurement = () => {
    const toNum = (v: string) => v === "" ? undefined : parseFloat(v);
    addMeasurement.mutate(
      {
        data: {
          date: mForm.date,
          neckCm: toNum(mForm.neckCm),
          chestCm: toNum(mForm.chestCm),
          waistCm: toNum(mForm.waistCm),
          hipsCm: toNum(mForm.hipsCm),
          leftArmCm: toNum(mForm.leftArmCm),
          rightArmCm: toNum(mForm.rightArmCm),
          leftThighCm: toNum(mForm.leftThighCm),
          rightThighCm: toNum(mForm.rightThighCm),
          notes: mForm.notes || undefined,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMeasurementsQueryKey() });
          toast({ title: "Measurements saved" });
          setMForm(EMPTY_M);
          setShowMForm(false);
        }
      }
    );
  };

  const handleDeleteMeasurement = (id: number) => {
    if (!window.confirm("Delete this measurement entry?")) return;
    deleteMeasurement.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMeasurementsQueryKey() });
        toast({ title: "Entry deleted" });
      }
    });
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Body & measurements"
        description="Your body numbers, tape measurements and playbook."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/onboarding">Update my answers</Link>
          </Button>
        }
      />

      {/* PROFILE + BMI */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Profile Form
            </CardTitle>
            <CardDescription>Update your personal metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="Your name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="ageYears" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age (years)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sex" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sex</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="heightCm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currentWeightKg" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="goalWeightKg" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal (kg)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="activityLevel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Sedentary">Sedentary</SelectItem>
                        <SelectItem value="Lightly Active">Lightly Active</SelectItem>
                        <SelectItem value="Moderately Active">Moderately Active</SelectItem>
                        <SelectItem value="Very Active">Very Active</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={upsertProfile.isPending}>
                  {upsertProfile.isPending ? "Saving..." : "Save Stats"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* BMI */}
        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Body Mass Index
            </CardTitle>
            <CardDescription>Live calculation based on your form entries.</CardDescription>
          </CardHeader>
          <CardContent>
            {bmiData ? (
              <div className="space-y-8">
                <div className="text-center">
                  <p className="text-sm font-bold text-muted-foreground mb-2">Current BMI</p>
                  <span className="text-6xl font-semibold">{bmiData.value}</span>
                  <p className={`text-lg font-semibold mt-1 ${bmiData.colorClass}`}>{bmiData.category}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
                  </div>
                  <div className="relative h-4 rounded-full overflow-hidden flex bg-muted">
                    <div className="w-1/4 bg-dusk/50 h-full"></div>
                    <div className="w-1/4 bg-primary/50 h-full"></div>
                    <div className="w-1/4 bg-primary/50 h-full"></div>
                    <div className="w-1/4 bg-destructive/50 h-full"></div>
                    <div className="absolute top-0 bottom-0 w-1 bg-foreground -ml-[2px]" style={{ left: `${bmiData.progressValue}%` }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-bold">Ideal Weight Range</p>
                    <p className="text-lg font-semibold">{bmiData.idealMin}–{bmiData.idealMax}<span className="text-sm text-muted-foreground">kg</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-bold">Distance to Goal</p>
                    <p className="text-lg font-semibold">{Math.abs(parseFloat(bmiData.diffToGoal))} <span className="text-sm text-muted-foreground">kg {parseFloat(bmiData.diffToGoal) > 0 ? "to lose" : "to gain"}</span></p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Target className="h-12 w-12 opacity-20 mb-4" />
                <p className="font-bold">Enter height and weight</p>
                <p className="text-sm">to see your BMI calculation</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BODY MEASUREMENTS */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Ruler className="h-5 w-5 text-primary" /> Body Measurements
              </CardTitle>
              <CardDescription className="mt-1">Track cm changes over time — often more accurate than scale weight.</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-2 font-bold text-xs" onClick={() => setShowMForm(v => !v)}>
              <Plus className="h-3.5 w-3.5" /> {showMForm ? "Cancel" : "Log Measurements"}
            </Button>
          </div>
        </CardHeader>

        {showMForm && (
          <div className="p-6 border-b bg-muted/10 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-3 lg:col-span-4 space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Date</label>
                <Input type="date" value={mForm.date} onChange={e => setMForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              {[
                { key: "neckCm", label: "Neck (cm)" },
                { key: "chestCm", label: "Chest (cm)" },
                { key: "waistCm", label: "Waist (cm)" },
                { key: "hipsCm", label: "Hips (cm)" },
                { key: "leftArmCm", label: "Left Arm (cm)" },
                { key: "rightArmCm", label: "Right Arm (cm)" },
                { key: "leftThighCm", label: "Left Thigh (cm)" },
                { key: "rightThighCm", label: "Right Thigh (cm)" },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">{f.label}</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="—"
                    value={mForm[f.key as keyof typeof mForm]}
                    onChange={e => setMForm(p => ({ ...p, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Notes (optional)</label>
                <Input placeholder="e.g. morning, post-workout…" value={mForm.notes} onChange={e => setMForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <Button onClick={handleAddMeasurement} disabled={addMeasurement.isPending} className="w-full">
              {addMeasurement.isPending ? "Saving…" : "Save Measurements"}
            </Button>
          </div>
        )}

        <CardContent className="p-0">
          {measurements && measurements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left p-3 text-xs font-bold text-muted-foreground">Date</th>
                    {["Neck", "Chest", "Waist", "Hips", "L.Arm", "R.Arm", "L.Thigh", "R.Thigh"].map(h => (
                      <th key={h} className="text-center p-3 text-xs font-bold text-muted-foreground">{h}</th>
                    ))}
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((m, i) => (
                    <tr key={m.id} className={`border-b border-border/50 hover:bg-muted/10 group ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
                      <td className="p-3 font-bold text-xs whitespace-nowrap">{format(new Date(m.date + "T00:00:00"), "d MMM yy")}</td>
                      {[m.neckCm, m.chestCm, m.waistCm, m.hipsCm, m.leftArmCm, m.rightArmCm, m.leftThighCm, m.rightThighCm].map((v, j) => (
                        <td key={j} className="text-center p-3">
                          {v != null ? <span className="font-bold">{v}</span> : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      ))}
                      <td className="p-2">
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteMeasurement(m.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <Ruler className="h-10 w-10 mx-auto mb-4 opacity-20" />
              <p className="font-bold text-foreground">No measurements yet</p>
              <p className="text-sm mt-1">Log your first entry to start tracking centimetre changes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PLAYBOOK — NOTE TO SELF */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">The Playbook</h2>
            <p className="text-xs text-muted-foreground">Built from your answers. Read it, internalize it, execute it.</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" asChild>
            <Link href="/plan">Edit my plan</Link>
          </Button>
        </div>

        {/* Weekly Schedule */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="tracking-wide text-primary text-sm">Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(myPlan?.schedule ?? []).map(day => (
                <div key={day.day} className={`p-3 rounded-lg border ${day.rest ? "bg-card border-border" : "bg-background border-primary/20"}`}>
                  <p className={`text-xs font-bold ${day.rest ? "text-muted-foreground" : "text-primary"}`}>{day.label}</p>
                  <p className="font-bold text-sm mt-1 leading-snug">{day.workout}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plan cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(myPlan?.guidelines ?? []).map(plan => {
            const Icon = PLAN_ICONS[plan.id] ?? Target;
            return (
              <Card key={plan.id} className="shadow-sm flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg"><Icon className="h-4 w-4 text-primary" /></div>
                    <div>
                      <CardTitle className="tracking-tight text-base">{plan.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 bg-muted/20 pt-3 rounded-b-xl border-t border-border">
                  <ul className="space-y-2">
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
    </div>
  );
}
