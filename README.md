# MyElec — Phases 1 & 2

Outil personnel pour gérer et diagnostiquer l'installation électrique
de la maison (Toulouse, abonnement 18 kVA triphasé, 4 tableaux en cascade,
piscine, chaudière à pellets).

- **Phase 1** — Tableaux, rangées, disjoncteurs : la base de référence
  côté amont, avec historique horodaté de toutes les modifications.
- **Phase 2** — Réseau électrique en aval des disjoncteurs : pièces de
  la maison, lignes électriques, end-points (prises, points lumineux,
  interrupteurs…), volets motorisés et appareils fixes. Cartographie
  cross-référencée Phase 1 ↔ Phase 2 (la fiche d'un disjoncteur affiche
  ce qu'il dessert).

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
- `npm run icons` — régénère l'apple-touch-icon depuis `src/assets/icon.svg`

## Données

Tout est dans `data/` (versionné Git) :

- `data/tableaux.json` — Phase 1 : les 4 tableaux pré-remplis avec leurs
  rangées et disjoncteurs
- `data/pieces.json` — Phase 2 : les 29 pièces de la maison
- `data/lignes.json` — Phase 2 : lignes électriques (vide au départ)
- `data/endpoints.json` — Phase 2 : end-points (vide au départ)
- `data/volets.json` — Phase 2 : volets / stores (vide au départ)
- `data/appareils_fixes.json` — Phase 2 : appareils fixes connus
  pré-remplis (LV, four, plaque, frigo, LL, chaudière ÖkoFEN, pompe
  filtration, PAC piscine, compresseur, VMC, alarme, box)
- `data/modifications.json` — historique horodaté, commun aux 2 phases

Pour commiter une intervention :

```bash
git add data/ && git commit -m "intervention: <description>"
```

L'API Express expose :

- `GET /api/<ressource>` — récupère la liste
- `PUT /api/<ressource>` — remplace la liste
- `POST /api/modifications` — append d'une entrée d'historique

Ressources : `tableaux`, `pieces`, `lignes`, `endpoints`, `volets`,
`appareils-fixes`, `modifications`.

## Comment l'utiliser

### Tableaux (Phase 1)

Vue d'ensemble : les 4 tableaux en cartes (nom, emplacement, type, nombre
de rangées / disjoncteurs / disjoncteurs à identifier, lien parent → enfant).
Cliquer ouvre le détail avec une grille rangée × position, code couleur par
phase (L1 ambre, L2 jaune, L3 bleu, TRI vert, inconnue gris), différentiels
de tête plus larges. Clic sur un disjoncteur → panneau d'édition latéral.

Sur la fiche d'un disjoncteur, un bloc **« Cartographie aval »** affiche
en temps réel les lignes qui en partent, les end-points desservis et les
appareils alimentés (direct ou via prise) — c'est le cross-ref Phase 1 ↔ 2.

### Pièces (Phase 2)

29 pièces groupées par niveau (Rez de jardin / Sous-sol / Extérieur /
Transversal). Chaque carte affiche les compteurs (end-points, volets,
appareils) et des chips par type (PC, PD, PL, IN, BT, RJ45, TV).
La vue détail d'une pièce regroupe les éléments par section : Prises,
Éclairage, Commandes, Réseau & TV, Autres, Volets & stores, Appareils
fixes. Boutons « + Ajouter » sur chaque section.

### Lignes électriques (Phase 2)

Les lignes sont groupées par tableau d'origine. Chaque ligne affiche
son disjoncteur source (cliquable → fiche disjoncteur Phase 1), badge
phase, calibre, section du câble, nombre d'end-points / appareils, et
liste des pièces traversées (déduit des end-points rattachés). Filtre
par phase en haut de la page. La vue détail d'une ligne affiche le
parcours électrique du disjoncteur jusqu'aux dernières prises.

### Équipements (Phase 2)

Page unique avec deux onglets :

- **Appareils** — groupés par catégorie (Cuisson, Électroménager,
  Chauffage, Eau chaude, Ventilation, Piscine, Sécurité, Réseau, Atelier).
  Badges visuels : `ligne XYZ` (rattaché direct), `prise XYZ` (branché
  sur une prise), `à raccorder` (non rattaché).
- **Volets** — groupés par pièce.

Filtres pièce / catégorie. Bouton de création contextualisé.

### End-points : saisie rapide depuis le terrain

L'éditeur d'end-point s'adapte au type sélectionné :

- **PC / PD** → type de prise, nb combinées, usage principal
- **PL** → type de luminaire, commande, puissance unitaire, nb sources,
  lumens
- **IN / BT** → type de commande
- **RJ45 / TV / AUTRE** → champs communs uniquement

L'ID se génère automatiquement au format `type_TRIGRAMME_mur_numero`
(ex : `PC_CUI_MG_1`) et le numéro est auto-incrémenté pour le triplet
(type, pièce, mur). Le bouton **« Créer et saisir le suivant »** garde
le panneau ouvert pour enchaîner la saisie sur place (idéal en cartographie
physique).

### Cartographie en cours

Pour identifier physiquement les **disjoncteurs** avec étiquette manuscrite
illisible, phase inconnue ou statut libre. Liste filtrée et mode pas-à-pas
guidé.

### Historique

