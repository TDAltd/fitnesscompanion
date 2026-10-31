import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortionInput } from "@/components/eat/portion-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SLOTS, formatServings, useEditFood, useRemoveFood, type FoodEntry, type Slot } from "@/lib/food-log";
import { cn } from "@/lib/utils";

const PORTIONS = [0.5, 1, 1.5, 2];
const DESKTOP =
  " md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:pb-0 md:max-h-[85vh] md:data-[state=open]:slide-in-from-bottom-4 md:data-[state=closed]:slide-out-to-bottom-4 md:data-[state=open]:zoom-in-95";

type Numbers = { calories: string; protein: string; carbs: string; fat: string };

/** Tap a food in the diary to fix it: meal, portions, name, numbers, day, or delete. */
export function EditFoodSheet({ entry, onClose }: { entry: FoodEntry | null; onClose: () => void }) {
  const edit = useEditFood();
  const remove = useRemoveFood();
  const { toast } = useToast();
  const [slot, setSlot] = useState<Slot>("Lunch");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [servings, setServings] = useState(1);
  const [nums, setNums] = useState<Numbers>({ calories: "", protein: "", carbs: "", fat: "" });

  useEffect(() => {
    if (!entry) return;
    setSlot(entry.slot);
    setName(entry.name);
    setDate(entry.date);
    setServings(entry.servings || 1);
    setNums({ calories: String(entry.calories), protein: String(entry.protein), carbs: String(entry.carbs), fat: String(entry.fat) });
  }, [entry]);

  // Changing portions scales the numbers from the original per-portion values
  const changePortions = (n: number) => {
    if (!entry || !(n > 0)) return;
    const per = (v: number) => v / (entry.servings || 1);
    setServings(n);
    setNums({
      calories: String(Math.round(per(entry.calories) * n)),
      protein: String(Math.round(per(entry.protein) * n)),
      carbs: String(Math.round(per(entry.carbs) * n)),
      fat: String(Math.round(per(entry.fat) * n)),
    });
  };

  const save = async () => {
    if (!entry) return;
    try {
      await edit.mutateAsync({
        id: entry.id,
        slot,
        name: name.trim(),
        date,
        servings,
        calories: Number(nums.calories) || 0,
        protein: Number(nums.protein) || 0,
        carbs: Number(nums.carbs) || 0,
        fat: Number(nums.fat) || 0,
      });
      toast({ title: "Saved", description: date !== entry.date ? "Moved to another day." : undefined });
      onClose();
    } catch (err) {
      toast({ title: "Couldn't save", description: (err as Error).message, variant: "destructive" });
    }
  };

  const del = async () => {
    if (!entry) return;
    await remove.mutateAsync(entry.id);
    toast({ title: "Removed", description: entry.name });
    onClose();
  };

  const today = new Date().toLocaleDateString("en-CA");
  return (
    <Sheet open={Boolean(entry)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={"mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col gap-0 rounded-t-3xl p-0 pb-[env(safe-area-inset-bottom)]" + DESKTOP}
        data-testid="edit-food-sheet"
      >
        <SheetHeader className="border-b px-5 pb-4 pt-5 text-left">
          <SheetTitle className="font-display text-xl font-medium">Edit food</SheetTitle>
          <SheetDescription className="sr-only">Change the meal, portions, name, numbers or day of this food.</SheetDescription>
          <div className="flex gap-1.5 pt-2" role="radiogroup" aria-label="Meal">
            {SLOTS.map((s) => (
              <button
                key={s.slot}
                type="button"
                role="radio"
                aria-checked={slot === s.slot}
                onClick={() => setSlot(s.slot)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  slot === s.slot ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
                data-testid={`edit-slot-${s.slot}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="h-11 text-base" />
          </div>

          <div>
            <Label className="mb-2 block">Portions</Label>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Portions">
              {PORTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={servings === p}
                  onClick={() => changePortions(p)}
                  className={cn("h-11 rounded-xl border text-base font-semibold transition-colors", servings === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                  data-testid={`edit-portion-${p}`}
                >
                  {formatServings(p)}
                </button>
              ))}
            </div>
            <PortionInput value={servings} onChange={changePortions} />
          </div>

          <div>
            <Label className="mb-2 block">Numbers for this entry</Label>
            <div className="grid grid-cols-4 gap-2">
              {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
                <label key={k} className="space-y-1 text-center">
                  <span className="block text-xs text-muted-foreground">{k === "calories" ? "kcal" : `${k[0].toUpperCase()}${k.slice(1)} g`}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={nums[k]}
                    onChange={(e) => setNums((n) => ({ ...n, [k]: e.target.value }))}
                    className="h-11 text-center text-base tabular-nums"
                    data-testid={`edit-${k}`}
                  />
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Changing portions updates these. You can also type exact numbers from a pack.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-date">Day</Label>
            <Input id="edit-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-48" />
          </div>
        </div>

        <div className="flex gap-2 border-t px-5 py-4">
          <Button variant="outline" className="h-12 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => void del()} disabled={remove.isPending} data-testid="button-edit-delete">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button className="h-12 flex-1 text-base" onClick={() => void save()} disabled={edit.isPending || !name.trim() || !date} data-testid="button-edit-save">
            {edit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
