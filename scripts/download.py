#!/usr/bin/env python3
"""
Télécharge les open data HATVP de façon reproductible.
- liste.csv (3 MB)
- declarations.xml (88 MB)
- opendata-structure.xlsx (schéma)

Usage:
  python scripts/download.py
  python scripts/download.py --force
"""
import argparse
import hashlib
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
import requests

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

URLS = {
    "liste.csv": "https://www.hatvp.fr/livraison/opendata/liste.csv",
    "declarations.xml": "https://www.hatvp.fr/livraison/merge/declarations.xml",
    "opendata-structure.xlsx": "https://www.hatvp.fr/wordpress/wp-content/uploads/2017/07/opendata-structure.xlsx",
    "notice-open-data.pdf": "https://www.hatvp.fr/wordpress/wp-content/uploads/2017/07/notice-open-data.pdf",
}

def download_one(name: str, url: str, force: bool = False):
    dest = RAW_DIR / name
    # If exists and not forced, check Last-Modified via HEAD
    headers = {}
    if dest.exists() and not force:
        mtime = datetime.fromtimestamp(dest.stat().st_mtime, tz=timezone.utc)
        headers["If-Modified-Since"] = mtime.strftime("%a, %d %b %Y %H:%M:%S GMT")
    print(f"[download] {name} <- {url}")
    try:
        resp = requests.get(url, headers=headers, stream=True, timeout=60)
        if resp.status_code == 304:
            print(f"  -> 304 Not Modified, on garde {dest} ({dest.stat().st_size} bytes)")
            return dest
        resp.raise_for_status()
        # write to temp then rename
        tmp = dest.with_suffix(dest.suffix + ".tmp")
        total = 0
        h = hashlib.sha256()
        with open(tmp, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    h.update(chunk)
                    total += len(chunk)
        tmp.replace(dest)
        # try to set mtime from Last-Modified
        lm = resp.headers.get("Last-Modified")
        if lm:
            print(f"  -> Last-Modified: {lm}")
        print(f"  -> OK {total} bytes sha256={h.hexdigest()[:12]}...")
        return dest
    except Exception as e:
        print(f"  -> ERREUR: {e}", file=sys.stderr)
        if dest.exists():
            print(f"  -> on garde l'ancien fichier {dest}")
            return dest
        raise

def main():
    parser = argparse.ArgumentParser(description="Télécharge les open data HATVP")
    parser.add_argument("--force", action="store_true", help="Force re-download")
    args = parser.parse_args()

    print(f"Destination: {RAW_DIR}")
    for name, url in URLS.items():
        # xlsx/pdf optionnels : ne pas planter si 404
        try:
            download_one(name, url, force=args.force)
        except Exception as e:
            print(f"  -> skip {name}: {e}", file=sys.stderr)

    # résumé
    print("\n[résumé]")
    for p in RAW_DIR.iterdir():
        if p.is_file():
            size = p.stat().st_size
            mtime = datetime.fromtimestamp(p.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
            print(f"  {p.name:30} {size:>12} bytes  {mtime}")

if __name__ == "__main__":
    main()
