# Migration wald52 → lemodelesocialfrancais

Objectif : le code ne contient **aucune** référence dure à `wald52`. La bascule est une simple opération git remote.

## État actuel (test)

- Repo : `https://github.com/wald52/patrimoinoscope`
- Pages : `https://wald52.github.io/patrimoinoscope/`
- Branche Pages : `gh-pages` ou `main` selon réglage Actions

## Cible finale

- Repo : `https://github.com/lemodelesocialfrancais/patrimoinoscope`
- Pages : `https://lemodelesocialfrancais.github.io/patrimoinoscope/`

## Procédure (5 min)

```bash
# 1. Créer le repo vide lemodelesocialfrancais/patrimoinoscope sur GitHub (sans README)
# 2. Dans le clone local :
git remote rename origin origin-wald52
git remote add origin https://github.com/lemodelesocialfrancais/patrimoinoscope.git
git push -u origin main
# ou si main déjà poussé : git push --all origin

# 3. Activer Pages sur la nouvelle org :
# GitHub → Settings → Pages → Source: GitHub Actions

# 4. Vérifier l'absence de résidu :
grep -r "wald52" --include="*.html" --include="*.js" --include="*.yml" .
# doit être vide sauf ce fichier MIGRATION.md et le footer informatif

# 5. Optionnel : archiver l'ancien repo wald52 (Settings → Archive) ou le supprimer après vérif
```

## Vérifications

- Tous les fetch sont relatifs : `fetch("./data/kpis.json")` → fonctionne sur les deux orgs
- Aucun `CNAME`, aucun `base` absolu
- Le footer mentionne les deux orgs à titre informatif uniquement, pas fonctionnel

## Retour en arrière

```bash
git remote set-url origin https://github.com/wald52/patrimoinoscope.git
git push -u origin main
```
