import { useState, useMemo, useRef } from "react";
import { Link } from "wouter";
import { UtensilsCrossed, Clock, Flame, Plus, Check, Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, PenLine, Sparkles, Loader2, Camera, Image as ImageIcon, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import { 
  useGetMealPlan, 
  getGetMealPlanQueryKey, 
  useAddMealPlan, 
  useRemoveMealPlan,
  useNutritionLookup,
  useGetProfile,
  getGetProfileQueryKey,
} from "@workspace/api-client-react";

const meals = [
  {
    id: 1,
    name: "Grilled Chicken & Vegetable Stir-Fry",
    category: "Dinner",
    prepMins: 20,
    calories: 380,
    protein: 42,
    carbs: 12,
    fat: 14,
    ingredients: [
      "200g chicken breast",
      "1 tbsp olive oil",
      "1 cup mixed veg (broccoli, peppers, onion)",
      "2 cloves garlic",
      "1 tsp ginger",
      "Soy sauce",
      "Black pepper"
    ],
    steps: [
      "Season chicken with garlic, ginger, pepper.",
      "Grill or pan-fry 6–7 mins each side.",
      "Stir-fry veg in same pan 4 mins.",
      "Combine and serve."
    ]
  },
  {
    id: 2,
    name: "Oat Porridge with Egg Whites",
    category: "Breakfast",
    prepMins: 10,
    calories: 310,
    protein: 28,
    carbs: 38,
    fat: 6,
    ingredients: [
      "60g rolled oats",
      "3 egg whites",
      "300ml water or unsweetened almond milk",
      "Pinch of cinnamon",
      "1 tsp honey (optional)"
    ],
    steps: [
      "Cook oats in water/milk on medium heat 5 mins.",
      "Scramble egg whites separately.",
      "Stir into oats.",
      "Add cinnamon and optional honey."
    ]
  },
  {
    id: 3,
    name: "Okra Soup (Protein-Heavy Version)",
    category: "Lunch",
    prepMins: 35,
    calories: 420,
    protein: 38,
    carbs: 22,
    fat: 16,
    ingredients: [
      "250g okra (chopped)",
      "200g beef or chicken",
      "1 tbsp palm oil (small)",
      "1 stock cube",
      "Crayfish, pepper, onion",
      "Uziza or ugu leaves"
    ],
    steps: [
      "Cook meat until tender.",
      "Add palm oil, crayfish, stock cube, pepper.",
      "Add okra, stir well.",
      "Add greens and simmer 5 mins.",
      "Serve with half portion of swallow."
    ]
  },
  {
    id: 4,
    name: "Boiled Eggs & Garden Salad",
    category: "Snack",
    prepMins: 12,
    calories: 220,
    protein: 18,
    carbs: 8,
    fat: 12,
    ingredients: [
      "3 eggs",
      "Cucumber, tomatoes, lettuce",
      "1 tbsp olive oil",
      "Lemon juice",
      "Salt, pepper"
    ],
    steps: [
      "Boil eggs 8 mins, cool and peel.",
      "Slice cucumber and tomatoes.",
      "Toss salad with oil and lemon.",
      "Serve eggs alongside."
    ]
  },
  {
    id: 5,
    name: "Baked Tilapia with Jollof Cauliflower Rice",
    category: "Dinner",
    prepMins: 30,
    calories: 390,
    protein: 44,
    carbs: 18,
    fat: 11,
    ingredients: [
      "250g tilapia fillet",
      "1 head cauliflower (riced)",
      "Tomato paste, onion, scotch bonnet",
      "1 tsp vegetable oil",
      "Thyme, seasoning"
    ],
    steps: [
      "Season fish with pepper and thyme, bake at 190°C 20 mins.",
      "Pulse cauliflower in blender.",
      "Sauté with tomato paste and onion 10 mins.",
      "Serve fish over cauliflower rice."
    ]
  },
  {
    id: 6,
    name: "Egusi Soup (Lean Version)",
    category: "Lunch",
    prepMins: 40,
    calories: 460,
    protein: 35,
    carbs: 14,
    fat: 24,
    ingredients: [
      "100g egusi (ground)",
      "200g lean beef",
      "Handful of spinach/ugu",
      "1 tbsp palm oil",
      "Onion, crayfish, stock cube, pepper"
    ],
    steps: [
      "Fry egusi in palm oil 3 mins.",
      "Add cooked beef, crayfish, stock, pepper.",
      "Add 200ml water, simmer 15 mins.",
      "Add greens last 3 mins.",
      "Serve with small swallow."
    ]
  },
  {
    id: 7,
    name: "Moi Moi (High Protein)",
    category: "Breakfast",
    prepMins: 45,
    calories: 280,
    protein: 22,
    carbs: 24,
    fat: 8,
    ingredients: [
      "200g black-eyed peas (soaked)",
      "1 egg",
      "50g sardines or fish",
      "Onion, red pepper, scotch bonnet",
      "Vegetable oil, stock cube"
    ],
    steps: [
      "Blend soaked beans smooth.",
      "Mix in egg, fish, onion, pepper, stock.",
      "Pour into moulds or foil wrap.",
      "Steam 40 mins until firm."
    ]
  },
  {
    id: 8,
    name: "Greek Yogurt with Groundnuts",
    category: "Snack",
    prepMins: 2,
    calories: 210,
    protein: 20,
    carbs: 12,
    fat: 9,
    ingredients: [
      "150g plain Greek yogurt (no sugar)",
      "30g roasted groundnuts (unsalted)",
      "Optional: pinch of cinnamon"
    ],
    steps: [
      "Spoon yogurt into bowl.",
      "Top with groundnuts.",
      "Add cinnamon if desired.",
      "Eat immediately."
    ]
  },
  {
    id: 9,
    name: "Pepper Soup (Chicken)",
    category: "Dinner",
    prepMins: 35,
    calories: 310,
    protein: 40,
    carbs: 6,
    fat: 10,
    ingredients: [
      "400g chicken pieces",
      "Pepper soup spice mix, uziza seeds",
      "Stock cube, onion, fresh pepper, scent leaf",
      "Water"
    ],
    steps: [
      "Wash and season chicken.",
      "Boil in water with onion and stock cube 20 mins.",
      "Add pepper soup spices and fresh pepper.",
      "Simmer 10 mins.",
      "Add scent leaf to finish."
    ]
  },
  {
    id: 10,
    name: "Bulgur Wheat & Grilled Fish",
    category: "Lunch",
    prepMins: 25,
    calories: 410,
    protein: 36,
    carbs: 42,
    fat: 10,
    ingredients: [
      "80g bulgur wheat (dry)",
      "200g mackerel or croaker",
      "Tomatoes, onion, 1 tsp vegetable oil",
      "Pepper, seasoning, parsley"
    ],
    steps: [
      "Cook bulgur in 200ml water 12 mins.",
      "Season fish and grill 8 mins each side.",
      "Sauté tomatoes, onion in oil.",
      "Mix into bulgur.",
      "Serve with grilled fish."
    ]
  },
  {
    id: 11,
    name: "Scrambled Eggs with Ugu & Tomatoes",
    category: "Breakfast",
    prepMins: 10,
    calories: 290,
    protein: 24,
    carbs: 8,
    fat: 18,
    ingredients: [
      "3 whole eggs",
      "1 handful fresh ugu (fluted pumpkin) leaves",
      "2 tomatoes (chopped)",
      "1 small onion",
      "1 tsp vegetable oil",
      "Salt, pepper, seasoning to taste"
    ],
    steps: [
      "Whisk eggs with a pinch of salt and pepper.",
      "Sauté onion and tomatoes in oil for 2 mins.",
      "Add ugu leaves, stir for 1 min until wilted.",
      "Pour in eggs and fold gently until just set.",
      "Serve immediately."
    ]
  },
  {
    id: 12,
    name: "Unripe Plantain Porridge with Fish",
    category: "Lunch",
    prepMins: 30,
    calories: 395,
    protein: 32,
    carbs: 48,
    fat: 9,
    ingredients: [
      "2 medium unripe plantains (diced)",
      "150g smoked or dried fish (deboned)",
      "1 tsp palm oil",
      "1 stock cube, crayfish",
      "Pepper, onion, scent leaf"
    ],
    steps: [
      "Peel and dice plantains into chunks.",
      "Boil in water with onion, stock cube, and pepper 15 mins.",
      "Add palm oil, crayfish, and fish.",
      "Simmer uncovered until liquid reduces and plantain softens.",
      "Stir in scent leaf and serve."
    ]
  },
  {
    id: 13,
    name: "Turkey & Vegetable Stew",
    category: "Dinner",
    prepMins: 40,
    calories: 360,
    protein: 45,
    carbs: 14,
    fat: 12,
    ingredients: [
      "300g turkey breast (cubed)",
      "2 tomatoes, 1 red bell pepper (blended)",
      "1 onion",
      "1 tsp vegetable oil",
      "Carrots, green beans",
      "Thyme, curry, stock cube"
    ],
    steps: [
      "Season turkey with thyme, curry, stock; boil 20 mins.",
      "Sauté onion in oil 2 mins.",
      "Add blended tomato mix, fry 10 mins until thick.",
      "Add turkey, carrots and green beans.",
      "Simmer 10 mins until vegetables are tender."
    ]
  },
  {
    id: 14,
    name: "Garden Egg & Groundnut Sauce",
    category: "Snack",
    prepMins: 15,
    calories: 195,
    protein: 9,
    carbs: 10,
    fat: 14,
    ingredients: [
      "4 garden eggs (African eggplant)",
      "30g groundnut paste or smooth peanut butter (no sugar)",
      "1 small onion (diced)",
      "Fresh pepper to taste",
      "Salt"
    ],
    steps: [
      "Boil garden eggs 8–10 mins until soft.",
      "Mix groundnut paste with a little warm water to a dipping consistency.",
      "Add diced onion, pepper, and salt to the sauce.",
      "Drain and halve the garden eggs.",
      "Serve with groundnut dipping sauce."
    ]
  },
  {
    id: 15,
    name: "Catfish Pepper Soup",
    category: "Dinner",
    prepMins: 30,
    calories: 285,
    protein: 38,
    carbs: 4,
    fat: 11,
    ingredients: [
      "400g catfish (point & kill, cleaned)",
      "Pepper soup spice mix",
      "Uziza leaves or scent leaf",
      "Stock cube, fresh pepper, onion",
      "Salt, water"
    ],
    steps: [
      "Clean and season catfish with salt.",
      "Boil water with onion, stock cube, and pepper soup spice.",
      "Add catfish and fresh pepper.",
      "Cook 15 mins on medium heat.",
      "Finish with uziza or scent leaf."
    ]
  },
  {
    id: 16,
    name: "Akara (Bean Cakes) with Pap",
    category: "Breakfast",
    prepMins: 25,
    calories: 320,
    protein: 18,
    carbs: 36,
    fat: 11,
    ingredients: [
      "150g black-eyed peas (soaked, peeled)",
      "1 egg white",
      "1 small onion, fresh pepper",
      "Salt, stock cube",
      "150ml unsweetened pap (ogi) — no sugar"
    ],
    steps: [
      "Blend peeled beans with onion and pepper until smooth.",
      "Mix in egg white, salt, and stock cube.",
      "Heat a thin film of oil in a pan.",
      "Drop spoonfuls and fry until golden, 3 mins per side.",
      "Serve with warm pap (no sugar added)."
    ]
  },
  {
    id: 17,
    name: "Ofada Rice & Ofada Stew (Lean)",
    category: "Lunch",
    prepMins: 45,
    calories: 450,
    protein: 34,
    carbs: 52,
    fat: 14,
    ingredients: [
      "80g ofada rice (unpolished)",
      "200g beef liver or lean beef",
      "Ayamase/ofada pepper blend (green peppers, tatashe)",
      "1 tsp palm oil",
      "Onion, crayfish, stock cube, locust beans (iru)"
    ],
    steps: [
      "Wash and parboil ofada rice twice to reduce odour, then cook fully.",
      "Cook beef until tender; slice.",
      "Blend green peppers and fry in palm oil with onion 15 mins.",
      "Add iru, crayfish, stock cube, and beef.",
      "Simmer 10 mins; serve over rice."
    ]
  },
  {
    id: 18,
    name: "Tuna & Avocado Salad",
    category: "Snack",
    prepMins: 8,
    calories: 240,
    protein: 22,
    carbs: 6,
    fat: 15,
    ingredients: [
      "1 tin tuna in water (drained, ~130g)",
      "Half avocado (sliced)",
      "Cherry tomatoes, cucumber",
      "Lemon juice",
      "Salt, black pepper"
    ],
    steps: [
      "Drain tuna and flake into a bowl.",
      "Slice avocado, cucumber, and halve tomatoes.",
      "Combine all ingredients.",
      "Dress with lemon juice, salt, and pepper.",
      "Serve immediately."
    ]
  },
  {
    id: 19,
    name: "Bitterleaf Soup with Oat Swallow",
    category: "Lunch",
    prepMins: 45,
    calories: 440,
    protein: 36,
    carbs: 30,
    fat: 18,
    ingredients: [
      "Handful of bitterleaf (washed well)",
      "200g goat meat or beef",
      "Cocoyam paste (thickener, small amount)",
      "1 tsp palm oil, crayfish, stock cube",
      "60g oat flour (for swallow)"
    ],
    steps: [
      "Cook meat until tender with stock cube and pepper.",
      "Add palm oil, crayfish, and cocoyam paste; stir to thicken.",
      "Add washed bitterleaf, simmer 5 mins.",
      "For swallow: boil 150ml water, whisk in oat flour, stir vigorously until smooth and firm.",
      "Serve soup with small oat swallow."
    ]
  },
  {
    id: 20,
    name: "Overnight Chia & Ginger Oats",
    category: "Breakfast",
    prepMins: 5,
    calories: 295,
    protein: 14,
    carbs: 38,
    fat: 9,
    ingredients: [
      "50g rolled oats",
      "1 tbsp chia seeds",
      "250ml unsweetened almond milk",
      "1 tsp fresh ginger (grated)",
      "Pinch of cinnamon",
      "Optional: 5 sliced strawberries or half banana"
    ],
    steps: [
      "Mix oats, chia seeds, almond milk, ginger, and cinnamon in a jar.",
      "Stir well to combine.",
      "Seal and refrigerate overnight (minimum 6 hrs).",
      "In the morning, stir again and add optional fruit.",
      "Eat cold or warm in microwave 1 min."
    ]
  },
  {
    id: 21,
    name: "Pawpaw (Papaya) Slices",
    category: "Fruit",
    prepMins: 3,
    calories: 60,
    protein: 1,
    carbs: 15,
    fat: 0,
    ingredients: ["200g ripe pawpaw"],
    steps: ["Peel, deseed, and slice. Eat fresh."]
  },
  {
    id: 22,
    name: "Watermelon Wedge",
    category: "Fruit",
    prepMins: 2,
    calories: 50,
    protein: 1,
    carbs: 12,
    fat: 0,
    ingredients: ["300g watermelon (flesh only)"],
    steps: ["Cut into wedges and serve cold. Great post-workout."]
  },
  {
    id: 23,
    name: "Banana",
    category: "Fruit",
    prepMins: 1,
    calories: 90,
    protein: 1,
    carbs: 23,
    fat: 0,
    ingredients: ["1 medium banana (~120g)"],
    steps: ["Eat as a pre-workout snack or with oats at breakfast."]
  },
  {
    id: 24,
    name: "Orange",
    category: "Fruit",
    prepMins: 2,
    calories: 62,
    protein: 1,
    carbs: 15,
    fat: 0,
    ingredients: ["1 large orange (~180g)"],
    steps: ["Peel and segment. Rich in vitamin C — great immune support."]
  },
  {
    id: 25,
    name: "Mango Slices",
    category: "Fruit",
    prepMins: 5,
    calories: 100,
    protein: 1,
    carbs: 25,
    fat: 0,
    ingredients: ["150g ripe mango"],
    steps: ["Peel and slice. Eat as a snack or with Greek yogurt."]
  },
  {
    id: 26,
    name: "Pineapple Chunks",
    category: "Fruit",
    prepMins: 5,
    calories: 55,
    protein: 1,
    carbs: 14,
    fat: 0,
    ingredients: ["150g fresh pineapple"],
    steps: ["Core, peel, and cube. Contains bromelain — aids digestion."]
  }
];

const MEAT_TERMS = /\b(beef|chicken|turkey|pork|lamb|goat|mutton|duck|bacon|ham|sausage)\b/i;
const SEAFOOD_TERMS = /\b(fish|tilapia|salmon|tuna|sardine|crayfish|shrimp|prawn|crab|lobster|seafood)\b/i;
const OTHER_ANIMAL_PRODUCTS = /\b(egg(?:s| whites?)?|milk|butter|ghee|yogurt|cheese|cream|whey|honey|paneer)\b/i;

function matchesDietaryPreference(meal: (typeof meals)[number], preference?: string | null) {
  if (!preference || preference === "No preference") return true;
  if (preference === "High-protein") return meal.protein >= 25;

  const ingredients = meal.ingredients.join(" ");
  if (preference === "Vegan") {
    return !MEAT_TERMS.test(ingredients) &&
      !SEAFOOD_TERMS.test(ingredients) &&
      !OTHER_ANIMAL_PRODUCTS.test(ingredients);
  }
  if (preference === "Vegetarian") {
    return !MEAT_TERMS.test(ingredients) && !SEAFOOD_TERMS.test(ingredients);
  }
  if (preference === "Pescatarian") return !MEAT_TERMS.test(ingredients);
  return true;
}

const EMPTY_CUSTOM = { mealName: "", category: "Snack", calories: "", protein: "", carbs: "", fat: "" };
const MAX_MEAL_PHOTO_DATA_URL_LENGTH = 2_800_000;
const MAX_MEAL_PHOTO_FILE_BYTES = 20 * 1024 * 1024;

async function compressMealPhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > MAX_MEAL_PHOTO_FILE_BYTES) {
    throw new Error("Choose a photo smaller than 20 MB.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const maxEdge = 1200;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This photo could not be prepared. Try another image.");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    const imageData = canvas.toDataURL("image/jpeg", 0.78);
    if (imageData.length > MAX_MEAL_PHOTO_DATA_URL_LENGTH) {
      throw new Error("This photo is still too large. Try a smaller image.");
    }
    return imageData;
  } finally {
    bitmap.close();
  }
}

