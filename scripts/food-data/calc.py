"""
Fitness Companion food list, recalculated from the FAO/INFOODS Food Composition Table for
Western Africa (2019). Every number traces back to FAO codes per 100 g edible portion.

Methods:
  fao     one FAO food, portion grams x FAO per 100 g
  recipe  standard Nigerian recipe from FAO ingredients (grams as they are in the finished dish),
          optional 'cook' = share of the summed weight left after cooking (water lost)
  dough   swallow made from a FAO flour and water, at an assumed dough moisture
  keep    no FAO match (brands, ponmo, kilishi...): current numbers kept, marked for checking
"""
import json, sys

D = {x["code"]: x for x in json.load(open(sys.argv[1]))}
KEYS = ("kcal", "protein", "carbs", "fat")


def n(code, grams):
    x = D[code]
    return {k: (x[k] or 0) * grams / 100 for k in KEYS}


def add(*parts):
    out = {k: 0.0 for k in KEYS}
    for p in parts:
        for k in KEYS:
            out[k] += p[k]
    return out


def scale(v, f):
    return {k: v[k] * f for k in KEYS}


FOODS = []


def food(name, portion, grams, method, old, conf, note="", **kw):
    FOODS.append(dict(name=name, portion=portion, grams=grams, method=method, old=old, conf=conf, note=note, **kw))


# old = (kcal, protein, carbs, fat) currently in the app
# ---------- Swallows (1 medium wrap = 250 g) ----------
W = 250
food("Eba", "1 medium wrap", W, "dough", (360, 1, 88, 1), "Medium", flour="02_039", water=62,
     note="White gari made into eba at 62% water (typical stiff eba).")
food("Pounded yam", "1 medium wrap", W, "fao", (410, 5, 97, 1), "High", code="02_078",
     note="Boiled yam (Nigerian cultivars); pounding adds nothing.")
food("Amala", "1 medium wrap", W, "dough", (330, 3, 78, 1), "Medium", flour="02_036", water=70,
     note="Yam flour (elubo) made into amala at 70% water.")
food("Semo (semovita)", "1 medium wrap", W, "dough", (380, 12, 78, 1), "Low", flour="01_043", water=65,
     note="No semolina in FAO: white wheat flour used, at 65% water. Check against the Semovita pack.")
food("Fufu (akpu)", "1 medium wrap", W, "fao", (400, 1, 96, 1), "High", code="02_041",
     note="Fermented cassava paste (wet fufu).")
food("Tuwo shinkafa", "1 medium wrap", W, "fao", (350, 6, 78, 1), "Medium", code="01_135",
     note="Boiled white rice, mashed.")
food("Oat swallow", "1 medium wrap", W, "dough", (300, 10, 54, 6), "Medium", flour="01_101", water=70,
     note="Rolled oats made into swallow at 70% water.")

# ---------- Soups and stews: 1 ladle = 150 g, soup only ----------
L = 150
soup = lambda name, portion, grams, old, conf, **k: food(name, portion, grams, "recipe", old, conf, **k)
soup("Egusi soup", "1 ladle, soup only", L, (350, 14, 8, 30), "Medium",
     recipe=[("06_013", 300, "melon seed (egusi)"), ("11_004", 150, "red palm oil"), ("04_116", 300, "leafy veg (ugu), boiled"),
             ("09_057", 30, "crayfish"), ("03_042", 15, "iru (locust beans)"), ("04_018", 100, "onion"), ("04_046", 50, "fresh pepper"), ("12_019", 500, "water")],
     note="Standard pot: 300 g egusi, 150 g palm oil (about 11 tbsp).")
soup("Okra soup", "1 ladle, soup only", L, (120, 8, 8, 7), "Medium",
     recipe=[("04_111", 500, "okra, boiled"), ("11_004", 40, "red palm oil"), ("09_057", 30, "crayfish"), ("03_042", 15, "iru"),
             ("04_116", 150, "ugu, boiled"), ("04_018", 80, "onion"), ("04_046", 40, "pepper"), ("12_019", 400, "water")])
soup("Ogbono soup", "1 ladle, soup only", L, (300, 10, 8, 26), "Medium",
     recipe=[("06_008", 150, "ogbono (dika nut)"), ("11_004", 120, "red palm oil"), ("09_057", 30, "crayfish"), ("04_116", 150, "ugu, boiled"),
             ("04_018", 80, "onion"), ("04_046", 40, "pepper"), ("12_019", 700, "water")])
