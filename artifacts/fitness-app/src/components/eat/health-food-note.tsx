import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const NOTES: Record<string, { title: string; points: string[] }> = {
  pregnant: {
    title: "Eating well in pregnancy",
    points: [
      "Avoid liver, unpasteurised milk and cheese (including fura da nono and wara), raw or undercooked eggs and meat, and alcohol.",
      "Skip shark, swordfish, marlin and king mackerel. Titus, sardines and salmon are good; tuna up to 4 tins a week.",
      "Keep caffeine under 200 mg a day: about 2 mugs of tea or 1 mug of coffee. Cola and energy drinks count too.",
      "Your midwife may suggest folic acid and vitamin D. Ask before taking other supplements.",
    ],
  },
  breastfeeding: {
    title: "Eating well while breastfeeding",
    points: [
      "Your plan adds about 330 kcal a day for making milk. Eat to hunger and don't cut calories hard.",
      "Drink a glass of water each time you feed.",
      "Alcohol passes into breast milk; if you drink, wait at least 2 hours per drink before feeding.",
      "Keep caffeine moderate (under about 300 mg a day).",
    ],
  },
  diabetes: {
    title: "Eating with diabetes",
    points: [
      "Sugary drinks and sweets are left out of suggestions. You can still search for and log them.",
      "Pair carbs (rice, swallow, bread) with protein and vegetables, and keep portions steady across the day.",
      "If you take insulin or tablets that can cause low blood sugar, check with your doctor before cutting calories or training hard.",
    ],
  },
};

/** One short, foldable note for pregnancy, breastfeeding or diabetes (from the setup health answers). */
export function HealthFoodNote({ flags }: { flags: readonly string[] | null | undefined }) {
  const key = ["pregnant", "breastfeeding", "diabetes"].find((f) => flags?.includes(f));
  const [open, setOpen] = useState(false);
  if (!key) return null;
  const note = NOTES[key];
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5" data-testid="health-food-note">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <Info className="h-5 w-5 shrink-0 text-primary" />
        <span className="flex-1 text-sm font-semibold">{note.title}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="list-disc space-y-1.5 px-4 pb-4 pl-12 text-sm text-muted-foreground">
          {note.points.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
    </div>
  );
}