export default function MealsPage() {
  const [activeTab, setActiveTab] = useState("plan");
  const [filter, setFilter] = useState("All");
  const [date, setDate] = useState(new Date());
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState(EMPTY_CUSTOM);
  const [mealPhoto, setMealPhoto] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mealPhotoInput = useRef<HTMLInputElement>(null);

  const selectedDate = format(date, "yyyy-MM-dd");

  const { data: mealPlan, isLoading: isLoadingPlan } = useGetMealPlan(
    { date: selectedDate },
    { query: { queryKey: getGetMealPlanQueryKey({ date: selectedDate }) } }
  );

  const addMealPlan = useAddMealPlan();
  const removeMealPlan = useRemoveMealPlan();
  const nutritionLookup = useNutritionLookup();
  const { data: profile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });

  const handleMealPhoto = async (file?: File) => {
    if (!file) return;
    try {
      const imageData = await compressMealPhoto(file);
      setMealPhoto(imageData);
      setPhotoFileName(file.name);
    } catch (error) {
      toast({
        title: "Photo couldn’t be prepared",
        description: error instanceof Error ? error.message : "Try choosing another photo.",
        variant: "destructive",
      });
    }
  };

  const clearCustomMeal = () => {
    setCustom(EMPTY_CUSTOM);
    setMealPhoto(null);
    setPhotoFileName("");
    if (mealPhotoInput.current) mealPhotoInput.current.value = "";
  };

  const estimateCustomMeal = () => {
    const mealName = custom.mealName.trim();
    if (!mealName && !mealPhoto) return;

    nutritionLookup.mutate(
      { data: { mealName: mealName || undefined, imageData: mealPhoto || undefined } },
      {
        onSuccess: (result) => {
          setCustom((current) => ({
            ...current,
            mealName: current.mealName.trim() ? current.mealName : result.mealName,
            calories: result.calories.toString(),
            protein: result.protein.toString(),
            carbs: result.carbs.toString(),
            fat: result.fat.toString(),
          }));
          toast({
            title: "Macros estimated by AI",
            description: result.notes || "Review the estimate and adjust it before saving.",
          });
        },
        onError: () => {
          toast({
            title: "AI lookup failed",
            description: "Try another description or photo, or fill in the macros manually.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleAddMeal = (meal: typeof meals[0]) => {
    addMealPlan.mutate(
      {
        data: {
          date: selectedDate,
          mealName: meal.name,
          category: meal.category,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
        }
      },
      {
        onSuccess: () => {
          toast({ title: `Added ${meal.name} to today's plan` });
          queryClient.invalidateQueries({ queryKey: getGetMealPlanQueryKey({ date: selectedDate }) });
        }
      }
    );
  };

  const handleAddCustomMeal = () => {
    const cal = parseInt(custom.calories as string);
    const prot = parseInt(custom.protein as string);
    const carb = parseInt(custom.carbs as string);
    const fat = parseInt(custom.fat as string);
    if (!custom.mealName.trim() || isNaN(cal) || isNaN(prot) || isNaN(carb) || isNaN(fat)) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    addMealPlan.mutate(
      { data: { date: selectedDate, mealName: custom.mealName.trim(), category: custom.category, calories: cal, protein: prot, carbs: carb, fat } },
      {
        onSuccess: () => {
          toast({ title: `Added "${custom.mealName}" to your plan` });
          queryClient.invalidateQueries({ queryKey: getGetMealPlanQueryKey({ date: selectedDate }) });
          clearCustomMeal();
          setCustomOpen(false);
        }
      }
    );
  };

  const handleRemoveMeal = (id: number) => {
    removeMealPlan.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMealPlanQueryKey({ date: selectedDate }) });
        }
      }
    );
  };

  const totals = useMemo(() => {
    if (!mealPlan) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return mealPlan.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [mealPlan]);

  const targetCalories = 1700;
  const targetProtein = 130;

  const caloriesPercent = Math.min((totals.calories / targetCalories) * 100, 100);
  const proteinPercent = Math.min((totals.protein / targetProtein) * 100, 100);

  const isCaloriesOver = totals.calories > targetCalories;
  const isProteinMet = totals.protein >= targetProtein;

  const categoryFilteredMeals = filter === "All" ? meals : meals.filter(m => m.category === filter);
  const filteredMeals = categoryFilteredMeals.filter((meal) =>
    matchesDietaryPreference(meal, profile?.dietaryPreference)
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
          HEALTHY MEALS
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono">
          Fuel your progress. 1600-1750 kcal daily target.
        </p>
      </header>

      {profile && (profile.mealSchedule || profile.waterIntakeLiters != null || profile.sleepHoursPerNight != null) && (
        <Card className="border-primary/15 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Your daily rhythm</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.mealSchedule && <Badge variant="secondary">Meals: {profile.mealSchedule}</Badge>}
                {profile.waterIntakeLiters != null && (
                  <Badge variant="secondary">Water: {profile.waterIntakeLiters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L/day</Badge>
                )}
                {profile.sleepHoursPerNight != null && (
                  <Badge variant="secondary">Sleep: {profile.sleepHoursPerNight.toLocaleString(undefined, { maximumFractionDigits: 1 })} h/night</Badge>
                )}
              </div>
            </div>
            <Button variant="link" size="sm" className="h-auto shrink-0 p-0" asChild>
              <Link href="/onboarding">Update routine</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 bg-muted/50 p-1">
          <TabsTrigger value="plan" className="font-bold uppercase tracking-wider text-xs">Meal Plan</TabsTrigger>
          <TabsTrigger value="recipes" className="font-bold uppercase tracking-wider text-xs">Recipes</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => setDate(subDays(date, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 font-mono font-bold text-lg">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {format(date, "EEEE, d MMM")}
            </div>
            <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Card className="bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Daily Targets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold font-mono">
                  <span>Calories</span>
                  <span className={isCaloriesOver ? "text-red-500" : ""}>{totals.calories} / {targetCalories} kcal</span>
                </div>
                <Progress 
                  value={caloriesPercent} 
                  className={`h-2 ${isCaloriesOver ? "[&>div]:bg-red-500" : ""}`}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold font-mono">
                  <span>Protein</span>
                  <span className={isProteinMet ? "text-green-500" : ""}>{totals.protein} / {targetProtein} g</span>
                </div>
                <Progress 
                  value={proteinPercent} 
                  className={`h-2 ${isProteinMet ? "[&>div]:bg-green-500" : ""}`}
                />
              </div>
              <div className="flex gap-4 pt-2">
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Carbs</span>
                  <p className="font-mono font-bold">{totals.carbs}g</p>
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Fat</span>
                  <p className="font-mono font-bold">{totals.fat}g</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tight">Today's Meals</h3>
              <Button variant="outline" size="sm" onClick={() => setCustomOpen(true)} className="gap-2 font-bold text-xs uppercase tracking-wider">
                <PenLine className="h-3.5 w-3.5" /> Log Custom Meal
              </Button>
            </div>
            
            {isLoadingPlan ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : mealPlan && mealPlan.length > 0 ? (
              <div className="grid gap-3">
                {mealPlan.map((entry) => (
                  <Card key={entry.id} className="bg-card">
                    <CardContent className="p-4 flex justify-between items-center gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary">{entry.category}</Badge>
                          <p className="font-bold leading-tight line-clamp-1">{entry.mealName}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] py-0 h-5 bg-background">
                            <Flame className="w-3 h-3 mr-1 text-orange-500" /> {entry.calories}
                          </Badge>
                          <Badge variant="outline" className="font-mono text-[10px] py-0 h-5 bg-background">
                            <span className="text-blue-500 font-black mr-1">P</span> {entry.protein}g
                          </Badge>
                          <Badge variant="outline" className="font-mono text-[10px] py-0 h-5 bg-background">
                            <span className="text-green-500 font-black mr-1">C</span> {entry.carbs}g
                          </Badge>
                          <Badge variant="outline" className="font-mono text-[10px] py-0 h-5 bg-background">
                            <span className="text-yellow-500 font-black mr-1">F</span> {entry.fat}g
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => handleRemoveMeal(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-8 text-center space-y-3">
                  <UtensilsCrossed className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="font-bold text-muted-foreground">No meals planned yet.</p>
                  <Button variant="outline" onClick={() => setActiveTab("recipes")} className="mt-2">
                    Go to Recipes
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recipes" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Tabs defaultValue="All" onValueChange={setFilter} className="w-full">
            <TabsList className="mb-4 flex flex-wrap h-auto p-1 bg-muted/50 w-full justify-start overflow-x-auto">
              {["All", "Breakfast", "Lunch", "Dinner", "Snack", "Fruit"].map((f) => (
                <TabsTrigger key={f} value={f} className="font-bold text-xs uppercase tracking-wider">
                  {f}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-primary/15 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {profile?.dietaryPreference && profile.dietaryPreference !== "No preference"
                  ? <>Showing recipes for <strong className="text-foreground">{profile.dietaryPreference}</strong>. Check each ingredient list to confirm it fits your needs.</>
                  : "No dietary filter is active. Set a preference to tailor these recipe suggestions."}
              </p>
              <Button variant="link" size="sm" className="h-auto shrink-0 p-0" asChild>
                <Link href="/onboarding">Edit preferences</Link>
              </Button>
            </div>

            {filteredMeals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredMeals.map((meal) => {
                const isAdded = mealPlan?.some(entry => entry.mealName === meal.name);

                return (
                  <Card key={meal.id} className="bg-card shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3 border-b border-border/50">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex gap-2 items-center">
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{meal.category}</Badge>
                            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {meal.prepMins}m
                            </span>
                          </div>
                          <CardTitle className="text-lg leading-tight font-bold">{meal.name}</CardTitle>
                        </div>
                        <Button 
                          size="sm" 
                          variant={isAdded ? "default" : "outline"}
                          className={isAdded ? "bg-green-500 hover:bg-green-600 text-white shrink-0" : "shrink-0"}
                          onClick={() => !isAdded && handleAddMeal(meal)}
                          disabled={isAdded || addMealPlan.isPending}
                        >
                          {isAdded ? (
                            <><Check className="w-4 h-4 mr-1" /> Added</>
                          ) : (
                            <><Plus className="w-4 h-4 mr-1" /> Add to Plan</>
                          )}
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Badge variant="outline" className="font-mono bg-background">
                          <Flame className="w-3 h-3 mr-1 text-orange-500" /> {meal.calories} kcal
                        </Badge>
                        <Badge variant="outline" className="font-mono bg-background">
                          <span className="text-blue-500 font-black mr-1">P</span> {meal.protein}g
                        </Badge>
                        <Badge variant="outline" className="font-mono bg-background">
                          <span className="text-green-500 font-black mr-1">C</span> {meal.carbs}g
                        </Badge>
                        <Badge variant="outline" className="font-mono bg-background">
                          <span className="text-yellow-500 font-black mr-1">F</span> {meal.fat}g
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value={`meal-${meal.id}`} className="border-none px-6">
                          <AccordionTrigger className="text-sm font-bold hover:no-underline py-4">
                            View Recipe & Instructions
                          </AccordionTrigger>
                          <AccordionContent className="pb-4 space-y-4">
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ingredients</h4>
                              <ul className="text-sm space-y-1 font-medium pl-4 list-disc marker:text-primary">
                                {meal.ingredients.map((ing, i) => (
                                  <li key={i}>{ing}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instructions</h4>
                              <ol className="text-sm space-y-2 font-medium pl-4 list-decimal marker:text-primary marker:font-black">
                                {meal.steps.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <UtensilsCrossed className="h-8 w-8 text-muted-foreground/50" />
                  <div>
                    <p className="font-bold">No matching recipes in this category</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try another category or adjust your saved food preference.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/onboarding">Update food preference</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* CUSTOM MEAL DIALOG */}
      <Dialog
        open={customOpen}
        onOpenChange={(open) => {
          setCustomOpen(open);
          if (!open) clearCustomMeal();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">Log Custom Meal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-name" className="text-xs font-bold uppercase tracking-wider">Meal or portion description</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-name"
                  placeholder="e.g. One plate of Eba and Egusi with fish"
                  value={custom.mealName}
                  onChange={e => setCustom(p => ({ ...p, mealName: e.target.value }))}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Include ingredients and portion size for a more useful estimate.</p>
            </div>
            <div className="space-y-2">
              <input
                ref={mealPhotoInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                aria-label="Take or choose a meal photo"
                onChange={(event) => {
                  void handleMealPhoto(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-2"
                disabled={nutritionLookup.isPending}
                onClick={() => mealPhotoInput.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Take or choose a photo
              </Button>
              {mealPhoto && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5">
                  <img
                    src={mealPhoto}
                    alt="Preview of the selected meal"
                    className="h-16 w-16 shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                      Photo ready
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{photoFileName}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove meal photo"
                    onClick={() => {
                      setMealPhoto(null);
                      setPhotoFileName("");
                      if (mealPhotoInput.current) mealPhotoInput.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your photo is sent to OpenAI for this estimate and isn’t saved in your app.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-primary/40 font-bold text-primary hover:bg-primary/5"
                disabled={(!custom.mealName.trim() && !mealPhoto) || nutritionLookup.isPending}
                onClick={estimateCustomMeal}
              >
                {nutritionLookup.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {nutritionLookup.isPending ? "Estimating macros…" : "Estimate calories and macros"}
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Category</Label>
              <Select value={custom.category} onValueChange={v => setCustom(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Breakfast", "Lunch", "Dinner", "Snack", "Fruit"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="custom-cal" className="text-xs font-bold uppercase tracking-wider">Calories (kcal)</Label>
                <Input id="custom-cal" type="number" placeholder="0" value={custom.calories} onChange={e => setCustom(p => ({ ...p, calories: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom-prot" className="text-xs font-bold uppercase tracking-wider">Protein (g)</Label>
                <Input id="custom-prot" type="number" placeholder="0" value={custom.protein} onChange={e => setCustom(p => ({ ...p, protein: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom-carbs" className="text-xs font-bold uppercase tracking-wider">Carbs (g)</Label>
                <Input id="custom-carbs" type="number" placeholder="0" value={custom.carbs} onChange={e => setCustom(p => ({ ...p, carbs: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom-fat" className="text-xs font-bold uppercase tracking-wider">Fat (g)</Label>
                <Input id="custom-fat" type="number" placeholder="0" value={custom.fat} onChange={e => setCustom(p => ({ ...p, fat: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono">Describe your meal or add a photo to estimate its calories and macros. Review and edit the values before adding it to your plan.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { clearCustomMeal(); setCustomOpen(false); }}>Cancel</Button>
            <Button onClick={handleAddCustomMeal} disabled={addMealPlan.isPending}>
              {addMealPlan.isPending ? "Adding…" : "Add to Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}