soup("Efo riro", "1 ladle, soup only", L, (220, 10, 8, 17), "Medium",
     recipe=[("04_118", 600, "spinach, boiled"), ("11_004", 120, "red palm oil"), ("04_113", 300, "tatashe (red bell pepper)"), ("04_046", 50, "pepper"),
             ("04_018", 150, "onion"), ("09_057", 30, "crayfish"), ("03_042", 20, "iru")], cook=0.85)
soup("Edikang ikong", "1 ladle, soup only", L, (230, 12, 8, 17), "Medium",
     recipe=[("04_116", 500, "ugu, boiled"), ("04_120", 500, "waterleaf, boiled"), ("11_004", 120, "red palm oil"), ("09_057", 40, "crayfish"),
             ("09_101", 150, "periwinkle (sea snail)"), ("04_018", 80, "onion"), ("04_046", 40, "pepper")], cook=0.85)
soup("Bitterleaf soup (ofe onugbu)", "1 ladle, soup only", L, (260, 12, 9, 20), "Medium",
     recipe=[("04_126", 150, "bitterleaf, boiled"), ("02_054", 150, "cocoyam, boiled (thickener)"), ("11_004", 120, "red palm oil"),
             ("09_057", 30, "crayfish"), ("03_042", 15, "iru"), ("04_046", 40, "pepper"), ("12_019", 900, "water")])
soup("Banga soup", "1 ladle, soup only", L, (380, 8, 6, 36), "Low",
     recipe=[("11_004", 220, "palm fruit cream (as palm oil)"), ("12_019", 1000, "water"), ("09_057", 30, "crayfish"), ("04_018", 80, "onion"),
             ("04_046", 40, "pepper"), ("04_116", 50, "leaves")],
     note="FAO has no palm-nut cream: its fat is counted as palm oil. Needs the dietitian.")
food("Goat meat pepper soup", "1 bowl", 380, "recipe", (280, 30, 4, 16), "Medium",
     recipe=[("07_112", 150, "goat meat, stewed"), ("12_019", 200, "broth"), ("04_018", 20, "onion"), ("04_046", 10, "pepper")],
     note="One bowl: 150 g goat meat in broth.")
food("Catfish pepper soup", "1 bowl", 430, "recipe", (250, 32, 4, 11), "High",
     recipe=[("09_108", 200, "catfish, boiled"), ("12_019", 200, "broth"), ("04_018", 20, "onion"), ("04_046", 10, "pepper")],
     note="One bowl: 200 g catfish in broth.")
STEW = [("04_124", 800, "tomato, boiled"), ("04_113", 300, "tatashe"), ("04_046", 50, "pepper"), ("04_018", 200, "onion"),
        ("11_010", 200, "vegetable oil"), ("04_066", 70, "tomato paste")]
food("Tomato stew", "½ cup", 120, "recipe", (150, 2, 8, 12), "Medium", recipe=STEW, cook=0.6,
     note="Standard pot: 200 g oil (about 15 tbsp) for 1.4 kg of tomatoes and peppers, cooked down.")
food("Ayamase (ofada stew)", "½ cup", 120, "recipe", (300, 8, 6, 28), "Medium",
     recipe=[("04_050", 600, "green pepper"), ("04_046", 100, "scotch bonnet"), ("11_004", 250, "palm oil (bleached)"), ("04_018", 150, "onion"),
             ("03_042", 30, "iru")], cook=0.7)

# ---------- Rice, beans, yam, plantain ----------
CUP_RICE = 180
JOLLOF = [("01_134", 1500, "white rice, boiled (≈500 g raw)"), ("11_010", 120, "vegetable oil"), ("04_066", 70, "tomato paste"),
          ("04_124", 300, "tomato"), ("04_113", 150, "tatashe"), ("04_018", 100, "onion")]
food("Jollof rice", "1 cup", CUP_RICE, "recipe", (330, 6, 58, 8), "Medium", recipe=JOLLOF, cook=0.92,
     note="Party-style pot: 120 g oil for 500 g raw rice.")
