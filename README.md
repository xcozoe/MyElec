# MyElec

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
- Tailwind CSS v4 (plugin Vite) — **attention** : référencer une variable CSS
  avec la syntaxe parenthèses `bg-(--brand)`, **jamais** les crochets
  `bg-[--brand]` (CSS invalide en v4). Cf. `CLAUDE.md`.
- `server.js` : mini-serveur **Express** (factory CRUD + auth). En dev il tourne
  à part ; en prod il sert aussi le build `dist/` sur un seul port.
- Persistance dans `data/*.json`.
- Authentification maison (token Bearer en `localStorage`, mots de passe
  hachés en **scrypt + sel**). Accès contrôlé par l'administrateur — voir plus bas.

## Lancer l'app

```bash
npm install
npm run dev
```

Cela démarre en parallèle (via `concurrently`) :

- Vite sur <http://localhost:5179> (HMR)
- Le serveur Express sur <http://127.0.0.1:5180>

Le proxy Vite redirige `/api/*` vers le serveur Express. Sur iPad / iPhone
en accès distant, passer par l'URL publique (cf. déploiement).

Autres scripts :

- `npm run build` — `tsc -b && vite build` → build de production dans `dist/`
- `npm run preview` — preview Vite du build
- `npm test` — tests Vitest (`*.test.ts`)
- `npm run lint` — ESLint
- `npm run icons` — régénère l'apple-touch-icon depuis `src/assets/icon.svg`

### Vérifications (à enchaîner après toute modif)

```bash
npx tsc -b --noEmit        # typage
npm test                   # vitest
npm run build              # régénère dist/
node --check server.js     # si server.js modifié
```

## Authentification & accès

Pas d'inscription libre. Le flux est :

1. `POST /api/request-access` (écran de connexion → « Demander un accès »)
   crée un compte **inactif**.
2. L'administrateur valide le compte via **Paramètres → Gestion des accès**
   (`AdminUsers.tsx`, routes `/api/admin/users`).
3. Login et toutes les routes protégées (`authRequired`) refusent les comptes
   inactifs.

Au démarrage, une migration promeut automatiquement le plus ancien compte en
administrateur si aucun ne l'est. Le serveur applique du *rate-limiting* sur
`request-access`, `login` et le changement de mot de passe.

Chaque utilisateur a un **profil** (nom, e-mail, avatar — emoji ou image,
couleur de thème). L'avatar/profil s'ouvre depuis le coin haut-droit du header.

## Données

Tout est dans `data/` :

- `data/tableaux.json` — Phase 1 : les 4 tableaux pré-remplis (rangées + disjoncteurs)
- `data/pieces.json` — Phase 2 : les pièces de la maison
- `data/lignes.json` — Phase 2 : lignes électriques
- `data/endpoints.json` — Phase 2 : end-points
- `data/volets.json` — Phase 2 : volets / stores
- `data/appareils_fixes.json` — Phase 2 : appareils fixes
- `data/modifications.json` — historique horodaté, commun aux 2 phases
- `data/auth.json` — comptes + sessions (**gitignoré**, ne jamais committer)

> Les `data/*.json` (sauf `auth.json`) sont versionnés à la main par
> l'utilisateur. Côté agent, **ne pas committer** `data/*.json` ni `.env` :
> ils sont souvent modifiés par les tests/usage local.

Les photos (tableaux, disjoncteurs…) sont stockées dans le champ `photo_url`
de l'entité — soit un chemin vers `public/sources/…`, soit une URL/data-URI.
Le composant `PhotoField` fournit la vignette + lightbox (`Lightbox`).

L'API Express expose, pour chaque ressource (`tableaux`, `pieces`, `lignes`,
`endpoints`, `volets`, `appareils-fixes`, `modifications`) :

- `GET /api/<ressource>` — récupère la liste
- `PUT /api/<ressource>` — remplace la liste
- `POST /api/modifications` — append d'une entrée d'historique

Plus les routes d'auth : `/api/request-access`, `/api/login`, `/api/logout`,
`/api/me`, `/api/me/password`, `/api/me/delete`, `/api/admin/users` (+ `:id`).
**Toutes les routes de données exigent un token Bearer valide.**

## Comment l'utiliser

### Navigation

Le header propose : **Accueil**, **Lignes**, **Équipements**, **Pièces**, plus
trois icônes à droite — 🔍 **Recherche** (overlay global), ⚙️ **Paramètres**,
et l'**avatar** (profil). Sur mobile, une barre d'onglets en bas reprend les
quatre vues principales.

### Accueil — cheminement électrique

La page d'accueil (`CheminementView`) affiche le **chemin de l'énergie** depuis
le fournisseur jusqu'aux tableaux : TotalEnergies → compteur Linky → tableau
principal → tableaux en cascade. Chaque nœud a sa fiche (specs, photo en
lightbox). Cliquer sur un tableau ouvre son détail.

### Tableaux (Phase 1)

