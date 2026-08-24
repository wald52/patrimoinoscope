# Données HATVP — constats du 24/08/2026

## Ce qui a été téléchargé

```
data/raw/liste.csv              3 389 814 bytes  (21/08/2026)
data/raw/declarations.xml      88 800 651 bytes  (21/08/2026)  6608 déclarations
data/raw/opendata-structure.xlsx   24 178 bytes
data/raw/notice-open-data.pdf     247 133 bytes
```

## Répartition réelle dans declarations.xml

Parsing `lxml iterparse` :

- `DI`  : 4468 (Déclaration d'intérêts)
- `DIA` : 2065 (Modificative intérêts)
- `DSP` :   64 (Situation patrimoniale)
- `DSPFM` : 11

Total DSP collectées : **75** → appariement entrée/sortie possible : **3 paires** seulement (même hash + même mandat, durée ≥0.5 an).

## Conséquence

L'open data XML de la HATVP ne contient **pas** toutes les DSP. La HATVP publie la plupart des patrimoines en **PDF** sur `hatvp.fr/consulter-les-declarations/` (accès page HTML, pas XML). La colonne `open_data` de `liste.csv` est vide pour la majorité des DSP.

> Notre pipeline actuel : si `N_paires < 10`, on publie un **mock déterministe** (seed 42) enrichi, avec `kpis.json:mode=mock` et `n_paires_reel=3` pour rester honnête. Le site affiche le mock tout en documentant la limite.

## Pistes pour couvrir "toutes les personnes" (V2)

1. **Parser les PDF DSP** : `liste.csv:col nom_fichier` → télécharger `https://www.hatvp.fr/pages_nominatives/...pdf`, parser avec `pdfplumber` + LLM extraction (coûteux, 3k PDFs).
2. **Scraper HATVP avec `hatvp.fr/livraison/opendata/liste.csv:open_data`** : suivre `url_dossier` pour récupérer les XML individuels (certains DSP ont un XML individuel même si absent du merge).
3. **Crowdsourcer avec data.gouv.fr** : dataset miroir HATVP peut contenir plus de DSP.

En V1, on assume la transparence : hero indique `N=184 (mock, réel=3)` via `kpis.json`. Le code est prêt pour brancher le vrai parser PDF dès que tu veux.

## Vérification anonymisation

```bash
python scripts/build_data.py
grep -r "Baptiste" data/*.json  # doit être vide
# cohorts_sample.json ne contient que anon_*, tranche_age, type_mandat
```