food("Fried rice", "1 cup", CUP_RICE, "recipe", (340, 7, 55, 10), "Medium",
     recipe=[("01_134", 1500, "white rice, boiled"), ("11_010", 120, "vegetable oil"), ("04_091", 200, "carrot"), ("04_050", 150, "green pepper"),
             ("04_018", 100, "onion"), ("07_042", 100, "chicken liver")], cook=0.95)
food("White rice", "1 cup", CUP_RICE, "fao", (240, 4, 53, 1), "High", code="01_135")
food("Coconut rice", "1 cup", CUP_RICE, "recipe", (380, 6, 58, 14), "Medium",
     recipe=[("01_134", 1400, "white rice, boiled"), ("06_006", 400, "coconut milk"), ("11_010", 60, "vegetable oil"), ("04_018", 80, "onion"),
             ("04_113", 80, "tatashe")], cook=0.9)
food("Ofada rice", "1 cup", CUP_RICE, "fao", (230, 5, 48, 2), "High", code="01_136", note="Red native rice, boiled.")
food("Beans porridge", "1 cup", 250, "recipe", (330, 15, 45, 10), "Medium",
     recipe=[("03_007", 1200, "cowpea (beans), boiled"), ("11_004", 100, "red palm oil"), ("04_018", 100, "onion"), ("04_046", 40, "pepper"),
             ("09_057", 20, "crayfish"), ("12_019", 300, "water")])
food("Ewa agoyin", "1 cup with sauce", 250, "recipe", (400, 15, 40, 20), "Medium",
     recipe=[("03_007", 200, "beans, boiled soft"), ("11_004", 25, "palm oil in the sauce"), ("04_018", 20, "onion"), ("13_006", 5, "dried pepper")],
     note="One cup of beans with 2 tbsp of agoyin sauce.")
food("Moi moi", "1 wrap", 150, "recipe", (210, 12, 18, 10), "Medium",
     recipe=[("03_004", 500, "cowpea, dry (peeled, blended)"), ("12_019", 600, "water"), ("11_010", 100, "vegetable oil"),
             ("04_113", 200, "tatashe"), ("04_018", 100, "onion"), ("09_057", 30, "crayfish")],
     note="Plain moi moi, no egg or fish inside.")
food("Akara", "3 balls", 90, "fao", (270, 10, 18, 18), "Medium", code="03_154",
     note="FAO 'fried cowpea pancakes' (the closest dish; same method as akara).")
food("Boiled yam", "2 slices", 200, "fao", (240, 3, 56, 1), "High", code="02_078", note="2 slices ≈ 200 g.")
food("Yam porridge (asaro)", "1 cup", 250, "recipe", (320, 4, 55, 10), "Medium",
     recipe=[("02_077", 800, "yam, boiled"), ("11_004", 60, "red palm oil"), ("04_018", 80, "onion"), ("04_046", 60, "pepper"),
             ("09_057", 20, "crayfish"), ("04_116", 100, "leaves"), ("12_019", 200, "water")])
food("Fried yam", "4 pieces", 160, "fao", (380, 3, 55, 17), "High", code="02_082")
food("Dodo (fried plantain)", "1 cup", 130, "fao", (350, 2, 58, 14), "High", code="02_084",
     note="FAO deep-fried plantain. Shallow-fried at home soaks up a little less oil.")
food("Boiled plantain", "1 medium", 180, "fao", (220, 2, 57, 1), "High", code="02_064", note="Unripe, boiled; 1 medium ≈ 180 g flesh.")
food("Spaghetti jollof", "1 cup", CUP_RICE, "fao", (300, 8, 50, 8), "Medium", code="01_157", note="FAO 'jollof spaghetti'.")
food("Indomie noodles", "1 pack", 70, "fao", (330, 7, 45, 14), "High", code="01_077",
     note="70 g pack, dry weight. Seasoning sachets add about 20–40 kcal: check the pack.")
food("Abacha", "1 plate", 330, "recipe", (420, 10, 60, 16), "Medium",
     recipe=[("02_051", 250, "cassava shreds (soaked)"), ("11_004", 30, "palm oil"), ("09_057", 10, "crayfish"), ("04_018", 30, "onion"),
             ("04_046", 10, "pepper")],
     note="Plate of abacha with its palm-oil dressing; fish or ponmo not included.")
food("Masa", "3 pieces", 120, "fao", (300, 5, 55, 7), "Medium", code="01_163", note="FAO 'rice cakes, fried'.")