Détail d'un tableau : grille rangée × position, code couleur par phase
(L1/L2/L3/TRI/inconnue — couleurs personnalisables, cf. Paramètres),
différentiels de tête plus larges. Clic sur un disjoncteur → panneau d'édition
latéral.

Sur la fiche d'un disjoncteur, un bloc **« Cartographie aval »** affiche en
temps réel les lignes qui en partent, les end-points desservis et les appareils
alimentés (direct ou via prise) — c'est le cross-ref Phase 1 ↔ 2.

### Pièces (Phase 2)

Pièces groupées par niveau (Rez de jardin / Sous-sol / Extérieur /
Transversal). Chaque carte affiche les compteurs (end-points, volets,
appareils) et des chips par type (PC, PD, PL, IN, BT, RJ45, TV). La vue détail
d'une pièce regroupe les éléments par section : Prises, Éclairage, Commandes,
Réseau & TV, Autres, Volets & stores, Appareils fixes. Boutons « + Ajouter »
sur chaque section.

### Lignes électriques (Phase 2)

Lignes groupées par tableau d'origine. Chaque ligne affiche son disjoncteur
source (cliquable → fiche disjoncteur Phase 1), badge phase, calibre, section
du câble, nombre d'end-points / appareils, et pièces traversées (déduit des
end-points rattachés). Filtre par phase. La vue détail affiche le parcours
électrique du disjoncteur jusqu'aux dernières prises.

### Équipements (Phase 2)

Page unique avec deux onglets :

- **Appareils** — groupés par catégorie (Cuisson, Électroménager, Chauffage,
  Eau chaude, Ventilation, Piscine, Sécurité, Réseau, Atelier). Badges :
  `ligne XYZ` (rattaché direct), `prise XYZ` (branché sur une prise),
  `à raccorder` (non rattaché).
- **Volets** — groupés par pièce.

Filtres pièce / catégorie. Bouton de création contextualisé.

### End-points : saisie rapide depuis le terrain

L'éditeur d'end-point s'adapte au type sélectionné :

- **PC / PD** → type de prise, nb combinées, usage principal
- **PL** → type de luminaire, commande, puissance unitaire, nb sources, lumens
- **IN / BT** → type de commande + alimentation (filaire / pile / autonome)
- **RJ45 / TV / AUTRE** → champs communs uniquement

L'ID se génère automatiquement au format `type_TRIGRAMME_mur_numero`
(ex : `PC_CUI_MG_1`), le numéro étant auto-incrémenté pour le triplet
(type, pièce, mur). Le bouton **« Créer et saisir le suivant »** garde le
panneau ouvert pour enchaîner la saisie sur place (idéal en cartographie
physique).

### Recherche globale

Icône 🔍 du header — cherche dans les étiquettes / IDs / notes des **8 types
d'entités** (tableau, rangée, disjoncteur, pièce, ligne, end-point, appareil,
volet). Badges colorés par type. Click → ouvre la vue ou l'éditeur concerné.

### Paramètres (⚙️)

La vue Paramètres regroupe :

- **Gestion des accès** (admin uniquement) — valider / désactiver / supprimer
  les comptes.
- **Apparence** — bascule thème **clair / sombre** (persistée localement).
- **Données** — **export** (JSON unifié `myelec-export-<timestamp>.json` avec
  les 7 listes) et **import** (remplace la base courante, après confirmation).
- **Couleurs des phases** — personnaliser L1/L2/L3/TRI/inconnue (appliqué en
  direct via variables CSS `--phase-*`, persisté localement).
- **Cartographie en cours** — liste filtrée + mode pas-à-pas pour identifier
  physiquement les disjoncteurs à étiquette illisible / phase inconnue.
- **Historique** — liste antéchronologique de toutes les modifications, avec
  filtres par type d'entité, tableau et période ; chaque entrée renvoie vers
  l'entité concernée.

La **couleur de thème** (`--brand`) est, elle, un réglage **par utilisateur**
(profil), pas un réglage local.

## Conventions de nommage

### Disjoncteurs (Phase 1)

`[code-tableau]-[code-rangée]-[code-départ]`

Exemples : `TP-R2-LV`, `TP-R3-PLAQUE`, `TI-LOCAL-PISCINE`, `TLP-R1-FILTRATION`.

Codes tableau : `TP` (Principal), `TSG` (Secondaire Garage), `TI`
(Intermédiaire Chaufferie), `TLP` (Local Piscine).

### End-points (Phase 2)

`type_TRIGRAMME_mur_numero` — auto-généré par l'éditeur.

Codes type : `PC` (prise courant), `PD` (prise dédiée), `PL` (point
lumineux), `IN` (interrupteur), `BT` (bouton-poussoir), `RJ45`, `TV`, `AUTRE`.

Codes mur : `ME` (entrée), `MD` (droite), `MF` (face), `MG` (gauche),
`PL` (plafond), `SO` (sol), `IL` (îlot), `PT` (plan de travail),
`EF` (extérieur façade), `EP` (extérieur périmétrique).

