import { Cake } from "lucide-react";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { isBirthday } from "@workspace/plan";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/lib/plan";
import { useSetTreat, useTreats } from "@/lib/food-log";

/** On the person's birthday: a celebration, and a one-tap treat day. */
export function BirthdayCard() {
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const { plan } = usePlan();
  const today = new Date().toLocaleDateString("en-CA");
  const { data: treats } = useTreats(today, today);
  const setTreat = useSetTreat();
  const { toast } = useToast();
  if (!isBirthday(profile?.dateOfBirth, today)) return null;

  const first = profile?.name?.trim().split(/\s+/)[0];
  const treatOn = Boolean(treats?.dates.includes(today));
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-dusk/25 via-sage/40 to-primary/15 p-5 sm:flex-row sm:items-center sm:justify-between" data-testid="birthday-card">
      <div className="flex gap-3">
        <Cake className="h-8 w-8 shrink-0 text-dusk" />
        <div>
          <p className="font-display text-xl font-medium">Happy birthday{first ? `, ${first}` : ""}!</p>
          <p className="text-sm text-muted-foreground">
            {profile?.ageYears ? `${profile.ageYears} today. ` : ""}Thank you for looking after yourself this year. Enjoy your day.
          </p>
        </div>
      </div>
      {plan && !plan.targets.habitFocus && !treatOn && (
        <Button
          variant="secondary"
          className="shrink-0"
          disabled={setTreat.isPending}
          onClick={() =>
            setTreat.mutate(
              { date: today, on: true },
              {
                onSuccess: () => toast({ title: "Birthday treat added", description: `+${treats?.extraKcal ?? 300} kcal today. Enjoy it.` }),
                onError: (e) => toast({ title: "Couldn't add a treat day", description: (e as Error).message, variant: "destructive" }),
              },
            )
          }
          data-testid="button-birthday-treat"
        >
          Make it a treat day
        </Button>
      )}
      {treatOn && <p className="text-sm font-semibold text-primary">Treat day is on 🎉</p>}
    </div>
  );
}