# ---------- Breakfast basics ----------
food("Agege bread", "2 slices", 80, "fao", (200, 6, 38, 3), "High", code="01_045", note="2 thick slices ≈ 80 g.")
food("Pap (ogi / akamu)", "1 cup, plain", 240, "fao", (120, 2, 28, 1), "High", code="01_100")
food("Custard with milk", "1 cup", 240, "recipe", (220, 6, 38, 5), "Medium",
     recipe=[("01_081", 30, "custard powder (as maize starch/flour)"), ("10_016", 30, "evaporated milk"), ("13_002", 10, "sugar"), ("12_019", 170, "water")])
food("Garri soakings", "1 cup, with sugar & groundnuts", 300, "recipe", (450, 8, 80, 12), "Medium",
     recipe=[("02_039", 60, "gari"), ("12_019", 200, "cold water"), ("13_002", 10, "sugar (2 tsp)"), ("06_010", 20, "groundnuts"), ("10_016", 10, "milk")])
food("Oats with milk", "1 cup", 255, "recipe", (250, 10, 40, 6), "High",
     recipe=[("01_133", 200, "oats porridge"), ("10_001", 50, "whole milk"), ("13_002", 5, "sugar")])

# ---------- Protein ----------
food("Fried chicken", "1 drumstick", 86, "recipe", (200, 18, 2, 13), "Medium",
     recipe=[("07_032", 80, "chicken, dark meat with skin"), ("11_010", 6, "frying oil taken up")])
food("Stewed chicken", "1 thigh", 100, "fao", (230, 22, 0, 15), "High", code="07_103")
food("Turkey wing", "1 wing, fried", 160, "recipe", (380, 30, 2, 28), "Low",
     recipe=[("07_032", 150, "poultry dark meat with skin (no turkey in FAO)"), ("11_010", 10, "frying oil")],
     note="No turkey meat in FAO: chicken dark meat used.")
food("Beef in stew", "3 cubes", 90, "fao", (230, 24, 0, 14), "High", code="07_134", note="Beef, about 10% fat, stewed.")
food("Goat meat", "3 pieces", 90, "fao", (160, 25, 0, 6), "High", code="07_112", note="Goat, moderately fat, stewed.")
food("Suya", "1 stick", 93, "recipe", (280, 27, 6, 16), "Medium",
     recipe=[("07_011", 80, "lean beef, grilled"), ("06_026", 10, "yaji (groundnut)"), ("11_003", 3, "oil")])
food("Kilishi", "1 small pack (30g)", 30, "keep", (120, 18, 6, 2), "Low", note="No good FAO match. Check the pack.")
food("Ponmo", "3 pieces", 90, "keep", (120, 20, 0, 4), "Low", note="Cow skin is not in FAO.")
food("Fried fish (titus / mackerel)", "1 piece", 128, "recipe", (250, 22, 3, 17), "High",
     recipe=[("09_025", 120, "mackerel"), ("11_010", 8, "frying oil")])
food("Grilled croaker", "1 medium fish", 200, "fao", (220, 35, 0, 8), "Medium", code="09_043",
     note="No croaker in FAO: grilled tilapia (another lean white fish) used.")
food("Boiled egg", "1 egg", 50, "fao", (78, 6, 1, 5), "High", code="08_002")
food("Fried egg", "1 egg", 50, "fao", (110, 6, 1, 9), "High", code="08_003")

# ---------- Snacks ----------
food("Puff-puff", "3 pieces", 75, "recipe", (300, 5, 40, 13), "Medium",
     recipe=[("01_043", 500, "flour"), ("13_002", 100, "sugar"), ("12_019", 350, "water"), ("11_010", 110, "oil taken up in frying")], cook=0.8)
food("Chin chin", "1 handful", 30, "recipe", (150, 2, 18, 8), "Medium",
     recipe=[("01_043", 500, "flour"), ("13_002", 120, "sugar"), ("11_029", 100, "margarine"), ("10_016", 80, "milk"), ("08_001", 50, "egg"),
             ("12_019", 100, "water"), ("11_010", 80, "oil taken up")], cook=0.75)
food("Meat pie", "1 pie", 130, "recipe", (380, 9, 38, 21), "Medium",
     recipe=[("01_043", 250, "flour"), ("11_029", 125, "margarine"), ("12_019", 60, "water"), ("07_134", 150, "minced beef"),
             ("02_068", 100, "potato"), ("04_018", 50, "onion")], cook=0.85)
