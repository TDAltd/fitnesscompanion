// Recipe library: Nigerian recipes (original app) + international recipes.
// Macros are per serving and approximate.
import { INTERNATIONAL_MEALS, ORIGINAL_INTERNATIONAL } from "./international-meals";

const baseMeals = [
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

export type Cuisine = "Nigerian" | "International" | "Any";

export const RECIPES = [...baseMeals, ...INTERNATIONAL_MEALS].map((meal) => ({
  ...meal,
  cuisine: (meal.category === "Fruit"
    ? "Any"
    : meal.id > 100 || ORIGINAL_INTERNATIONAL.has(meal.name)
      ? "International"
      : "Nigerian") as Cuisine,
}));


export type Recipe = (typeof RECIPES)[number];

const MEAT_TERMS = /\b(beef|chicken|turkey|pork|lamb|goat|mutton|duck|bacon|ham|sausage|suya|ponmo|kpomo|shaki|tripe|assorted meat|offal|snail)\b/i;
// No leading \b on "fish" so catfish, stockfish, dryfish etc. are caught too
const SEAFOOD_TERMS = /(fish\b|\b(tilapia|salmon|tuna|sardines?|mackerel|croaker|titus|shrimps?|prawns?|crabs?|lobster|periwinkle|seafood|anchov(y|ies))\b)/i;
const OTHER_ANIMAL_PRODUCTS = /\b(egg(?:s| whites?)?|milk|butter|ghee|yogurt|cheese|cream|whey|honey|paneer)\b/i;

export function matchesDietaryPreference(meal: { name: string; ingredients: string[]; protein: number }, preference?: string | null) {
  if (!preference || preference === "No preference") return true;
  if (preference === "High-protein") return meal.protein >= 25;

  // Plant-based versions ("peanut butter", "soy milk", "coconut milk") are fine for vegans
  const ingredients = [meal.name, ...meal.ingredients]
    .join(" ")
    .replace(/\b(peanut|almond|cashew|nut|seed) butter\b/gi, "")
    .replace(/\b(coconut|soy|almond|oat|rice|plant) (milk|yogurt|cream)\b/gi, "");
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

