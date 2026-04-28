# Finances Publiques · France

Site statique de visualisation des données financières de l'État français.

## 🚀 Déploiement sur GitHub Pages

### Méthode rapide

1. **Fork / clone** ce dépôt
2. Aller dans **Settings → Pages**
3. Source : **Deploy from a branch** → `main` → `/ (root)`
4. Le site sera accessible à `https://[votre-user].github.io/[repo-name]/`

### Structure du projet

```
finances-france/
├── index.html          # Page unique (SPA)
├── styles.css          # Design monochrome
├── script.js           # Logique + Chart.js
├── data/
│   ├── budget.json     # Dépenses, solde budgétaire
│   ├── dette.json      # Dette publique, charge d'intérêts
│   ├── recettes.json   # Recettes fiscales (TVA, IR, IS...)
│   ├── deficit.json    # Déficit public
│   └── macro.json      # PIB, croissance, prélèvements obligatoires
└── README.md
```

## 📊 Sources des données

| Fichier | Données | Source |
|---------|---------|--------|
| `budget.json` | Dépenses totales, missions, solde | Direction du Budget, PLF 2024 |
| `dette.json` | Dette/PIB, charge d'intérêts, comparaison UE | INSEE, Eurostat, Banque de France |
| `recettes.json` | TVA, IR, IS, prélèvements obligatoires | DGFiP, PLF 2024 |
| `deficit.json` | Déficit/PIB, comparaison UE | INSEE, Cour des Comptes |
| `macro.json` | PIB, croissance, dépenses/PIB | INSEE, Banque de France, FMI |

Couverture temporelle : **2019–2024**

## 🔄 Mettre à jour les données

Les données sont embarquées dans les fichiers JSON du dossier `data/`. Pour les mettre à jour :

1. Ouvrir le fichier JSON concerné
2. Ajouter une entrée dans le tableau `serie` : `{ "annee": 2025, "valeur": XXX }`
3. Committer et pousser → GitHub Pages se met à jour automatiquement

## ⚙️ Technique

- 100% statique : HTML / CSS / JS vanilla
- Graphiques : [Chart.js 4.4](https://www.chartjs.org/)
- Typographie : Google Fonts (Playfair Display + DM Mono + DM Sans)
- Aucun backend, aucune collecte de données, aucun cookie
- Compatible tous navigateurs modernes

## 📝 Licence

Données issues de sources publiques officielles. Code sous licence MIT.