food("Sausage roll", "1 roll", 70, "recipe", (200, 6, 20, 11), "Medium",
     recipe=[("01_043", 35, "flour"), ("11_029", 15, "margarine"), ("07_063", 20, "sausage")])
food("Doughnut", "1 doughnut", 70, "recipe", (300, 5, 35, 16), "Medium",
     recipe=[("01_043", 500, "flour"), ("13_002", 80, "sugar"), ("11_029", 50, "margarine"), ("08_001", 50, "egg"), ("10_002", 30, "milk powder"),
             ("12_019", 250, "water"), ("11_010", 100, "oil taken up")], cook=0.8)
food("Plantain chips", "1 small pack", 50, "keep", (260, 1, 30, 15), "Low", note="Brand snack: check the pack.")
food("Groundnuts", "1 handful", 30, "fao", (170, 7, 5, 14), "High", code="06_010")
food("Tiger nuts", "1 handful", 30, "fao", (140, 2, 14, 7), "High", code="02_026")
food("Biscuits", "3 cookies", 30, "fao", (140, 2, 20, 6), "High", code="01_188")

# ---------- Drinks ----------
food("Zobo", "1 glass, sweetened", 250, "recipe", (110, 0, 27, 0), "Medium",
     recipe=[("12_019", 225, "zobo (hibiscus water)"), ("13_002", 25, "sugar (5 tsp)")], note="Hibiscus itself adds almost nothing; the sugar does.")
food("Kunu", "1 glass", 250, "keep", (150, 2, 33, 1), "Low", note="No kunu in FAO. Depends on sugar.")
food("Malt drink", "1 can", 330, "keep", (230, 2, 55, 0), "Low", note="Brand drink: check the can (Maltina, Amstel Malta…).")
food("Soft drink (Coke, Fanta…)", "1 bottle (35cl)", 350, "fao", (150, 0, 39, 0), "High", code="12_024")
food("Orange juice", "1 glass", 250, "fao", (110, 2, 26, 0), "High", code="12_011", note="Fresh, unsweetened.")
food("Tea with milk & sugar", "1 cup", 245, "recipe", (80, 2, 12, 2), "High",
     recipe=[("12_008", 220, "tea"), ("10_016", 15, "evaporated milk"), ("13_002", 8, "sugar (2 tsp)")])
food("Milo with milk", "1 cup", 250, "keep", (180, 7, 25, 6), "Low", note="Brand: check the Milo tin.")
food("Beer", "1 bottle (60cl)", 600, "fao", (250, 2, 20, 0), "High", code="12_001", note="Lager, about 5% alcohol.")

# ---------- Fruit ----------
food("Banana", "1 medium", 120, "fao", (105, 1, 27, 0), "High", code="05_028")
food("Orange", "1 orange", 130, "fao", (62, 1, 15, 0), "High", code="05_016")
food("Mango", "1 medium", 200, "fao", (200, 3, 50, 1), "High", code="05_015")
food("Pineapple", "1 cup", 165, "fao", (82, 1, 22, 0), "High", code="05_018")
food("Watermelon", "2 cups", 300, "fao", (90, 2, 22, 0), "High", code="05_022")
food("Pawpaw (papaya)", "1 cup", 145, "fao", (60, 1, 15, 0), "High", code="05_017")
food("Apple", "1 apple", 180, "fao", (95, 0, 25, 0), "High", code="05_026")
food("Avocado", "½ avocado", 100, "fao", (160, 2, 9, 15), "High", code="05_002")
food("Garden egg", "3 garden eggs", 150, "fao", (40, 2, 9, 0), "High", code="04_074")
food("Agbalumo (African star apple)", "3 fruits", 90, "fao", (100, 1, 24, 0), "Medium", code="05_053", note="Edible flesh of 3 fruits ≈ 90 g.")

