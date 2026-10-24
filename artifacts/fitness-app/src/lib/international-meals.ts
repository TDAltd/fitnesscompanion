// International recipes added alongside the Nigerian library on the Meals page.
// Macros are per serving and approximate (standard food-database values, rounded).
export const INTERNATIONAL_MEALS = [
  // ---------- Breakfast ----------
  {
    id: 101, name: "Greek Yogurt Berry Bowl", category: "Breakfast", prepMins: 5,
    calories: 300, protein: 25, carbs: 36, fat: 6,
    ingredients: ["200g plain Greek yogurt (0% fat)", "1 cup mixed berries", "2 tbsp rolled oats", "1 tsp honey", "1 tbsp pumpkin seeds"],
    steps: ["Spoon yogurt into a bowl.", "Top with berries, oats and seeds.", "Drizzle with honey."],
  },
  {
    id: 102, name: "Tofu Scramble on Wholegrain Toast", category: "Breakfast", prepMins: 15,
    calories: 360, protein: 24, carbs: 32, fat: 15,
    ingredients: ["150g firm tofu", "1 slice wholegrain bread", "1 cup spinach", "6 cherry tomatoes", "1/2 tsp turmeric", "1 tsp olive oil", "Salt & black pepper"],
    steps: ["Crumble tofu into a hot oiled pan.", "Add turmeric, salt and pepper; cook 5 mins.", "Stir in spinach and halved tomatoes until wilted.", "Serve on toasted bread."],
  },
  {
    id: 103, name: "Spinach & Feta Omelette", category: "Breakfast", prepMins: 10,
    calories: 320, protein: 26, carbs: 5, fat: 22,
    ingredients: ["3 eggs", "30g feta cheese", "1 cup spinach", "1/4 onion, chopped", "1 tsp olive oil", "Black pepper"],
    steps: ["Soften onion and spinach in oil.", "Pour in beaten eggs; cook until almost set.", "Crumble feta over, fold and serve."],
  },
  {
    id: 104, name: "Peanut Butter Banana Overnight Oats", category: "Breakfast", prepMins: 5,
    calories: 420, protein: 20, carbs: 55, fat: 14,
    ingredients: ["50g rolled oats", "200ml unsweetened soy milk", "1 tbsp peanut butter", "1/2 banana, sliced", "1 tbsp chia seeds", "Pinch of cinnamon"],
    steps: ["Mix oats, soy milk, chia and cinnamon in a jar.", "Refrigerate overnight.", "Top with banana and peanut butter in the morning."],
  },
  // ---------- Lunch ----------
  {
    id: 111, name: "Chicken & Quinoa Power Bowl", category: "Lunch", prepMins: 25,
    calories: 480, protein: 42, carbs: 45, fat: 14,
    ingredients: ["150g chicken breast", "60g quinoa (dry)", "1 cup mixed salad leaves", "1/4 avocado", "Cucumber & cherry tomatoes", "Lemon juice", "1 tsp olive oil"],
    steps: ["Cook quinoa (15 mins) and let cool slightly.", "Season and grill the chicken, 6 mins each side; slice.", "Build the bowl: leaves, quinoa, veg, chicken, avocado.", "Dress with lemon and olive oil."],
  },
  {
    id: 112, name: "Red Lentil & Vegetable Soup", category: "Lunch", prepMins: 30,
    calories: 350, protein: 20, carbs: 52, fat: 6,
    ingredients: ["80g red lentils (dry)", "1 carrot, diced", "1 celery stick, diced", "1/2 onion", "2 cloves garlic", "1 tsp cumin", "500ml vegetable stock", "1 tsp olive oil"],
    steps: ["Soften onion, garlic, carrot and celery in oil.", "Add cumin, lentils and stock.", "Simmer 20 mins until lentils are soft.", "Blend partly for a thicker soup."],
  },
  {
    id: 113, name: "Chickpea Salad Wrap", category: "Lunch", prepMins: 10,
    calories: 420, protein: 18, carbs: 55, fat: 14,
    ingredients: ["1 wholewheat wrap", "120g cooked chickpeas", "1 tbsp tahini", "Cucumber, tomato & red onion", "Handful of lettuce", "Lemon juice", "Salt & paprika"],
    steps: ["Lightly mash chickpeas with tahini, lemon, salt and paprika.", "Spread on the wrap with salad.", "Roll tightly and slice in half."],
  },
  {
    id: 114, name: "Tuna Niçoise Salad", category: "Lunch", prepMins: 20,
    calories: 390, protein: 35, carbs: 20, fat: 18,
    ingredients: ["1 tin tuna in water (drained)", "1 egg, boiled", "100g baby potatoes, boiled", "Handful of green beans", "Lettuce & cherry tomatoes", "5 olives", "1 tsp olive oil & vinegar"],
    steps: ["Boil potatoes and green beans; cool.", "Arrange leaves, potatoes, beans and tomatoes.", "Top with tuna, halved egg and olives.", "Dress with oil and vinegar."],
  },
  {
    id: 115, name: "Black Bean Burrito Bowl", category: "Lunch", prepMins: 20,
    calories: 450, protein: 18, carbs: 70, fat: 10,
    ingredients: ["60g brown rice (dry)", "120g black beans (cooked)", "1/2 cup sweetcorn", "Tomato salsa", "1/4 avocado", "Lime juice", "Fresh coriander"],
    steps: ["Cook the rice.", "Warm beans and corn with a pinch of cumin.", "Layer rice, beans, corn, salsa and avocado.", "Finish with lime and coriander."],
  },
  // ---------- Dinner ----------
  {
    id: 121, name: "Baked Salmon, Sweet Potato & Greens", category: "Dinner", prepMins: 30,
    calories: 520, protein: 38, carbs: 40, fat: 22,
    ingredients: ["150g salmon fillet", "1 medium sweet potato", "1 cup broccoli or green beans", "1 tsp olive oil", "Lemon, garlic & herbs"],
    steps: ["Cube sweet potato, toss in oil; roast at 200°C for 15 mins.", "Add salmon with lemon and garlic to the tray.", "Roast 12 more mins; steam the greens.", "Serve together."],
  },
  {
    id: 122, name: "Turkey Chilli", category: "Dinner", prepMins: 35,
    calories: 430, protein: 40, carbs: 35, fat: 12,
    ingredients: ["150g lean turkey mince", "100g kidney beans (cooked)", "1 tin chopped tomatoes (half)", "1/2 onion & 1 pepper", "2 cloves garlic", "1 tsp chilli powder & cumin"],
    steps: ["Brown turkey with onion and garlic.", "Add pepper, spices, tomatoes and beans.", "Simmer 20 mins until thick."],
  },
  {
    id: 123, name: "Chickpea & Spinach Curry with Brown Rice", category: "Dinner", prepMins: 30,
    calories: 480, protein: 17, carbs: 70, fat: 14,
    ingredients: ["150g cooked chickpeas", "100ml light coconut milk", "2 cups spinach", "1/2 tin chopped tomatoes", "1/2 onion, garlic & ginger", "1 tbsp curry powder", "50g brown rice (dry)"],
    steps: ["Cook rice.", "Fry onion, garlic, ginger and curry powder 3 mins.", "Add tomatoes, chickpeas and coconut milk; simmer 15 mins.", "Stir in spinach until wilted; serve over rice."],
  },
  {
    id: 124, name: "Shrimp & Vegetable Noodle Stir-Fry", category: "Dinner", prepMins: 20,
    calories: 420, protein: 32, carbs: 45, fat: 10,
    ingredients: ["150g shrimp (peeled)", "60g wholewheat noodles (dry)", "2 cups stir-fry vegetables", "1 tbsp soy sauce", "1 tsp sesame oil", "Garlic, ginger & chilli"],
    steps: ["Cook noodles and drain.", "Stir-fry garlic, ginger and chilli in sesame oil.", "Add shrimp (3 mins) and vegetables (3 mins).", "Toss with noodles and soy sauce."],
  },
  {
    id: 125, name: "Grilled Paneer & Vegetable Skewers", category: "Dinner", prepMins: 25,
    calories: 400, protein: 24, carbs: 14, fat: 27,
    ingredients: ["120g paneer, cubed", "1 pepper & 1 onion, chunked", "8 cherry tomatoes", "2 tbsp plain yogurt", "1 tsp garam masala & chilli"],
    steps: ["Coat paneer and veg in yogurt and spices.", "Thread onto skewers.", "Grill or bake at 220°C for 12-15 mins, turning once."],
  },
  {
    id: 126, name: "Lean Beef & Broccoli with Rice", category: "Dinner", prepMins: 25,
    calories: 470, protein: 36, carbs: 45, fat: 14,
    ingredients: ["130g lean beef strips", "2 cups broccoli", "50g white or brown rice (dry)", "1 tbsp soy sauce", "1 tsp oyster sauce", "Garlic & ginger", "1 tsp oil"],
    steps: ["Cook rice.", "Sear beef in a hot pan 2-3 mins; set aside.", "Stir-fry broccoli with garlic and ginger.", "Return beef, add sauces, toss and serve."],
  },
  // ---------- Snacks ----------
  {
    id: 131, name: "Hummus & Veggie Sticks", category: "Snack", prepMins: 5,
    calories: 200, protein: 7, carbs: 20, fat: 10,
    ingredients: ["4 tbsp hummus", "1 carrot", "1/2 cucumber", "1/2 pepper"],
    steps: ["Cut vegetables into sticks.", "Serve with hummus."],
  },
  {
    id: 132, name: "Cottage Cheese with Pineapple", category: "Snack", prepMins: 2,
    calories: 180, protein: 20, carbs: 14, fat: 4,
    ingredients: ["150g low-fat cottage cheese", "1/2 cup pineapple chunks"],
    steps: ["Top cottage cheese with pineapple."],
  },
  {
    id: 133, name: "Edamame with Sea Salt", category: "Snack", prepMins: 5,
    calories: 190, protein: 17, carbs: 14, fat: 8,
    ingredients: ["150g edamame (in pods, frozen)", "Pinch of sea salt", "Chilli flakes (optional)"],
    steps: ["Boil or steam 4-5 mins.", "Season and pop the beans from the pods."],
  },
  {
    id: 134, name: "Protein Smoothie", category: "Snack", prepMins: 5,
    calories: 280, protein: 30, carbs: 30, fat: 5,
    ingredients: ["1 scoop whey protein", "1 banana", "250ml low-fat milk", "Handful of ice"],
    steps: ["Blend everything until smooth."],
  },
];

/** Recipes from the original library that are international rather than Nigerian dishes. */
export const ORIGINAL_INTERNATIONAL = new Set([
  "Grilled Chicken & Vegetable Stir-Fry",
  "Oat Porridge with Egg Whites",
  "Boiled Eggs & Garden Salad",
  "Bulgur Wheat & Grilled Fish",
  "Tuna & Avocado Salad",
  "Overnight Chia & Ginger Oats",
]);
