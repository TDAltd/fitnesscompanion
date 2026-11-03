# Food values from FAO (WAFCT 2019)

How the numbers in `artifacts/fitness-app/src/lib/foods.ts` were made.

Source: FAO/INFOODS Food Composition Table for Western Africa (2019), © FAO.
Free for non-commercial use with acknowledgement; commercial use needs a licence
(www.fao.org/contact-us/licence-request or copyright@fao.org). The spreadsheet itself
is not in this repo: download `WAFCT_2019.xlsx` from FAO.

    python3 extract.py WAFCT_2019.xlsx wafct.json      # FAO sheet 03 → JSON (per 100 g edible portion)
    python3 calc.py wafct.json foods-fao.json          # each app food: FAO food, FAO recipe, flour + water, or kept
    python3 sheet.py foods-fao.json review.xlsx        # review spreadsheet for the dietitian

Portion grams and recipes (especially oil) are assumptions in `calc.py`, to be checked by a dietitian.
