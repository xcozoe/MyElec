# MyElec — instructions projet

App de gestion d'installation électrique (tableaux, disjoncteurs, lignes,
end-points, appareils, volets, pièces). **React + TypeScript + Vite** côté front,
**Express** (`server.js`) côté back, données persistées en **fichiers JSON**
dans `data/*.json`. Auth maison (token Bearer en localStorage, scrypt + sel).

## Stack & ports

- Front : Vite + React 19 + Tailwind **v4**.
- Back : `server.js` (Express), sert `dist/` + `/api` sur **un seul port** en prod.
- Dev : `npm run dev` = Vite (**5179**, HMR) + API (`node server.js`, **5180**),
  Vite proxy `/api` → 5180.
- Prod (Mac mini) : LaunchDaemon `com.myelec.app` sur le **port 3002**
  (cf. `.env` → `PORT=3002`), exposé via Cloudflared en `myelec.rioloco.net`.

⚠️ **Tailwind v4** : pour référencer une variable CSS, utiliser la syntaxe
parenthèses `bg-(--brand)`, **jamais** les crochets `bg-[--brand]` (qui en v4
produisent un CSS invalide → couleur absente, texte blanc sur blanc). Les
crochets restent corrects pour une *valeur arbitraire* (ex.
`to-[color-mix(in_srgb,var(--brand)_70%,black)]`).

## Vérifications (à enchaîner après toute modif)

```bash
npx tsc -b --noEmit        # typage (doit être vert)
npm test                   # vitest (doit rester vert)
npm run build              # tsc -b && vite build → régénère dist/
node --check server.js     # si server.js modifié
```

Lint : `npx eslint .` remonte ~32 erreurs **préexistantes** du ruleset strict
React-Compiler (`set-state-in-effect`, `only-export-components`) sur du code
idiomatique — ne pas chercher à les corriger sauf demande explicite. En
revanche, **ne jamais introduire** de nouvelle erreur (surtout
`react-hooks/rules-of-hooks`).

## Vérification dans le navigateur (preview)

Le serveur de preview Claude (`launch.json` → nom `myelec`, port **5180**) sert
le **build prod** (`server.js` + `dist/`), **pas** le HMR Vite. Donc après une
modif front : **`npm run build` puis redémarrer le preview** (stop + start),
sinon les changements ne sont pas visibles. L'API `/api/*` exige un token : pour
piloter l'UI authentifié, injecter un token de session valide via
`localStorage.setItem('myelec.token', <token>)` puis recharger. Récupérer un
token : `node -e "const a=require('./data/auth.json'); console.log(a.sessions.at(-1)?.token)"`.

## Déploiement prod (Mac mini, LaunchDaemon)

Le `server.js` en prod tourne en mémoire : **toute modif de `server.js` ou du
front exige un redémarrage du service** pour être prise en compte (Node ne
recharge pas le fichier ; le front est servi depuis `dist/`).

```bash
./deploy/setup-macmini.sh        # npm install + npm run build + recharge le LaunchDaemon
./deploy/setup-macmini.sh --uninstall
```

Le script fait `sudo launchctl bootout/bootstrap/kickstart` → **demande le mot
de passe sudo** (non automatisable côté agent). Si seul `server.js`/`dist/` a
changé sans toucher aux deps, l'utilisateur peut aussi relancer vite :
`sudo launchctl kickstart -k system/com.myelec.app` (après un `npm run build`).

Symptôme classique d'un service non redémarré : un correctif validé en preview
mais absent en prod (vieux process Node + vieux `dist/` en cache navigateur →
faire Cmd+Shift+R).

## Git / commit

- **Branche** : travailler sur `main`.
- **Auto-push** : pousser sur `origin/main` **systématiquement après chaque
  commit** (`git push origin main`).
- **Commits ciblés** : ne committer que les fichiers pertinents. **Ne jamais
  committer** : `.env`, `data/*.json` (données locales, souvent modifiées par les
  tests), `dist/`, `data/auth.json` (déjà gitignoré). Préférer plusieurs commits
  thématiques quand les changements couvrent des sujets distincts.
- Messages en français, terminés par la ligne `Co-Authored-By: Claude …`.
- `git add -i` / rebase interactif indisponibles dans cet environnement.

## Modèle d'auth (rappel)

Pas d'inscription libre. `/api/request-access` crée un compte **inactif** ;
l'admin (Rémi) valide via **Paramètres → Gestion des accès** (`AdminUsers.tsx`,
routes `/api/admin/users`). Login et `authRequired` refusent les comptes
inactifs. Migration au démarrage : promeut le plus ancien compte en admin si
aucun ne l'est.
