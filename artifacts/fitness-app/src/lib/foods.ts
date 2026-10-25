// Everyday foods with familiar portions, for quick logging on the Eat page.
// Values are approximate averages per portion (home cooking varies a lot, especially oil);
// users can always adjust the portion or log their own numbers.
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
};

type Row = [name: string, portion: string, kcal: number, p: number, c: number, f: number, slot: Food["slot"], ingredients?: string[]];

const ROWS: Row[] = [
  // Swallows
  ["Eba", "1 medium wrap", 360, 1, 88, 1, "Lunch", ["garri"]],
  ["Pounded yam", "1 medium wrap", 410, 5, 97, 1, "Lunch", ["yam"]],
  ["Amala", "1 medium wrap", 330, 3, 78, 1, "Lunch", ["yam flour"]],
  ["Semo (semovita)", "1 medium wrap", 380, 12, 78, 1, "Lunch", ["semolina"]],
  ["Fufu (akpu)", "1 medium wrap", 400, 1, 96, 1, "Lunch", ["cassava"]],
  ["Tuwo shinkafa", "1 medium wrap", 350, 6, 78, 1, "Dinner", ["rice"]],
  ["Oat swallow", "1 medium wrap", 300, 10, 54, 6, "Lunch", ["oats"]],
  // Soups and stews (without the meat or fish: add those separately)
  ["Egusi soup", "1 ladle, soup only", 350, 14, 8, 30, "Lunch", ["melon seeds", "palm oil", "crayfish"]],
  ["Okra soup", "1 ladle, soup only", 120, 8, 8, 7, "Lunch", ["okra", "crayfish"]],
  ["Ogbono soup", "1 ladle, soup only", 300, 10, 8, 26, "Lunch", ["ogbono", "palm oil", "crayfish"]],
  ["Efo riro", "1 ladle, soup only", 220, 10, 8, 17, "Lunch", ["spinach", "palm oil", "crayfish"]],
  ["Edikang ikong", "1 ladle, soup only", 230, 12, 8, 17, "Lunch", ["ugu", "waterleaf", "periwinkle"]],
  ["Bitterleaf soup (ofe onugbu)", "1 ladle, soup only", 260, 12, 9, 20, "Lunch", ["bitterleaf", "palm oil", "crayfish"]],
  ["Banga soup", "1 ladle, soup only", 380, 8, 6, 36, "Lunch", ["palm fruit", "crayfish"]],
  ["Goat meat pepper soup", "1 bowl", 280, 30, 4, 16, "Dinner", ["goat"]],
  ["Catfish pepper soup", "1 bowl", 250, 32, 4, 11, "Dinner", ["catfish"]],
  ["Tomato stew", "½ cup", 150, 2, 8, 12, "Lunch", ["tomato", "pepper", "oil"]],
  ["Ayamase (ofada stew)", "½ cup", 300, 8, 6, 28, "Lunch", ["green pepper", "palm oil", "locust beans"]],
  // Rice, beans, yam and plantain
  ["Jollof rice", "1 cup", 330, 6, 58, 8, "Lunch", ["rice", "tomato", "oil"]],
  ["Fried rice", "1 cup", 340, 7, 55, 10, "Lunch", ["rice", "vegetables", "oil"]],
  ["White rice", "1 cup", 240, 4, 53, 1, "Lunch", ["rice"]],
  ["Coconut rice", "1 cup", 380, 6, 58, 14, "Lunch", ["rice", "coconut milk"]],
  ["Ofada rice", "1 cup", 230, 5, 48, 2, "Lunch", ["rice"]],
  ["Beans porridge", "1 cup", 330, 15, 45, 10, "Lunch", ["beans", "palm oil"]],
  ["Ewa agoyin", "1 cup with sauce", 400, 15, 40, 20, "Breakfast", ["beans", "palm oil"]],
  ["Moi moi", "1 wrap", 210, 12, 18, 10, "Breakfast", ["beans", "oil"]],
  ["Akara", "3 balls", 270, 10, 18, 18, "Breakfast", ["beans", "oil"]],
  ["Boiled yam", "2 slices", 240, 3, 56, 1, "Breakfast", ["yam"]],
  ["Yam porridge (asaro)", "1 cup", 320, 4, 55, 10, "Lunch", ["yam", "palm oil"]],
  ["Fried yam", "4 pieces", 380, 3, 55, 17, "Breakfast", ["yam", "oil"]],
  ["Dodo (fried plantain)", "1 cup", 350, 2, 58, 14, "Lunch", ["plantain", "oil"]],
  ["Boiled plantain", "1 medium", 220, 2, 57, 1, "Lunch", ["plantain"]],
  ["Spaghetti jollof", "1 cup", 300, 8, 50, 8, "Lunch", ["spaghetti", "tomato", "oil"]],
  ["Indomie noodles", "1 pack", 330, 7, 45, 14, "Dinner", ["noodles"]],
  ["Abacha", "1 plate", 420, 10, 60, 16, "Dinner", ["cassava", "palm oil", "crayfish"]],
  ["Masa", "3 pieces", 300, 5, 55, 7, "Breakfast", ["rice", "oil"]],
  // Breakfast basics
  ["Agege bread", "2 slices", 200, 6, 38, 3, "Breakfast", ["wheat flour"]],
  ["Pap (ogi / akamu)", "1 cup, plain", 120, 2, 28, 1, "Breakfast", ["corn"]],
  ["Custard with milk", "1 cup", 220, 6, 38, 5, "Breakfast", ["custard powder", "milk"]],
  ["Garri soakings", "1 cup, with sugar & groundnuts", 450, 8, 80, 12, "Snack", ["garri", "groundnuts", "sugar"]],
  ["Oats with milk", "1 cup", 250, 10, 40, 6, "Breakfast", ["oats", "milk"]],
  // Protein
  ["Fried chicken", "1 drumstick", 200, 18, 2, 13, "Lunch", ["chicken"]],
  ["Stewed chicken", "1 thigh", 230, 22, 0, 15, "Lunch", ["chicken"]],
  ["Turkey wing", "1 wing, fried", 380, 30, 2, 28, "Dinner", ["turkey"]],
  ["Beef in stew", "3 cubes", 230, 24, 0, 14, "Lunch", ["beef"]],
  ["Goat meat", "3 pieces", 160, 25, 0, 6, "Lunch", ["goat"]],
  ["Suya", "1 stick", 280, 27, 6, 16, "Dinner", ["beef", "groundnut spice"]],
  ["Kilishi", "1 small pack (30g)", 120, 18, 6, 2, "Snack", ["beef"]],
  ["Ponmo", "3 pieces", 120, 20, 0, 4, "Lunch", ["cow skin"]],
  ["Fried fish (titus / mackerel)", "1 piece", 250, 22, 3, 17, "Lunch", ["mackerel"]],
  ["Grilled croaker", "1 medium fish", 220, 35, 0, 8, "Dinner", ["croaker"]],
  ["Boiled egg", "1 egg", 78, 6, 1, 5, "Breakfast", ["egg"]],
  ["Fried egg", "1 egg", 110, 6, 1, 9, "Breakfast", ["egg"]],
  // Snacks and small chops
  ["Puff-puff", "3 pieces", 300, 5, 40, 13, "Snack", ["wheat flour", "sugar", "oil"]],
  ["Chin chin", "1 handful", 150, 2, 18, 8, "Snack", ["wheat flour", "sugar", "butter"]],
  ["Meat pie", "1 pie", 380, 9, 38, 21, "Snack", ["beef", "wheat flour", "butter"]],
  ["Sausage roll", "1 roll", 200, 6, 20, 11, "Snack", ["sausage", "wheat flour"]],
  ["Doughnut", "1 doughnut", 300, 5, 35, 16, "Snack", ["wheat flour", "sugar", "oil"]],
  ["Plantain chips", "1 small pack", 260, 1, 30, 15, "Snack", ["plantain", "oil"]],
  ["Groundnuts", "1 handful", 170, 7, 5, 14, "Snack", ["groundnuts"]],
  ["Tiger nuts", "1 handful", 140, 2, 14, 7, "Snack", ["tiger nuts"]],
  ["Biscuits", "3 cookies", 140, 2, 20, 6, "Snack", ["wheat flour", "sugar", "butter"]],
  // Drinks
  ["Zobo", "1 glass, sweetened", 110, 0, 27, 0, "Snack", ["hibiscus", "sugar"]],
  ["Kunu", "1 glass", 150, 2, 33, 1, "Snack", ["millet", "sugar"]],
  ["Malt drink", "1 can", 230, 2, 55, 0, "Snack", ["malt", "sugar"]],
  ["Soft drink (Coke, Fanta…)", "1 bottle (35cl)", 150, 0, 39, 0, "Snack", ["sugar"]],
  ["Orange juice", "1 glass", 110, 2, 26, 0, "Breakfast", ["orange"]],
  ["Tea with milk & sugar", "1 cup", 80, 2, 12, 2, "Breakfast", ["milk", "sugar"]],
  ["Milo with milk", "1 cup", 180, 7, 25, 6, "Breakfast", ["milk", "cocoa", "sugar"]],
  ["Beer", "1 bottle (60cl)", 250, 2, 20, 0, "Dinner", ["barley"]],
  // Fruit and veg
  ["Banana", "1 medium", 105, 1, 27, 0, "Snack", ["banana"]],
  ["Orange", "1 orange", 62, 1, 15, 0, "Snack", ["orange"]],
  ["Mango", "1 medium", 200, 3, 50, 1, "Snack", ["mango"]],
  ["Pineapple", "1 cup", 82, 1, 22, 0, "Snack", ["pineapple"]],
  ["Watermelon", "2 cups", 90, 2, 22, 0, "Snack", ["watermelon"]],
  ["Pawpaw (papaya)", "1 cup", 60, 1, 15, 0, "Snack", ["papaya"]],
  ["Apple", "1 apple", 95, 0, 25, 0, "Snack", ["apple"]],
  ["Avocado", "½ avocado", 160, 2, 9, 15, "Snack", ["avocado"]],
  ["Garden egg", "3 garden eggs", 40, 2, 9, 0, "Snack", ["garden egg"]],
  ["Agbalumo (African star apple)", "3 fruits", 100, 1, 24, 0, "Snack", ["agbalumo"]],
];

export const FOODS: Food[] = ROWS.map(([name, portion, calories, protein, carbs, fat, slot, ingredients], i) => ({
  id: `food-${i}`,
  name,
  portion,
  calories,
  protein,
  carbs,
  fat,
  slot,
  ingredients: ingredients ?? [],
}));
