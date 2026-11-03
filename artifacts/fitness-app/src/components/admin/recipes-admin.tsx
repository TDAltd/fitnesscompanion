import { saveFile } from "@/lib/save-file";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, EyeOff, FileUp, ImagePlus, Link2, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { withBase } from "@/lib/base-path";
import { RECIPES } from "@/lib/recipes";
import { photoUrl, type CustomRecipe } from "@/lib/recipe-library";
import { cn } from "@/lib/utils";

type Draft = {
  name: string;
  category: string;
  cuisine: string;
  prepMins: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  steps: string[];
  photo?: string | null;
};

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Fruit"];
const CUISINES = ["Nigerian", "International", "Any"];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(`/api${path}`), { credentials: "same-origin", headers: { "content-type": "application/json" }, ...init });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

type AdminData = { custom: CustomRecipe[]; hiddenBuiltin: number[]; sheetUrl: string | null };

/** Admin: the recipe library. Add your own, hide any, import from a file, document or a dietitian's Google Sheet. */
export function RecipesAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-recipes"], queryFn: () => api<AdminData>("/admin/recipes") });
  const [tab, setTab] = useState<"mine" | "builtin" | "import">("mine");
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-recipes"] });
    void qc.invalidateQueries({ queryKey: ["recipes"] });
  };

  return (
    <Card data-testid="recipes-admin">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recipes</CardTitle>
        <CardDescription>
          {data ? `${data.custom.length} of your own · ${RECIPES.length - data.hiddenBuiltin.length} of ${RECIPES.length} built-in shown` : "Loading…"}
        </CardDescription>
        <div className="mt-2 flex gap-1 rounded-xl bg-muted p-1" role="tablist">
          {(
            [
              ["mine", "Your recipes"],
              ["builtin", "Built-in"],
              ["import", "Import"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn("h-9 flex-1 rounded-lg text-sm font-semibold", tab === id ? "bg-background shadow-sm" : "text-muted-foreground")}
              data-testid={`recipes-tab-${id}`}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : tab === "mine" ? (
          <MyRecipes recipes={data.custom} onChange={refresh} />
        ) : tab === "builtin" ? (
          <BuiltIn hidden={data.hiddenBuiltin} onChange={refresh} />
        ) : (
          <ImportRecipes sheetUrl={data.sheetUrl} onSaved={() => { refresh(); setTab("mine"); }} />
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- your recipes ---------------- */

function MyRecipes({ recipes, onChange }: { recipes: CustomRecipe[]; onChange: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<CustomRecipe | "new" | null>(null);
  const act = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: string; body?: unknown }) => api(path, { method, body: body ? JSON.stringify(body) : undefined }),
    onSuccess: onChange,
    onError: (e) => toast({ title: "Couldn't save", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      <Button className="h-11 gap-2" onClick={() => setEditing("new")} data-testid="button-add-recipe-admin">
        <Plus className="h-4 w-4" /> Add a recipe
      </Button>
      {recipes.length === 0 ? (
        <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">No recipes of your own yet. Add one, or bring many in at once from Import.</p>
      ) : (
        <ul className="divide-y rounded-xl border" data-testid="admin-recipe-list">
          {recipes.map((r) => (
            <li key={r.id} className={cn("flex items-center gap-3 px-3 py-2.5", r.hidden && "opacity-60")}>
              {r.hasPhoto ? (
                <img src={photoUrl(r)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-lg" aria-hidden>🍲</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.name}{r.hidden ? " (hidden)" : ""}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.category} · {r.calories} kcal · {r.protein} g protein · {r.source === "sheet" ? "from sheet" : r.source === "manual" ? "added by hand" : `from ${r.source}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={r.hidden ? `Show ${r.name}` : `Hide ${r.name}`} onClick={() => act.mutate({ path: `/admin/recipes/${r.id}`, method: "PUT", body: { hidden: !r.hidden } })}>
                {r.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${r.name}`}
                onClick={() => window.confirm(`Delete "${r.name}"? People can no longer find it.`) && act.mutate({ path: `/admin/recipes/${r.id}`, method: "DELETE" })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <RecipeForm
        recipe={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChange();
        }}
      />
    </div>
  );
}

/** Shrink a photo in the browser (longest side 900 px, JPEG) so it stays small in the database. */
async function resizePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That image couldn't be opened."));
      i.src = url;
    });
    const scale = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function RecipeForm({ recipe, onClose, onSaved }: { recipe: CustomRecipe | "new" | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const existing = recipe && recipe !== "new" ? recipe : null;
  const key = recipe === "new" ? "new" : existing?.id ?? "none";
  return (
    <Dialog open={recipe != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto" data-testid="recipe-form">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit recipe" : "Add a recipe"}</DialogTitle>
        </DialogHeader>
        {recipe != null && <RecipeFields key={key} existing={existing} onSaved={onSaved} onError={(m) => toast({ title: "Couldn't save", description: m, variant: "destructive" })} />}
      </DialogContent>
    </Dialog>
  );
}

function RecipeFields({ existing, onSaved, onError }: { existing: CustomRecipe | null; onSaved: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState({
    name: existing?.name ?? "",
    category: existing?.category ?? "Lunch",
    cuisine: existing?.cuisine ?? "Nigerian",
    prepMins: existing?.prepMins?.toString() ?? "",
    calories: existing?.calories?.toString() ?? "",
    protein: existing?.protein?.toString() ?? "",
    carbs: existing?.carbs?.toString() ?? "",
    fat: existing?.fat?.toString() ?? "",
    ingredients: existing?.ingredients.join("\n") ?? "",
    steps: existing?.steps.join("\n") ?? "",
  });
  // undefined = keep current photo, null = remove, string = new photo
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const shownPhoto = photo === undefined ? (existing?.hasPhoto ? photoUrl(existing) : null) : photo;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, ...(photo !== undefined ? { photo } : {}) };
      await api(existing ? `/admin/recipes/${existing.id}` : "/admin/recipes", { method: existing ? "PUT" : "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chips = (options: string[], value: string, onPick: (v: string) => void) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onPick(o)} aria-pressed={value === o} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", value === o ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="r-name">Name</Label>
        <Input id="r-name" value={f.name} onChange={set("name")} maxLength={80} className="h-11 text-base" data-testid="input-recipe-name" />
      </div>
      <div className="space-y-1.5">
        <Label>Meal</Label>
        {chips(CATEGORIES, f.category, (v) => setF((s) => ({ ...s, category: v })))}
      </div>
      <div className="space-y-1.5">
        <Label>Cuisine</Label>
        {chips(CUISINES, f.cuisine, (v) => setF((s) => ({ ...s, cuisine: v })))}
      </div>
      <div>
        <Label>Per serving</Label>
        <div className="mt-1.5 grid grid-cols-[repeat(5,minmax(0,1fr))] gap-2">
          {(
            [
              ["calories", "kcal"],
              ["protein", "Protein g"],
              ["carbs", "Carbs g"],
              ["fat", "Fat g"],
              ["prepMins", "Minutes"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="space-y-1">
              <span className="block text-[11px] font-semibold text-muted-foreground">{label}</span>
              <Input inputMode="numeric" value={f[k]} onChange={set(k)} className="h-10 px-2 text-center text-base" data-testid={`input-recipe-${k}`} />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="r-ing">Ingredients (one per line)</Label>
        <Textarea id="r-ing" rows={4} value={f.ingredients} onChange={set("ingredients")} className="text-base" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="r-steps">Method (one step per line)</Label>
        <Textarea id="r-steps" rows={4} value={f.steps} onChange={set("steps")} className="text-base" />
      </div>
      <div className="space-y-1.5">
        <Label>Photo (optional)</Label>
        <div className="flex items-center gap-3">
          {shownPhoto ? <img src={shownPhoto} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted"><ImagePlus className="h-5 w-5 text-muted-foreground" /></span>}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                setPhoto(await resizePhoto(file));
              } catch (err) {
                onError((err as Error).message);
              }
            }}
          />
          <Button type="button" variant="outline" className="h-10" onClick={() => fileRef.current?.click()}>{shownPhoto ? "Change" : "Add photo"}</Button>
          {shownPhoto && <Button type="button" variant="ghost" className="h-10" onClick={() => setPhoto(null)}>Remove</Button>}
        </div>
      </div>
      <Button className="h-12 w-full text-base" onClick={() => void save()} disabled={busy || f.name.trim().length < 2 || !f.calories} data-testid="button-save-recipe">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {existing ? "Save changes" : "Add recipe"}
      </Button>
    </div>
  );
}

/* ---------------- built-in ---------------- */

function BuiltIn({ hidden, onChange }: { hidden: number[]; onChange: () => void }) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [onlyHidden, setOnlyHidden] = useState(false);
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const list = RECIPES.filter((r) => (!onlyHidden || hiddenSet.has(r.id)) && (!q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase())));
  const toggle = useMutation({
    mutationFn: ({ id, hide }: { id: number; hide: boolean }) => api(`/admin/recipes-builtin/${id}`, { method: "PUT", body: JSON.stringify({ hidden: hide }) }),
    onSuccess: onChange,
    onError: (e) => toast({ title: "Couldn't change it", description: (e as Error).message, variant: "destructive" }),
  });
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search built-in recipes" className="h-10 pl-9" />
        </div>
        <Button variant={onlyHidden ? "default" : "outline"} className="h-10" onClick={() => setOnlyHidden((v) => !v)}>Hidden ({hidden.length})</Button>
      </div>
      <ul className="max-h-[420px] divide-y overflow-y-auto rounded-xl border">
        {list.map((r) => {
          const isHidden = hiddenSet.has(r.id);
          return (
            <li key={r.id} className={cn("flex items-center gap-3 px-3 py-2", isHidden && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.category} · {r.cuisine} · {r.calories} kcal</p>
              </div>
              <Button variant="ghost" className="h-9 gap-1.5 text-xs" onClick={() => toggle.mutate({ id: r.id, hide: !isHidden })} data-testid="button-toggle-builtin">
                {isHidden ? <><EyeOff className="h-4 w-4" /> Hidden</> : <><Eye className="h-4 w-4" /> Shown</>}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------- import ---------------- */

const TEMPLATE_HEADER = ["name", "category", "cuisine", "prep_mins", "calories", "protein", "carbs", "fat", "ingredients", "steps"];
const TEMPLATE_ROW = [
  "Efo riro with fish",
  "Lunch",
  "Nigerian",
  "40",
  "420",
  "32",
  "14",
  "26",
  "2 bunches spinach; 150g mackerel; 1 cooking spoon palm oil; 2 tomatoes; 1 red pepper; 1 onion; locust beans",
  "Blend peppers and onion; Fry in palm oil 10 min; Add fish and locust beans; Stir in spinach for 3 min",
];

function downloadTemplate() {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [TEMPLATE_HEADER, TEMPLATE_ROW].map((r) => r.map(esc).join(",")).join("\n");
  void saveFile(new File([csv], "fitness-companion-recipes-template.csv", { type: "text/csv" }));
}

type Preview = { recipes: Draft[]; problems: string[]; source: "file" | "document" | "sheet" };

function ImportRecipes({ sheetUrl, onSaved }: { sheetUrl: string | null; onSaved: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [url, setUrl] = useState(sheetUrl ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (label: string, fn: () => Promise<Preview>) => {
    setBusy(label);
    try {
      const p = await fn();
      if (!p.recipes.length && !p.problems.length) throw new Error("No recipes found.");
      setPreview(p);
    } catch (e) {
      toast({ title: "Couldn't read that", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const fromFile = (file: File) =>
    run("file", async () => {
      const name = file.name.toLowerCase();
      if (/\.(xlsx|xls|csv|ods)$/.test(name)) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        const r = await api<{ recipes: Draft[]; problems: string[] }>("/admin/recipes/preview", { method: "POST", body: JSON.stringify({ rows }) });
        return { ...r, source: "file" };
      }
      let text = "";
      if (name.endsWith(".docx")) {
        const mammoth = await import("mammoth");
        text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
      } else if (/\.(txt|md)$/.test(name)) {
        text = await file.text();
      } else {
        throw new Error("Use an Excel or CSV sheet, a Word document (.docx) or a text file.");
      }
      const r = await api<{ recipes: Draft[]; problems: string[] }>("/admin/recipes/extract", { method: "POST", body: JSON.stringify({ text }) });
      return { ...r, source: "document" };
    });

  const fromSheet = () =>
    run("sheet", async () => {
      const r = await api<{ recipes: Draft[]; problems: string[] }>("/admin/recipes/sheet", { method: "POST", body: JSON.stringify({ url }) });
      return { ...r, source: "sheet" };
    });

  const save = async () => {
    if (!preview) return;
    setBusy("save");
    try {
      const r = await api<{ added: number; updated: number }>("/admin/recipes/import", { method: "POST", body: JSON.stringify({ recipes: preview.recipes, source: preview.source }) });
      toast({ title: "Recipes saved", description: `${r.added} added, ${r.updated} updated. People see them in Eat → Recipe ideas.` });
      setPreview(null);
      onSaved();
    } catch (e) {
      toast({ title: "Couldn't save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (preview) {
    return (
      <div className="space-y-3" data-testid="import-preview">
        <p className="text-sm">
          <b>{preview.recipes.length}</b> recipe{preview.recipes.length === 1 ? "" : "s"} ready. Check them, remove any you don't want, then save.
          {preview.source === "document" && " Numbers from a document may be AI estimates: edit them after saving if needed."}
        </p>
        {preview.problems.length > 0 && (
          <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            <p className="mb-1 font-semibold">Skipped ({preview.problems.length})</p>
            <ul className="list-disc space-y-0.5 pl-4">{preview.problems.slice(0, 8).map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
        <ul className="max-h-[380px] divide-y overflow-y-auto rounded-xl border">
          {preview.recipes.map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.category} · {r.cuisine} · {r.calories} kcal · P {r.protein} · C {r.carbs} · F {r.fat} · {r.ingredients.length} ingredients
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove ${r.name}`} onClick={() => setPreview((p) => (p ? { ...p, recipes: p.recipes.filter((_, j) => j !== i) } : p))}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button className="h-11 flex-1" onClick={() => void save()} disabled={!preview.recipes.length || busy === "save"} data-testid="button-save-import">
            {busy === "save" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save {preview.recipes.length} recipe{preview.recipes.length === 1 ? "" : "s"}
          </Button>
          <Button variant="ghost" className="h-11" onClick={() => setPreview(null)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-sm">
      <section className="space-y-2">
        <p className="font-semibold">From a spreadsheet or document</p>
        <p className="text-muted-foreground">
          Excel or CSV with one recipe per row (use the template), or a Word/text document: the AI reads the recipes out of it. Recipes with the same
          name are updated, not duplicated.
        </p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.ods,.docx,.txt,.md" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void fromFile(f); }} data-testid="input-recipe-file" />
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 gap-2" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {busy === "file" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Upload a file
          </Button>
          <Button variant="outline" className="h-11 gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download template
          </Button>
        </div>
      </section>

      <section className="space-y-2 border-t pt-4">
        <p className="font-semibold">From your dietitian's Google Sheet</p>
        <p className="text-muted-foreground">
          Ask them to keep recipes in a Google Sheet with the template's columns and share it as <b>Anyone with the link → Viewer</b>. Paste the link
          once; tap <b>Sync</b> whenever they add or change recipes.
        </p>
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" className="h-11" data-testid="input-sheet-url" />
          <Button className="h-11 shrink-0 gap-2" onClick={() => void fromSheet()} disabled={!url.trim() || !!busy} data-testid="button-sync-sheet">
            {busy === "sheet" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} {sheetUrl ? "Sync" : "Connect"}
          </Button>
        </div>
      </section>
    </div>
  );
}
