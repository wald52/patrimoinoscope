# Patrimoinoscope

**Ce qui augmente vraiment dans le patrimoine des élus — entre le début et la fin du mandat.**

Observatoire citoyen, agrégé et anonymisé, à partir de l'open data HATVP. Aucun nom publié, seulement des moyennes macro.

- Source : [hatvp.fr/open-data](https://www.hatvp.fr/open-data/) — `liste.csv` + `declarations.xml` — Licence Ouverte 2.0 Etalab
- Hébergement : GitHub Pages, site statique vanilla (HTML/CSS/JS + Chart.js CDN)
- Maintenable : 1 fichier `index.html`, 1 `style.css`, 1 `app.js`, 4 JSON

## Aperçu local

```bash
python scripts/build_data.py   # génère data/*.json (mock si pas de XML)
python -m http.server 8000
# ouvrir http://localhost:8000/index.html
```

## Données

```bash
pip install -r requirements.txt
python scripts/download.py          # télécharge data/raw/* (88 Mo)
python scripts/build_data.py        # génère data/kpis.json etc. (anonymisé)
```

Le pipeline :
- parse `declarations.xml` avec `lxml` iterparse (faible RAM)
- normalise 6 catégories : Immobilier, Bourse, Assurance-vie, Épargne, Véhicules, Autres
- apparie entrée/sortie par `hash(nom+prenom+dateNaissance)` + même mandat
- publie seulement agrégats si `N≥10` + 20 profils `anon_*`

## Déploiement

- Branche `main` → GitHub Actions `deploy.yml` → Pages
- Test : `wald52/patrimoinoscope` (temporaire)
- Prod : `lemodelesocialfrancais/patrimoinoscope` — voir `docs/MIGRATION.md`

Aucune référence dure à l'org dans le code (chemins relatifs).

## Structure

```
index.html
site/style.css
site/app.js
site/config.js
data/kpis.json
data/by_category.json
data/by_mandat.json
data/cohorts_sample.json
scripts/download.py
scripts/build_data.py
```

## Licence

Code MIT, données HATVP Licence Ouverte 2.0.