Exemples : `PC_CUI_MG_1`, `PL_SEJ_PL_2`, `IN_CH1_ME_1`.

### Lignes électriques (Phase 2)

Format libre commençant par `L`. Exemples : `L-PLAQUE`, `L-PC-CUI-A`, `L-VR-RDJ`.

### Volets et appareils fixes (Phase 2)

- Volets : `VR_TRIGRAMME_numero` (ex : `VR_CH1_1`)
- Appareils : `AP_TRIGRAMME_numero` (ex : `AP_BUA_1`)

Auto-générés par les éditeurs, numéro auto-incrémenté par pièce.

## Structure du projet

```
.
├── data/                          # JSON persistés (auth.json gitignoré)
│   ├── tableaux.json              # Phase 1
│   ├── pieces.json                # Phase 2
│   ├── lignes.json                # Phase 2
│   ├── endpoints.json             # Phase 2
│   ├── volets.json                # Phase 2
│   ├── appareils_fixes.json       # Phase 2
│   ├── modifications.json         # commun
│   └── auth.json                  # comptes + sessions (gitignoré)
├── server.js                      # API Express (CRUD + auth, sert dist/ en prod)
├── deploy/                        # script + plist LaunchDaemon (Mac mini)
├── vite.config.ts                 # Vite + proxy /api
├── public/sources/                # photos des nœuds (Linky, coffrets, compteur…)
├── src/
│   ├── types/electrical.ts        # tous les types métier + constantes UI
│   ├── services/
│   │   ├── storage.ts             # fetch /api/* (injecte le Bearer token)
│   │   ├── auth.ts                # client des routes d'auth
│   │   └── historique.ts          # diff et entrées de modification
│   ├── context/
│   │   ├── AuthContext.tsx        # token + utilisateur courant
│   │   └── SettingsContext.tsx    # couleurs des phases (variables CSS)
│   ├── hooks/
│   │   ├── useStore.ts            # hook central qui possède toutes les données
│   │   └── useSearch.ts           # recherche cross-entités
│   ├── utils/
│   │   ├── phaseStyle.ts          # palette par phase (L1/L2/L3/TRI)
│   │   ├── idGenerator.ts         # endpointId, voletId, appareilId
│   │   ├── avatar.ts              # rendu/validation des avatars
│   │   └── form.ts                # helpers de formulaire
│   └── components/
│       ├── App.tsx · main.tsx · index.css
│       ├── CheminementView        # accueil : chemin fournisseur → tableaux
│       ├── TableauDetail / RangeeView / DisjoncteurCard / DisjoncteurEditor
│       ├── RangeeEditor / TableauEditor
│       ├── PieceList / PieceDetail / PieceEditor
│       ├── LigneList / LigneDetail / LigneEditor
│       ├── EquipementList (Appareils + Volets)
│       ├── AppareilFixeEditor / VoletEditor / EndPointEditor
│       ├── SettingsView / CartographieEnCours / HistoriqueView
│       ├── AuthScreen / AdminUsers / ProfileSheet / Avatar / ThemeSwatches
│       ├── PhotoField / Lightbox
│       ├── SearchOverlay / SidePanel / Dialogs / Field
│       └── ErrorBoundary / useEditorGuard
└── index.html
```

## Sécurité et accès

- **Authentification obligatoire** : toutes les routes `/api/*` de données
  exigent un token Bearer ; mots de passe en scrypt + sel ; sessions stockées
  côté serveur (révocables). Accès aux comptes contrôlé par l'admin.
- En **dev**, l'API n'écoute que sur `127.0.0.1:5180` (proxy Vite).
- En **prod** (Mac mini), `server.js` tourne en LaunchDaemon `com.myelec.app`
  sur le port défini par `.env` (`PORT=3002`) et est exposé via Cloudflared
  sur `myelec.rioloco.net`.

## Déploiement (Mac mini, LaunchDaemon)

Le `server.js` en prod tourne en mémoire : **toute modif de `server.js` ou du
front exige `npm run build` + un redémarrage du service** (Node ne recharge pas
le fichier ; le front est servi depuis `dist/`).

```bash
./deploy/setup-macmini.sh            # npm install + build + recharge le LaunchDaemon
./deploy/setup-macmini.sh --uninstall
# ou, si seul server.js/dist a changé :
sudo launchctl kickstart -k system/com.myelec.app
```

Le script utilise `sudo launchctl` → demande le mot de passe (non
automatisable côté agent). Symptôme d'un service non redémarré : un correctif
validé en preview mais absent en prod → vieux process + `dist/` en cache
navigateur (faire Cmd+Shift+R).

## Phases suivantes

- Phase 3+ — Diagnostic en cas de disjonction (en s'appuyant sur le
  cross-ref Phase 1 ↔ 2), simulation de modifications, historique des
  incidents, alertes saisonnières (piscine), bilan de puissance prévisionnel.
</content>
</invoke>
