# MyElec — Phase 1

Outil personnel pour gérer et diagnostiquer l'installation électrique
de la maison (Toulouse, abonnement 18 kVA triphasé, 4 tableaux en cascade,
piscine, chaudière à pellets).

Cette phase 1 couvre la **gestion des tableaux et des disjoncteurs** :
visualisation, édition, identification physique des disjoncteurs encore
inconnus, historique horodaté de toutes les modifications.

## Stack

- React 19 + Vite 8 + TypeScript
- Tailwind CSS v4 (plugin Vite)
- Mini-serveur Express en parallèle de Vite (pour lire/écrire les JSON)
- Persistance dans `data/*.json` (versionné Git)
- Pas d'authentification (mono-utilisateur ou famille de confiance via Tailscale)

## Lancer l'app

```bash
npm install
npm run dev
```

Cela démarre en parallèle :

- Vite sur <http://localhost:5179>
- Le serveur de données Express sur <http://127.0.0.1:5180>

Le proxy Vite redirige `/api/*` vers le serveur Express. Sur iPad / iPhone
via Tailscale, ouvrir `http://<ip-du-mac-mini>:5179`.

Autres scripts :

- `npm run build` — build de production dans `dist/`
- `npm run preview` — preview du build
- `npm run lint` — ESLint

## Données

Tout est dans `data/` :

- `data/tableaux.json` — les 4 tableaux pré-remplis avec leurs rangées
  et disjoncteurs
- `data/modifications.json` — historique horodaté

Pour commiter une intervention :

```bash
git add data/ && git commit -m "intervention: <description>"
```

## Comment l'utiliser

### Vue d'ensemble (page d'accueil)

Liste les 4 tableaux sous forme de cartes : nom, emplacement, type
d'alimentation, nombre de rangées / disjoncteurs / disjoncteurs encore
à identifier, et lien parent → enfant si le tableau est alimenté depuis
un autre.

### Détail d'un tableau

- Une ligne par rangée, disjoncteurs alignés par position.
- Code couleur par phase : L1 ambre, L2 jaune, L3 bleu, TRI vert, inconnue
  gris.
- Différentiel de tête plus large et avec un contour épais.
- Clic sur un disjoncteur → panneau latéral d'édition (tous les champs,
  + champ libre `description de la modification` qui alimente l'historique).
- Boutons `+ Disjoncteur`, `+ Ajouter une rangée`, `Éditer le tableau`,
  `Supprimer` (avec confirmation si la rangée ou le tableau contient
  des éléments).

### Cartographie en cours

Pour identifier physiquement les disjoncteurs avec étiquette manuscrite
illisible, phase inconnue ou statut libre. Deux modes :

1. **Tableau** — liste filtrée, on clique `Identifier` pour ouvrir l'éditeur.
2. **Session pas-à-pas** — assistant guidé : pour chaque disjoncteur,
   on saisit l'étiquette / phase / statut / méthode du test, on enregistre
   et on passe au suivant. Chaque enregistrement crée une entrée historique
   horodatée (description : "Identification physique (cartographie)…").

### Historique

Liste antéchronologique de toutes les modifications, avec filtres
par type d'entité, tableau et période. Chaque entrée est cliquable
et renvoie vers l'entité concernée.

L'entrée initiale documente déjà la **bascule L1 → L3 du 22/05/2026**
sur `TI-LOCAL-PISCINE` (passage 12 kVA → 18 kVA, déplacement borne 2 → 4
en aval du Hager CDC 440F).

### Recherche globale

Champ en haut de l'app — cherche dans les étiquettes, IDs, notes et
appareils pilotés. Les résultats ouvrent directement la vue détail
correspondante avec le panneau d'édition pré-positionné.

### Données : export / import

Bouton `Données` dans le header :

- **Export** — télécharge un JSON complet (`myelec-export-<timestamp>.json`).
- **Import** — remplace la base courante après confirmation
  (utile pour restaurer ou copier entre instances).

### Mode sombre

Bouton `Sombre` / `Clair` dans le header (préférence sauvegardée dans
`localStorage`).

## Conventions de nommage

### Disjoncteurs

`[code-tableau]-[code-rangée]-[code-départ]`

Exemples : `TP-R2-LV`, `TP-R3-PLAQUE`, `TI-LOCAL-PISCINE`,
`TLP-R1-FILTRATION`.

Codes tableau pré-existants :

- `TP` — Tableau Principal
- `TSG` — Tableau Secondaire Garage
- `TI` — Tableau Intermédiaire (Chaufferie)
- `TLP` — Tableau Local Piscine

## Structure du projet

```
.
├── data/                     # JSON persistés (commit git par l'utilisateur)
│   ├── tableaux.json
│   └── modifications.json
├── server.js                 # Mini API Express
├── vite.config.ts            # Vite + proxy /api
├── src/
│   ├── types/electrical.ts   # Tableau / Rangee / Disjoncteur / Modification
│   ├── services/
│   │   ├── storage.ts        # fetch /api/*
│   │   └── historique.ts     # diff et entrées de modification
│   ├── hooks/
│   │   ├── useTableaux.ts    # état central + CRUD avec auto-historique
│   │   └── useSearch.ts
│   ├── utils/phaseStyle.ts   # palette par phase
│   ├── components/
│   │   ├── TableauList.tsx
│   │   ├── TableauDetail.tsx
│   │   ├── RangeeView.tsx
│   │   ├── DisjoncteurCard.tsx
│   │   ├── DisjoncteurEditor.tsx
│   │   ├── RangeeEditor.tsx
│   │   ├── TableauEditor.tsx
│   │   ├── SidePanel.tsx
│   │   ├── HistoriqueView.tsx
│   │   ├── CartographieEnCours.tsx
│   │   ├── SearchBar.tsx
│   │   └── ExportImport.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
└── index.html
```

## Sécurité et accès

- Pas d'authentification : l'API Express n'est exposée que sur
  `127.0.0.1:5180`, le proxy Vite la rend accessible via `/api/*` à
  partir du frontend.
- L'accès distant se fait via Tailscale sur l'IP du Mac mini qui sert
  l'app (privée par défaut).
- **Ne pas exposer Vite/Express sur Internet en l'état**.

## Phases suivantes (rappel)

- Phase 2 — Gestion du réseau électrique (lignes physiques, end-points
  dans les pièces, volets, appareils fixes).
- Phases ultérieures — diagnostic en cas de disjonction, simulation
  de modifications, historique des incidents.