Liste antéchronologique de toutes les modifications (tableaux, rangées,
disjoncteurs, pièces, lignes, end-points, volets, appareils), avec
filtres par type d'entité, tableau et période. Chaque entrée est cliquable
et renvoie vers l'entité concernée.

L'entrée initiale documente la **bascule L1 → L3 du 22/05/2026** sur
`TI-LOCAL-PISCINE` (passage 12 kVA → 18 kVA).

### Recherche globale

Champ en haut de l'app — cherche dans les étiquettes / IDs / notes
des **8 types d'entités** (tableau, rangée, disjoncteur, pièce, ligne,
end-point, appareil, volet). Badges colorés pour identifier le type
du résultat. Click → ouvre directement la vue ou l'éditeur correspondant.

### Données : export / import

Bouton `Données` dans le header :

- **Export** — télécharge un JSON unifié contenant les 7 listes
  (tableaux + pieces + lignes + endpoints + volets + appareils +
  modifications) au format `myelec-export-<timestamp>.json`.
- **Import** — remplace la base courante après confirmation
  (utile pour restaurer ou copier entre instances).

### Mode sombre

Bouton `Sombre` / `Clair` dans le header (préférence sauvegardée dans
`localStorage`).

## Conventions de nommage

### Disjoncteurs (Phase 1)

`[code-tableau]-[code-rangée]-[code-départ]`

Exemples : `TP-R2-LV`, `TP-R3-PLAQUE`, `TI-LOCAL-PISCINE`, `TLP-R1-FILTRATION`.

Codes tableau : `TP` (Principal), `TSG` (Secondaire Garage), `TI`
(Intermédiaire Chaufferie), `TLP` (Local Piscine).

### End-points (Phase 2)

`type_TRIGRAMME_mur_numero` — auto-généré par l'éditeur.

Codes type : `PC` (prise courant), `PD` (prise dédiée), `PL` (point
lumineux), `IN` (interrupteur), `BT` (bouton-poussoir), `RJ45`, `TV`,
`AUTRE`.

Codes mur : `ME` (entrée), `MD` (droite), `MF` (face), `MG` (gauche),
`PL` (plafond), `SO` (sol), `IL` (îlot), `PT` (plan de travail),
`EF` (extérieur façade), `EP` (extérieur périmétrique).

Exemples : `PC_CUI_MG_1`, `PL_SEJ_PL_2`, `IN_CH1_ME_1`.

### Lignes électriques (Phase 2)

Format libre commençant par `L`. Exemples : `L-PLAQUE`, `L-PC-CUI-A`,
`L-VR-RDJ`.

### Volets et appareils fixes (Phase 2)

- Volets : `VR_TRIGRAMME_numero` (ex : `VR_CH1_1`)
- Appareils : `AP_TRIGRAMME_numero` (ex : `AP_BUA_1`)

Auto-générés par les éditeurs, numéro auto-incrémenté par pièce.

## Structure du projet

```
.
├── data/                          # JSON persistés (commit git par l'utilisateur)
│   ├── tableaux.json              # Phase 1
│   ├── pieces.json                # Phase 2
│   ├── lignes.json                # Phase 2
│   ├── endpoints.json             # Phase 2
│   ├── volets.json                # Phase 2
│   ├── appareils_fixes.json       # Phase 2
│   └── modifications.json         # commun
├── server.js                      # Mini API Express (factory CRUD)
├── vite.config.ts                 # Vite + proxy /api
├── src/
│   ├── types/electrical.ts        # tous les types
│   ├── services/
│   │   ├── storage.ts             # fetch /api/* (storage.tableaux, .pieces, …)
│   │   └── historique.ts          # diff et entrées de modification
│   ├── hooks/
│   │   ├── useStore.ts            # hook central qui possède tout
│   │   └── useSearch.ts           # recherche cross-entités
│   ├── utils/
│   │   ├── phaseStyle.ts          # palette par phase (L1/L2/L3/TRI)
│   │   └── idGenerator.ts         # endpointId, voletId, appareilId
│   └── components/
│       ├── TableauList / TableauDetail / DisjoncteurCard / DisjoncteurEditor
│       ├── RangeeView / RangeeEditor / TableauEditor
│       ├── PieceList / PieceDetail / PieceEditor
│       ├── LigneList / LigneDetail / LigneEditor
│       ├── EquipementList (Appareils + Volets)
│       ├── AppareilFixeEditor / VoletEditor / EndPointEditor
│       ├── SidePanel / SearchBar / HistoriqueView
│       ├── CartographieEnCours / ExportImport
│       ├── App.tsx
│       ├── main.tsx
│       └── index.css
└── index.html
```

## Sécurité et accès

- Pas d'authentification : l'API Express n'est exposée que sur
  `127.0.0.1:5180`, le proxy Vite la rend accessible via `/api/*` à
  partir du frontend.
- L'accès distant se fait via Tailscale sur l'IP du Mac mini qui sert
  l'app (privée par défaut).
- **Ne pas exposer Vite/Express sur Internet sans protection**.

## Phases suivantes

- Phase 3+ — Diagnostic en cas de disjonction (en s'appuyant sur le
  cross-ref Phase 1 ↔ 2), simulation de modifications, historique des
  incidents, alertes saisonnières (piscine), bilan de puissance prévisionnel.
