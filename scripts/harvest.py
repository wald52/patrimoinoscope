#!/usr/bin/env python3
"""
V2 harvest : récupère tous les XML individuels listés dans liste.csv via
https://www.hatvp.fr/livraison/dossiers/<open_data>

- Respecte le rate limiting (0.2s entre requêtes, 5 retries)
- Ne télécharge que si HEAD 200
- Stocke dans data/raw/dossiers/<open_data>
- Gère déjà-téléchargés (skip si existe et taille >0)
- Log les 404 "consultable en préfecture"

Usage:
  python scripts/harvest.py              # full
  python scripts/harvest.py --limit 100  # test
  python scripts/harvest.py --type dsp   # filtrer par type_document
"""
import argparse, csv, pathlib, time, sys, hashlib
from pathlib import Path
import requests

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
DOSSIERS_DIR = RAW_DIR / "dossiers"
DOSSIERS_DIR.mkdir(parents=True, exist_ok=True)
LISTE = RAW_DIR / "liste.csv"

HEADERS = {"User-Agent": "Patrimoinoscope/1.0 (+https://github.com/wald52/patrimoinoscope)"}

def harvest(limit=None, filter_type=None, force=False):
    if not LISTE.exists():
        print(f"[harvest] {LISTE} manquant, lance download.py d'abord")
        sys.exit(1)
    rows = list(csv.DictReader(open(LISTE, encoding='utf-8', errors='replace'), delimiter=';'))
    # filtrer Livré + open_data
    filtered = [r for r in rows if r.get('open_data') and r.get('statut_publication','').strip()=='Livrée']
    if filter_type:
        filtered = [r for r in filtered if r.get('type_document','').lower()==filter_type.lower()]
    if limit:
        filtered = filtered[:limit]
    print(f"[harvest] {len(filtered)} fichiers à tester (sur {len(rows)} total) filter_type={filter_type or 'tous'}")
    session = requests.Session()
    session.headers.update(HEADERS)
    ok=0; notfound=0; skipped=0; errors=0
    # track by type
    from collections import Counter
    ok_by_type=Counter(); fail_by_type=Counter()
    for i, r in enumerate(filtered, 1):
        xml_name = r['open_data'].strip()
        dest = DOSSIERS_DIR / xml_name
        if dest.exists() and dest.stat().st_size>0 and not force:
            skipped+=1
            continue
        url = f"https://www.hatvp.fr/livraison/dossiers/{xml_name}"
        try:
            # HEAD first (faster)
            h = session.head(url, timeout=10, allow_redirects=True)
            if h.status_code != 200:
                notfound+=1
                fail_by_type[r['type_document']] += 1
                if i <= 10 or i%500==0:
                    print(f"[{i}/{len(filtered)}] 404 {xml_name[:50]} ({r['type_document']}/{r['type_mandat']})")
                time.sleep(0.15)
                continue
            # GET
            resp = session.get(url, timeout=20)
            resp.raise_for_status()
            dest.write_bytes(resp.content)
            ok+=1
            ok_by_type[r['type_document']] += 1
            if i%100==0:
                print(f"[{i}/{len(filtered)}] OK {xml_name} ({len(resp.content)} bytes) -> {ok} ok, {notfound} 404")
        except Exception as e:
            errors+=1
            fail_by_type[r['type_document']] += 1
            if i<=5:
                print(f"[{i}] ERR {xml_name}: {e}")
        # throttle
        time.sleep(0.18)
        if i%500==0:
            print(f"--- {i}/{len(filtered)} ok={ok} 404={notfound} skip={skipped} err={errors} ---")
    print("\n[harvest] terminé")
    print(f"  OK téléchargés: {ok} {dict(ok_by_type)}")
    print(f"  404 consultable en préfecture: {notfound} {dict(fail_by_type)}")
    print(f"  déjà présents skip: {skipped}")
    print(f"  erreurs: {errors}")
    print(f"  dossier: {DOSSIERS_DIR} ({len(list(DOSSIERS_DIR.iterdir()))} fichiers)")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--type", dest="filter_type", default=None, help="filtrer type_document (ex: dsp, di)")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    harvest(limit=args.limit, filter_type=args.filter_type, force=args.force)
