import openpyxl, json, re, sys
wb=openpyxl.load_workbook(sys.argv[1],read_only=True,data_only=True)
ws=wb['03 NV_sum_39 (per 100g EP)']
out=[]; group=None
num=lambda v: None if v in (None,'','-') else float(re.sub(r'[\[\]\s]','',str(v)) or 'nan') if re.match(r'^\[?\s*-?[\d.]+\s*\]?$',str(v).strip()) else None
for i,r in enumerate(ws.iter_rows(values_only=True)):
    if i<3: continue
    code=r[0]
    if code and not r[1]: group=code.split('/')[0]; continue
    if not code or not r[1]: continue
    out.append(dict(code=code,name=r[1],group=group,kcal=num(r[7]),protein=num(r[9]),fat=num(r[10]),carbs=num(r[11]),fibre=num(r[12]),water=num(r[8]),source=r[4]))
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
print(len(out)); 
from collections import Counter; print(Counter(o['group'] for o in out))
