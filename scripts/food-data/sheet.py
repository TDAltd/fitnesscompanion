import json, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
rows = json.load(open(sys.argv[1]))
wb = Workbook()
HEAD = PatternFill("solid", fgColor="2E7D6B"); HF = Font(bold=True, color="FFFFFF")
UP = PatternFill("solid", fgColor="FDE2D6"); DOWN = PatternFill("solid", fgColor="DDF0E8"); CHECK = PatternFill("solid", fgColor="FFF7D6")
thin = Border(bottom=Side(style="thin", color="DDDDDD"))
METHOD = {"fao": "FAO food", "recipe": "FAO recipe", "dough": "FAO flour + water", "keep": "Not in FAO (kept)"}

def header(ws, cols, widths):
    ws.append(cols)
    for i, w in enumerate(widths, 1):
        c = ws.cell(row=1, column=i); c.fill = HEAD; c.font = HF; c.alignment = Alignment(wrap_text=True, vertical="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[1].height = 36; ws.freeze_panes = "B2"

ws = wb.active; ws.title = "Food list"
cols = ["Food", "Portion", "Grams (assumed)", "Now: kcal", "FAO: kcal", "Change", "FAO: protein g", "FAO: carbs g", "FAO: fat g",
        "Now: protein g", "Now: carbs g", "Now: fat g", "Method", "Confidence", "Source (FAO 2019 codes)", "How", "Note",
        "Dietitian: OK? (Yes / change)", "Dietitian: grams", "Dietitian: kcal", "Dietitian: protein", "Dietitian: carbs", "Dietitian: fat", "Dietitian: notes"]
header(ws, cols, [28, 22, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 16, 11, 60, 30, 50, 14, 10, 10, 10, 10, 10, 30])
for r in sorted(rows, key=lambda r: -abs(r["change"])):
    ws.append([r["name"], r["portion"], r["grams"], r["old_kcal"], r["kcal"], r["change"] / 100, r["protein"], r["carbs"], r["fat"],
               r["old_protein"], r["old_carbs"], r["old_fat"], METHOD[r["method"]], r["conf"], r["source"], r["how"], r["note"]])
    i = ws.max_row
    ws.cell(row=i, column=6).number_format = "+0%;-0%;0%"
    if r["change"] >= 20: ws.cell(row=i, column=6).fill = UP
    elif r["change"] <= -20: ws.cell(row=i, column=6).fill = DOWN
    for c in range(18, 25): ws.cell(row=i, column=c).fill = CHECK
    for c in range(1, 25):
        ws.cell(row=i, column=c).alignment = Alignment(wrap_text=c in (15, 16, 17, 24), vertical="top"); ws.cell(row=i, column=c).border = thin
ws.auto_filter.ref = f"A1:X{ws.max_row}"

rs = wb.create_sheet("Recipes")
header(rs, ["Dish", "Ingredient (as in the finished dish)", "Grams", "FAO code", "FAO food", "Cooked down to"], [28, 40, 9, 10, 70, 14])
seen = set()
for r in rows:
    if not r["recipe"] or r["name"] in seen: continue
    seen.add(r["name"])
    for j, (code, g, lbl, fao) in enumerate(r["recipe"]):
        rs.append([r["name"] if j == 0 else "", lbl, g, code, fao, (f"{round(r['cook']*100)}% of weight" if r["cook"] != 1 else "") if j == 0 else ""])
        rs.cell(row=rs.max_row, column=1).font = Font(bold=True)
    rs.append([])

ab = wb.create_sheet("How to use")
ab.column_dimensions["A"].width = 110
for line in [
    ("Fitness Companion food list: FAO review", True),
    ("Source: FAO/INFOODS Food Composition Table for Western Africa (2019), values per 100 g edible portion (sheet 03). https://www.fao.org/infoods/infoods/tables-and-databases/faoinfoods-databases", False),
    ("", False),
    ("What each method means", True),
    ("FAO food: one FAO entry × the portion's grams. Most reliable.", False),
    ("FAO recipe: Nigerian dishes aren't in FAO, so they're worked out from a standard recipe using FAO values for each ingredient (FAO's own method). See the Recipes sheet. The oil in the pot drives most of the result.", False),
    ("FAO flour + water: swallows made from flour (eba, amala, semo, oat swallow) at an assumed water content in the dough.", False),
    ("Not in FAO (kept): brands (check the pack) and foods FAO doesn't have (ponmo, kilishi, kunu). Current app numbers kept until checked.", False),
    ("", False),
    ("For the dietitian", True),
    ("1. Check the grams for each portion (column C). These are assumptions, e.g. 1 medium wrap of swallow = 250 g, 1 ladle of soup = 150 g, 1 cup of rice = 180 g.", False),
    ("2. Check each recipe on the Recipes sheet, especially the oil.", False),
    ("3. In the yellow columns, write Yes if a row is right, or put the corrected grams / numbers. Then send the file back to be imported.", False),
    ("Confidence: High = direct FAO match. Medium = recipe or close substitute. Low = rough; needs checking first.", False),
]:
    ab.append([line[0]]); c = ab.cell(row=ab.max_row, column=1); c.alignment = Alignment(wrap_text=True); c.font = Font(bold=line[1], size=13 if line[1] else 11)
wb.move_sheet("How to use", offset=-2)
wb.active = 1
wb.save(sys.argv[2]); print("saved")
