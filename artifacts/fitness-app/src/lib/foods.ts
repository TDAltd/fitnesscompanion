// Everyday foods with familiar portions, for quick logging on the Eat page.
// Numbers from the FAO/INFOODS Food Composition Table for Western Africa (2019), per portion:
// single foods straight from FAO; Nigerian dishes from a standard recipe of FAO ingredients
// (home cooking varies, especially the oil); brands from the pack. Full workings: the
// "FAO review" spreadsheet. Users can always adjust the portion or log their own numbers.
// `ingredients` holds key words used by the vegan/vegetarian/pescatarian filter.

export type Food = {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  slot: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  ingredients: string[];
  /** Weight of the portion, where known */
  grams: number | null;
  source: FoodSource;
};

/** Where a food's numbers come from: shown next to it so people know how far to trust it. */
export type FoodSource = "fao" | "fao-recipe" | "pack" | "estimate";
export const SOURCE_LABEL: Record<FoodSource, string> = {
  fao: "FAO data",
  "fao-recipe": "FAO, standard recipe",
  pack: "Pack label",
  estimate: "Estimate",
};

type Row = [name: string, portion: string, kcal: number, p: number, c: number, f: number, slot: Food["slot"], ingredients: string[], grams: number | null, source: FoodSource];

const ROWS: Row[] = [
  // Swallows
  ["Eba", "1 medium wrap", 366, 1, 86, 1, "Lunch", ["garri"], 250, "fao"],
  ["Pounded yam", "1 medium wrap", 340, 5, 72, 0, "Lunch", ["yam"], 250, "fao"],
  ["Amala", "1 medium wrap", 270, 6, 55, 0, "Lunch", ["yam flour"], 250, "fao"],
  ["Semo (semovita)", "1 medium wrap", 351, 10, 72, 2, "Lunch", ["semolina"], 250, "fao"],
  ["Fufu (akpu)", "1 medium wrap", 412, 2, 97, 1, "Lunch", ["cassava"], 250, "fao"],
  ["Tuwo shinkafa", "1 medium wrap", 288, 6, 64, 0, "Dinner", ["rice"], 250, "fao"],
  ["Oat swallow", "1 medium wrap", 310, 10, 49, 6, "Lunch", ["oats"], 250, "fao"],
  // Soups and stews (without the meat or fish: add those separately)
  ["Egusi soup", "1 ladle, soup only", 351, 13, 6, 30, "Lunch", ["melon seeds", "palm oil", "crayfish"], 150, "fao-recipe"],
  ["Okra soup", "1 ladle, soup only", 93, 5, 5, 5, "Lunch", ["okra", "crayfish"], 150, "fao-recipe"],
  ["Ogbono soup", "1 ladle, soup only", 266, 5, 3, 25, "Lunch", ["ogbono", "palm oil", "crayfish"], 150, "fao-recipe"],
  ["Efo riro", "1 ladle, soup only", 231, 8, 7, 18, "Lunch", ["spinach", "palm oil", "crayfish"], 150, "fao-recipe"],
  ["Edikang ikong", "1 ladle, soup only", 231, 13, 8, 16, "Lunch", ["ugu", "waterleaf", "periwinkle"], 150, "fao-recipe"],
  ["Bitterleaf soup (ofe onugbu)", "1 ladle, soup only", 167, 4, 7, 13, "Lunch", ["bitterleaf", "palm oil", "crayfish"], 150, "fao-recipe"],
  ["Banga soup", "1 ladle, soup only", 226, 2, 1, 23, "Lunch", ["palm fruit", "crayfish"], 150, "fao-recipe"],
  ["Goat meat pepper soup", "1 bowl", 434, 47, 2, 26, "Dinner", ["goat"], 380, "fao-recipe"],
  ["Catfish pepper soup", "1 bowl", 254, 40, 2, 9, "Dinner", ["catfish"], 430, "fao-recipe"],
  ["Tomato stew", "½ cup", 290, 3, 11, 25, "Lunch", ["tomato", "pepper", "oil"], 120, "fao-recipe"],
  ["Ayamase (ofada stew)", "½ cup", 409, 3, 9, 39, "Lunch", ["green pepper", "palm oil", "locust beans"], 120, "fao-recipe"],
  // Rice, beans, yam and plantain
  ["Jollof rice", "1 cup", 272, 4, 38, 11, "Lunch", ["rice", "tomato", "oil"], 180, "fao-recipe"],
  ["Fried rice", "1 cup", 277, 6, 37, 11, "Lunch", ["rice", "vegetables", "oil"], 180, "fao-recipe"],
  ["White rice", "1 cup", 207, 4, 46, 0, "Lunch", ["rice"], 180, "fao"],
  ["Coconut rice", "1 cup", 304, 3, 39, 14, "Lunch", ["rice", "coconut milk"], 180, "fao-recipe"],
  ["Ofada rice", "1 cup", 254, 5, 53, 2, "Lunch", ["rice"], 180, "fao"],
  ["Beans porridge", "1 cup", 353, 17, 33, 15, "Lunch", ["beans", "palm oil"], 250, "fao-recipe"],
  ["Ewa agoyin", "1 cup with sauce", 493, 18, 39, 27, "Breakfast", ["beans", "palm oil"], 250, "fao-recipe"],
  ["Moi moi", "1 wrap", 272, 13, 27, 11, "Breakfast", ["beans", "oil"], 150, "fao-recipe"],
  ["Akara", "3 balls", 228, 11, 25, 8, "Breakfast", ["beans", "oil"], 90, "fao"],
  ["Boiled yam", "2 slices", 272, 4, 57, 0, "Breakfast", ["yam"], 200, "fao"],
  ["Yam porridge (asaro)", "1 cup", 332, 7, 43, 12, "Lunch", ["yam", "palm oil"], 250, "fao-recipe"],
  ["Fried yam", "4 pieces", 419, 6, 63, 13, "Breakfast", ["yam", "oil"], 160, "fao"],
  ["Dodo (fried plantain)", "1 cup", 488, 3, 67, 22, "Lunch", ["plantain", "oil"], 130, "fao"],
  ["Boiled plantain", "1 medium", 272, 3, 55, 2, "Lunch", ["plantain"], 180, "fao"],
  ["Spaghetti jollof", "1 cup", 378, 8, 43, 19, "Lunch", ["spaghetti", "tomato", "oil"], 180, "fao"],
  ["Indomie noodles", "1 pack", 320, 9, 40, 13, "Dinner", ["noodles"], 70, "fao"],
  ["Abacha", "1 plate", 620, 10, 71, 31, "Dinner", ["cassava", "palm oil", "crayfish"], 330, "fao-recipe"],
  ["Masa", "3 pieces", 364, 4, 66, 9, "Breakfast", ["rice", "oil"], 120, "fao"],
  // Breakfast basics
  ["Agege bread", "2 slices", 217, 8, 41, 2, "Breakfast", ["wheat flour"], 80, "fao"],
  ["Pap (ogi / akamu)", "1 cup, plain", 125, 3, 21, 2, "Breakfast", ["corn"], 240, "fao"],
  ["Custard with milk", "1 cup", 194, 5, 36, 3, "Breakfast", ["custard powder", "milk"], 240, "fao-recipe"],
  ["Garri soakings", "1 cup, with sugar & groundnuts", 381, 6, 64, 10, "Snack", ["garri", "groundnuts", "sugar"], 300, "fao-recipe"],
  ["Oats with milk", "1 cup", 182, 6, 28, 4, "Breakfast", ["oats", "milk"], 255, "fao-recipe"],
  // Protein
  ["Fried chicken", "1 drumstick", 265, 17, 0, 22, "Lunch", ["chicken"], 86, "fao-recipe"],
  ["Stewed chicken", "1 thigh", 331, 24, 0, 26, "Lunch", ["chicken"], 100, "fao"],
  ["Turkey wing", "1 wing, fried", 486, 32, 0, 40, "Dinner", ["turkey"], 160, "fao-recipe"],
  ["Beef in stew", "3 cubes", 218, 25, 0, 13, "Lunch", ["beef"], 90, "fao"],
  ["Goat meat", "3 pieces", 253, 28, 0, 16, "Lunch", ["goat"], 90, "fao"],
  ["Suya", "1 stick", 233, 27, 1, 13, "Dinner", ["beef", "groundnut spice"], 93, "fao-recipe"],
  ["Kilishi", "1 small pack (30g)", 120, 18, 6, 2, "Snack", ["beef"], 30, "estimate"],
  ["Ponmo", "3 pieces", 120, 20, 0, 4, "Lunch", ["cow skin"], 90, "estimate"],
  ["Fried fish (titus / mackerel)", "1 piece", 252, 29, 0, 15, "Lunch", ["mackerel"], 128, "fao-recipe"],
  ["Grilled croaker", "1 medium fish", 223, 47, 0, 4, "Dinner", ["croaker"], 200, "fao"],
  ["Boiled egg", "1 egg", 75, 7, 0, 5, "Breakfast", ["egg"], 50, "fao"],
  ["Fried egg", "1 egg", 98, 7, 1, 7, "Breakfast", ["egg"], 50, "fao"],
  // Snacks and small chops
  ["Puff-puff", "3 pieces", 279, 5, 41, 11, "Snack", ["wheat flour", "sugar", "oil"], 75, "fao-recipe"],
  ["Chin chin", "1 handful", 151, 3, 19, 7, "Snack", ["wheat flour", "sugar", "butter"], 30, "fao-recipe"],
  ["Meat pie", "1 pie", 468, 15, 42, 26, "Snack", ["beef", "wheat flour", "butter"], 130, "fao-recipe"],
  ["Sausage roll", "1 roll", 279, 6, 26, 17, "Snack", ["sausage", "wheat flour"], 70, "fao-recipe"],
  ["Doughnut", "1 doughnut", 294, 6, 37, 13, "Snack", ["wheat flour", "sugar", "oil"], 70, "fao-recipe"],
  ["Plantain chips", "1 small pack", 260, 1, 30, 15, "Snack", ["plantain", "oil"], 50, "estimate"],
  ["Groundnuts", "1 handful", 172, 7, 5, 13, "Snack", ["groundnuts"], 30, "fao"],
  ["Tiger nuts", "1 handful", 140, 1, 15, 8, "Snack", ["tiger nuts"], 30, "fao"],
  ["Biscuits", "3 cookies", 144, 2, 19, 6, "Snack", ["wheat flour", "sugar", "butter"], 30, "fao"],
  // Drinks
  ["Zobo", "1 glass, sweetened", 100, 0, 25, 0, "Snack", ["hibiscus", "sugar"], 250, "fao-recipe"],
  ["Kunu", "1 glass", 150, 2, 33, 1, "Snack", ["millet", "sugar"], 250, "estimate"],
  ["Malt drink", "1 can", 230, 2, 55, 0, "Snack", ["malt", "sugar"], 330, "estimate"],
  ["Soft drink (Coke, Fanta…)", "1 bottle (35cl)", 140, 0, 35, 0, "Snack", ["sugar"], 350, "fao"],
  ["Orange juice", "1 glass", 105, 2, 23, 0, "Breakfast", ["orange"], 250, "fao"],
  ["Tea with milk & sugar", "1 cup", 56, 1, 10, 1, "Breakfast", ["milk", "sugar"], 245, "fao-recipe"],
  ["Milo with milk", "1 cup", 180, 7, 25, 6, "Breakfast", ["milk", "cocoa", "sugar"], 250, "estimate"],
  ["Beer", "1 bottle (60cl)", 246, 2, 22, 0, "Dinner", ["barley"], 600, "fao"],
  // Fruit and veg
  ["Banana", "1 medium", 107, 2, 23, 0, "Snack", ["banana"], 120, "fao"],
  ["Orange", "1 orange", 57, 1, 11, 1, "Snack", ["orange"], 130, "fao"],
  ["Mango", "1 medium", 140, 1, 31, 0, "Snack", ["mango"], 200, "fao"],
  ["Pineapple", "1 cup", 87, 1, 19, 0, "Snack", ["pineapple"], 165, "fao"],
  ["Watermelon", "2 cups", 75, 2, 15, 0, "Snack", ["watermelon"], 300, "fao"],
  ["Pawpaw (papaya)", "1 cup", 86, 1, 19, 0, "Snack", ["papaya"], 145, "fao"],
  ["Apple", "1 apple", 106, 1, 22, 1, "Snack", ["apple"], 180, "fao"],
  ["Avocado", "½ avocado", 156, 2, 2, 15, "Snack", ["avocado"], 100, "fao"],
  ["Garden egg", "3 garden eggs", 48, 2, 6, 1, "Snack", ["garden egg"], 150, "fao"],
  ["Agbalumo (African star apple)", "3 fruits", 119, 3, 15, 5, "Snack", ["agbalumo"], 90, "fao"],
  // Local measures and packed foods (approximate; check the pack where you can)
  ["Stew", "1 cooking spoon", 109, 1, 4, 9, "Lunch", ["tomato", "pepper", "oil"], 45, "fao-recipe"],
  ["White rice", "1 cooking spoon", 69, 1, 15, 0, "Lunch", ["rice"], 60, "fao"],
  ["Jollof rice", "1 cooking spoon", 91, 1, 13, 4, "Lunch", ["rice", "tomato", "oil"], 60, "fao-recipe"],
  ["Palm oil", "1 tablespoon", 126, 0, 0, 14, "Lunch", ["palm oil"], 14, "fao"],
  ["Vegetable oil", "1 tablespoon", 126, 0, 0, 14, "Lunch", ["oil"], 14, "fao"],
  ["Sugar", "1 teaspoon or 1 cube", 16, 0, 4, 0, "Breakfast", ["sugar"], 4, "fao"],
  ["Nescafé 3-in-1", "1 sachet", 70, 1, 12, 2, "Breakfast", ["coffee", "milk", "sugar"], null, "pack"],
  ["Barissimo 3-in-1", "1 sachet", 80, 1, 14, 2, "Breakfast", ["coffee", "milk", "sugar"], null, "pack"],
  ["Milo", "1 sachet (20 g), with water", 80, 2, 14, 2, "Breakfast", ["cocoa", "milk", "sugar"], null, "pack"],
  ["Peak milk powder", "1 sachet (about 14 g)", 69, 4, 5, 4, "Breakfast", ["milk"], 14, "fao"],
  ["Evaporated milk (Peak)", "2 tablespoons", 47, 2, 4, 3, "Breakfast", ["milk"], 30, "fao"],
  ["Gala sausage roll", "1 roll", 220, 6, 22, 12, "Snack", ["sausage", "wheat flour"], null, "pack"],
  ["Hollandia yoghurt", "1 bottle (315 ml)", 285, 9, 45, 7, "Snack", ["milk", "sugar"], null, "pack"],
  ["Chi Exotic juice", "1 glass", 120, 0, 29, 0, "Snack", ["fruit", "sugar"], 250, "fao"],
  ["Golden Morn with milk", "1 bowl", 220, 7, 36, 5, "Breakfast", ["maize", "milk", "sugar"], null, "pack"],
  ["Cornflakes with milk", "1 bowl", 195, 6, 31, 5, "Breakfast", ["corn", "milk", "sugar"], 155, "fao-recipe"],
  ["Sliced bread", "2 slices", 124, 4, 25, 1, "Breakfast", ["wheat flour"], 50, "fao"],
];

export const FOODS: Food[] = ROWS.map(([name, portion, calories, protein, carbs, fat, slot, ingredients, grams, source], i) => ({
  id: `food-${i}`,
  name,
  portion,
  calories,
  protein,
  carbs,
  fat,
  slot,
  ingredients: ingredients ?? [],
  grams,
  source,
}));