# ---------- Measures and packed foods ----------
food("Stew", "1 cooking spoon", 45, "recipe", (90, 1, 5, 8), "Medium", recipe=STEW, cook=0.6, note="Same pot as Tomato stew.")
food("White rice", "1 cooking spoon", 60, "fao", (80, 2, 18, 0), "High", code="01_135")
food("Jollof rice", "1 cooking spoon", 60, "recipe", (110, 2, 19, 3), "Medium", recipe=JOLLOF, cook=0.92)
food("Palm oil", "1 tablespoon", 14, "fao", (120, 0, 0, 14), "High", code="11_004")
food("Vegetable oil", "1 tablespoon", 14, "fao", (120, 0, 0, 14), "High", code="11_010")
food("Sugar", "1 teaspoon or 1 cube", 4, "fao", (16, 0, 4, 0), "High", code="13_002")
for nm, por, old in [("Nescafé 3-in-1", "1 sachet", (70, 1, 12, 2)), ("Barissimo 3-in-1", "1 sachet", (80, 1, 14, 2)),
                     ("Milo", "1 sachet (20 g), with water", (80, 2, 14, 2)), ("Gala sausage roll", "1 roll", (220, 6, 22, 12)),
                     ("Hollandia yoghurt", "1 bottle (315 ml)", (285, 9, 45, 7)), ("Golden Morn with milk", "1 bowl", (220, 7, 36, 5))]:
    food(nm, por, None, "keep", old, "Pack", note="Brand: numbers from the pack label (to confirm).")
food("Peak milk powder", "1 sachet (about 14 g)", 14, "fao", (70, 4, 5, 4), "High", code="10_002")
food("Evaporated milk (Peak)", "2 tablespoons", 30, "fao", (40, 2, 3, 2), "High", code="10_016")
food("Chi Exotic juice", "1 glass", 250, "fao", (120, 0, 30, 0), "Medium", code="12_012", note="FAO sweetened juice drink.")
food("Cornflakes with milk", "1 bowl", 155, "recipe", (200, 6, 36, 3), "High",
     recipe=[("01_182", 30, "cornflakes"), ("10_001", 125, "whole milk")])
food("Sliced bread", "2 slices", 50, "fao", (160, 5, 30, 2), "High", code="01_046")


def compute(f):
    m = f["method"]
    if m == "keep":
        k, p, c, fat = f["old"]
        return dict(kcal=k, protein=p, carbs=c, fat=fat), "Current app numbers kept", ""
    g = f["grams"]
    if m == "fao":
        x = D[f["code"]]
        return n(f["code"], g), f"FAO {f['code']}: {x['name']}", ""
    if m == "dough":
        x = D[f["flour"]]
        share = (100 - f["water"]) / (100 - (x["water"] or 0))
        return n(f["flour"], g * share), f"FAO {f['flour']}: {x['name']}", f"{round(share*100)}% flour by weight ({f['water']}% water in the dough)"
    # recipe
    parts = [n(c, gr) for c, gr, _ in f["recipe"]]
    total_g = sum(gr for _, gr, _ in f["recipe"]) * f.get("cook", 1)
    tot = add(*parts)
    per100 = scale(tot, 100 / total_g)
    src = "Recipe from FAO ingredients: " + "; ".join(f"{gr} g {lbl} ({c})" for c, gr, lbl in f["recipe"])
    how = f"Pot of {round(total_g)} g{' after cooking down' if f.get('cook', 1) != 1 else ''}"
    return scale(per100, g / 100), src, how


rows = []
for f in FOODS:
    v, src, how = compute(f)
    new = {k: round(v[k]) for k in KEYS}
    oldk = f["old"][0]
    rows.append(dict(name=f["name"], portion=f["portion"], grams=f["grams"], method=f["method"], conf=f["conf"],
                     old_kcal=oldk, old_protein=f["old"][1], old_carbs=f["old"][2], old_fat=f["old"][3],
                     **new, change=round((new["kcal"] - oldk) / oldk * 100) if oldk else 0,
                     source=src, how=how, note=f.get("note", ""),
                     recipe=[(c, gr, lbl, D[c]["name"]) for c, gr, lbl in f.get("recipe", [])], cook=f.get("cook", 1)))
json.dump(rows, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print(len(rows), "foods")
for r in sorted(rows, key=lambda r: -abs(r["change"])):
    print(f"{r['name'][:30]:30} {r['portion'][:22]:22} {str(r['grams']):>4} g  {r['old_kcal']:>4} → {r['kcal']:>4}  ({r['change']:+}%)  P{r['protein']} C{r['carbs']} F{r['fat']}  [{r['method']}, {r['conf']}]")
