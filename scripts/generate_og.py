#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import json, pathlib
BASE = pathlib.Path(__file__).resolve().parent.parent
kpis = json.loads((BASE / "data" / "kpis.json").read_text(encoding="utf-8"))
W,H = 1200,630
img = Image.new("RGB", (W,H), "#FFFBF7")
draw = ImageDraw.Draw(img)
# barre
draw.rectangle([0,0,W,12], fill="#000091")
# try fonts
try:
    # try DejaVu
    f_title = ImageFont.truetype("DejaVuSans-Bold.ttf", 54)
    f_sub = ImageFont.truetype("DejaVuSans.ttf", 22)
    f_kpi = ImageFont.truetype("DejaVuSans-Bold.ttf", 44)
    f_small = ImageFont.truetype("DejaVuSans.ttf", 20)
    f_top = ImageFont.truetype("DejaVuSans-Bold.ttf", 32)
except:
    f_title = ImageFont.load_default()
    f_sub = f_kpi = f_small = f_top = f_title
def fmt_eur(n): return f"{n:,.0f} €".replace(",", " ")
def fmt_pct(n): return f"{'+' if n>0 else ''}{n:.1f}%".replace(".", ",")
draw.text((60,60), "Patrimoinoscope", fill="#1a1a2e", font=f_title)
draw.text((60,115), "Ce qui augmente vraiment pendant un mandat — HATVP", fill="#6b6b7a", font=f_sub)
draw.text((60,210), f"{fmt_pct(kpis['delta_net_pct'])} en {kpis['duree_moyenne_annees']} ans", fill="#000091", font=f_kpi)
draw.text((60,270), f"Patrimoine net : {fmt_eur(kpis['entree_net_moyen'])} → {fmt_eur(kpis['sortie_net_moyen'])}", fill="#1a1a2e", font=f_small)
draw.text((60,320), f"Top : {kpis['top_categorie']} {fmt_eur(kpis['top_categorie_delta'])}", fill="#0a7d48", font=f_top)
draw.text((60,380), f"Source : HATVP open data · {kpis['n_paires']} paires · Licence Ouverte 2.0", fill="#6b6b7a", font=f_small)
draw.text((60,580), "wald52.github.io/patrimoinoscope", fill="#000091", font=f_small)
draw.rectangle([1050,560,1140,570], fill="#E1000F")
out = BASE / "assets" / "og-image.png"
out.parent.mkdir(parents=True, exist_ok=True)
img.save(out, "PNG")
print(f"OG saved {out} {out.stat().st_size} bytes")
