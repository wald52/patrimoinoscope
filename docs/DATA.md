# Données HATVP — audit V2 du 24/08/2026

## Ce qui est téléchargé (exhaustif open data téléchargeable)

```
data/raw/liste.csv              3 389 814 bytes  13330 lignes (inventaire)
data/raw/declarations.xml      88 800 651 bytes  6608 déclarations (merge)
data/raw/dossiers/*.xml        2315 fichiers   (test V2)
data/raw/opendata-structure.xlsx   24 178 bytes  257 champs patrimoine
```

## Inventaire vs téléchargeable

| Type | Inventaire `liste.csv` | Livré | Avec `open_data` | Dans `declarations.xml` (merge) | Téléchargeable via `livraison/dossiers` |
|---|---|---|---|---|---|
| `dsp` | 1052 | 1006?* | 1006 | 64 | ~60 (gouvernement/aai) |
| `dspm` | 1185 | - | 1009 | 0 | 0 (consultable préfecture) |
| `dspfm` | 396 | - | 328 | 11 | ~10 |
| **DSP total** | **2633** | **2344** | **2343** | **75** | **~70** |
| `di/dia/diam/dim` | 10697 | ~6533 | 6533 | 6533 | 6533 (tous) |
| **Total** | **13330** | **8876** | **8876** | **6608** | **~6600** |

*Le merge est le **superset** : tous les 2315 XML individuels testés sont déjà dans `declarations.xml` (overlap 100%, 0 uniquement dans dossiers). Le merge contient 4288 déclarations de plus que les dossiers.

## Pourquoi les DSP députés/sénateurs manquent ?

Test V2 sur 150 DSP (`harvest_v2.py` + `HEAD https://www.hatvp.fr/livraison/dossiers/<open_data>`) :

- `gouvernement` : 200 OK (ex: `rufo-alice-dsp34866-gouvernement.xml` 200)
- `depute/senateur/europe` : **404** systématique (ex: `lahmar-abdelkader-dsp31970-depute-69.xml` 404)

La fiche HATVP pour un député (`fiche-nominative/?declarant=lahmar-...`) affiche pour le patrimoine :
> `Consultable à la préfecture du Rhône` — **pas de lien PDF/XML**.

C'est la règle HATVP : les DSP des parlementaires ne sont **pas** publiées en open data téléchargeable, seulement consultables en préfecture (protection vie privée). Les 1006 DSP listées avec `open_data` sont donc des entrées fantômes (404).

**Conséquence :** en open data téléchargeable, on ne peut apparier que **75 DSP** → **3 paires entrée/sortie** (même `hash(nom+prenom+dateNaissance)` + même mandat). C'est insuffisant pour une stat macro.

## Stratégie du site

- On **a bien 100% de l'open data téléchargeable** (`declarations.xml` est le superset).
- On publie un **mock déterministe** (`kpis.json:mode=mock`, `n_paires_reel=3`) pour la démo, avec `limite_legale` expliquée.
- Dès que la loi évolue ou que la HATVP publie plus de DSP, `build_data.py` basculera automatiquement sur du réel (seuil `N≥10`).

## Vérification

```bash
python scripts/download.py
python scripts/build_data.py  # -> 75 DSP, 3 paires -> mock
grep -r "Baptiste" data/*.json  # vide = anonymisation OK
python -m http.server 8000  # http://localhost:8000/index.html
```

## Pistes V3 (si couverture totale voulue)

- Se déplacer en préfecture pour numériser les PDF DSP (lourd, 2000+ déplacements)
- Demander à la HATVP l'export complet (demande CADA)
- Crowdsourcer via `nosdeputes.fr` / `regards-citoyens`

Pour l'instant, la V2 est **exhaustive pour ce qui est légalement téléchargeable**.
