import express from 'express'
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

// scrypt asynchrone : ne bloque pas l'event loop (le hash coûte ~100 ms).
const scrypt = promisify(scryptCb)

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.MYELEC_DATA_DIR
  ? process.env.MYELEC_DATA_DIR
  : join(__dirname, 'data')
const DIST_DIR = join(__dirname, 'dist')
const AUTH_FILE = join(DATA_DIR, 'auth.json')

// PORT (prod, sert UI + API) prime sur API_PORT (dev, API seule derrière Vite).
const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 5180)

// Chemin disque par ressource API. Tout est un array.
const RESOURCES = {
  tableaux: 'tableaux.json',
  modifications: 'modifications.json',
  pieces: 'pieces.json',
  lignes: 'lignes.json',
  endpoints: 'endpoints.json',
  volets: 'volets.json',
  'appareils-fixes': 'appareils_fixes.json',
}

function pathOf(resource) {
  return join(DATA_DIR, RESOURCES[resource])
}

async function ensureFile(path, fallback) {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  if (!existsSync(path)) await writeFile(path, JSON.stringify(fallback, null, 2))
}

async function readJson(path) {
  const raw = await readFile(path, 'utf-8')
  return JSON.parse(raw)
}

// File d'attente d'écriture par fichier : sérialise les opérations
// read-modify-write et les PUT concurrents pour éviter les pertes de
// données (deux écritures simultanées qui s'écrasent).
const writeChains = new Map()

function enqueueWrite(path, task) {
  const prev = writeChains.get(path) ?? Promise.resolve()
  const next = prev.then(task, task)
  // On garde la chaîne vivante même en cas d'erreur, mais on n'accumule
  // pas les rejets non gérés.
  writeChains.set(
    path,
    next.catch(() => {}),
  )
  return next
}

// Écriture atomique : on écrit dans un fichier temporaire puis on le
// renomme (rename est atomique sur le même volume). Évite de corrompre le
// JSON si le process est interrompu en plein milieu de l'écriture.
async function writeJson(path, data) {
  return enqueueWrite(path, async () => {
    const tmp = `${path}.tmp-${process.pid}`
    await writeFile(tmp, JSON.stringify(data, null, 2))
    await rename(tmp, path)
  })
}

// Append sérialisé : lit l'état courant et y ajoute l'entrée, le tout dans
// la file du fichier pour qu'aucun autre write ne s'intercale.
async function appendJson(path, entry) {
  return enqueueWrite(path, async () => {
    const current = await readJson(path)
    current.push(entry)
    const tmp = `${path}.tmp-${process.pid}`
    await writeFile(tmp, JSON.stringify(current, null, 2))
    await rename(tmp, path)
  })
}

for (const resource of Object.keys(RESOURCES)) {
  await ensureFile(pathOf(resource), [])
}

// ===== Auth (mécanisme calqué sur MyMemory) =====
//
// Stockage : un seul fichier data/auth.json contenant { users, sessions }.
//   user      = { id, name, passwordHash, salt, createdAt, email?, avatar?, themeColor? }
//   session   = { token, userId, createdAt }
// Le token est passé par le client en header Authorization: Bearer <token>.

const SCRYPT_KEYLEN = 64
const NAME_MIN = 2
const NAME_MAX = 40
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AVATAR_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/
const AVATAR_MAX = 300 * 1024

// Un avatar peut aussi être un emoji/glyphe court parmi les presets (voir
// AVATAR_PRESETS côté client). On accepte 1 à 6 codepoints, sans caractère
// sensible HTML, pour rester aligné avec ce que <Avatar> sait afficher.
function isGlyphAvatar(av) {
  const segs = Array.from(av)
  return segs.length >= 1 && segs.length <= 6 && !/[<>"'`&]/.test(av)
}
const THEME_RE = /^#[0-9a-f]{6}$/i

async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const derived = (await scrypt(String(password), salt, SCRYPT_KEYLEN)).toString('hex')
  return { salt, hash: derived }
}

async function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false
  const derived = (await scrypt(String(password), salt, SCRYPT_KEYLEN)).toString('hex')
  const a = Buffer.from(derived, 'hex')
  const b = Buffer.from(expectedHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

// Rate-limiting en mémoire (sans dépendance) pour les routes sensibles :
// freine le brute-force sur login/register/changement de mot de passe.
const rateBuckets = new Map()
function rateLimit({ key, max, windowMs }) {
  return (req, res, next) => {
    const id = `${key}:${req.ip || req.socket?.remoteAddress || 'unknown'}`
    const now = Date.now()
    const bucket = rateBuckets.get(id)
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(id, { count: 1, resetAt: now + windowMs })
      return next()
    }
    if (bucket.count >= max) {
      const retry = Math.ceil((bucket.resetAt - now) / 1000)
      res.set('Retry-After', String(retry))
      return res
        .status(429)
        .json({ error: `Trop de tentatives. Réessayez dans ${retry} s.` })
    }
    bucket.count += 1
    return next()
  }
}

// Valide le corps d'un PUT de ressource : un tableau d'objets ayant chacun un
// `id` texte non vide et unique. Évite de corrompre les JSON métier.
function validateResourceArray(body) {
  if (!Array.isArray(body)) return 'Corps attendu : un tableau.'
  const ids = new Set()
  for (let i = 0; i < body.length; i++) {
    const item = body[i]
    if (!item || typeof item !== 'object' || Array.isArray(item))
      return `Élément ${i} invalide : objet attendu.`
    if (typeof item.id !== 'string' || item.id.trim() === '')
      return `Élément ${i} invalide : champ "id" requis.`
    if (ids.has(item.id)) return `Identifiant en double : ${item.id}.`
    ids.add(item.id)
  }
  return null
}

function newId() {
  return randomBytes(12).toString('hex')
}

function newToken() {
  return randomBytes(32).toString('hex')
}

function cleanName(raw) {
  return String(raw == null ? '' : raw).trim().replace(/\s+/g, ' ')
}

function validateName(raw) {
  const name = cleanName(raw)
  if (name.length < NAME_MIN) return { error: `Le nom doit contenir au moins ${NAME_MIN} caractères.` }
  if (name.length > NAME_MAX) return { error: `Le nom est trop long (${NAME_MAX} caractères maximum).` }
  if (/[<>"\n\r\t]/.test(name)) return { error: 'Le nom contient des caractères interdits.' }
  return { name }
}

function publicUser(u) {
  if (!u) return null
  return {
    id: u.id,
    name: u.name,
    email: u.email || '',
    avatar: u.avatar || '',
    themeColor: u.themeColor || '',
    isAdmin: !!u.isAdmin,
    active: u.active !== false,
  }
}

// Vue d'un compte exposée à l'administrateur (sans hash ni sel).
function adminUserView(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email || '',
    avatar: u.avatar || '',
    isAdmin: !!u.isAdmin,
    active: u.active !== false,
    createdAt: u.createdAt || '',
  }
}

// Charge/initialise le fichier auth.json. Schéma : { users: [], sessions: [] }.
await ensureFile(AUTH_FILE, { users: [], sessions: [] })

async function readAuth() {
  const raw = await readJson(AUTH_FILE)
  if (!raw || typeof raw !== 'object') return { users: [], sessions: [] }
  return {
    users: Array.isArray(raw.users) ? raw.users : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
  }
}

// Mute-puis-persiste, sérialisé par la file d'écriture du fichier auth.
async function updateAuth(mutator) {
  return enqueueWrite(AUTH_FILE, async () => {
    const current = await readJson(AUTH_FILE).catch(() => ({ users: [], sessions: [] }))
    const db = {
      users: Array.isArray(current.users) ? current.users : [],
      sessions: Array.isArray(current.sessions) ? current.sessions : [],
    }
    const result = mutator(db)
    const tmp = `${AUTH_FILE}.tmp-${process.pid}`
    await writeFile(tmp, JSON.stringify(db, null, 2))
    await rename(tmp, AUTH_FILE)
    return result
  })
}

// Migration : garantit les champs `active`/`isAdmin` sur chaque compte et
// promeut le compte le plus ancien en administrateur si aucun ne l'est
// (compatibilité avec l'auth historique sans inscription contrôlée).
async function migrateAuth() {
  const db = await readAuth()
  let changed = false
  for (const u of db.users) {
    if (typeof u.active !== 'boolean') {
      u.active = true
      changed = true
    }
    if (typeof u.isAdmin !== 'boolean') {
      u.isAdmin = false
      changed = true
    }
  }
  if (db.users.length > 0 && !db.users.some((u) => u.isAdmin)) {
    const first = [...db.users].sort((a, b) =>
      String(a.createdAt || '').localeCompare(String(b.createdAt || '')),
    )[0]
    first.isAdmin = true
    first.active = true
    changed = true
  }
  if (!changed) return
  await updateAuth((d) => {
    for (const u of d.users) {
      const ref = db.users.find((x) => x.id === u.id)
      if (ref) {
        u.active = ref.active
        u.isAdmin = ref.isAdmin
      }
    }
  })
}
await migrateAuth()

const app = express()
app.use(express.json({ limit: '2mb' }))

// Middleware d'authentification : extrait le token du header Authorization,
// pose req.user et req.token. Renvoie 401 si invalide.
async function authRequired(req, res, next) {
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (!token) return res.status(401).json({ error: 'Authentification requise.' })
  try {
    const db = await readAuth()
    const session = db.sessions.find((s) => s.token === token)
    if (!session) return res.status(401).json({ error: 'Session invalide.' })
    const user = db.users.find((u) => u.id === session.userId)
    if (!user) return res.status(401).json({ error: 'Session invalide.' })
    if (user.active === false)
      return res.status(403).json({ error: 'Compte désactivé par l’administrateur.' })
    req.user = user
    req.token = token
    return next()
  } catch (err) {
    return next(err)
  }
}

// Réservé aux administrateurs (à chaîner après authRequired).
function adminRequired(req, res, next) {
  if (!req.user || !req.user.isAdmin)
    return res.status(403).json({ error: 'Accès administrateur requis.' })
  return next()
}

// ----- Routes Auth -----

// Demande d'accès : crée un compte INACTIF (le visiteur choisit son nom et son
// mot de passe). Aucune session n'est ouverte : la connexion reste bloquée tant
// qu'un administrateur n'a pas activé le compte.
app.post('/api/request-access', rateLimit({ key: 'request', max: 8, windowMs: 60_000 }), async (req, res, next) => {
  try {
    const { name, error: nameErr } = validateName(req.body && req.body.name)
    const password = String((req.body && req.body.password) || '')
    if (nameErr) return res.status(400).json({ error: nameErr })
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' })
    }
    const db = await readAuth()
    if (db.users.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({ error: 'Ce nom est déjà utilisé — choisissez-en un autre.' })
    }
    const { salt, hash } = await hashPassword(password)
    const user = {
      id: newId(),
      name,
      passwordHash: hash,
      salt,
      email: '',
      avatar: '',
      themeColor: '',
      active: false,
      isAdmin: false,
      createdAt: new Date().toISOString(),
    }
    await updateAuth((d) => {
      d.users.push(user)
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

app.post('/api/login', rateLimit({ key: 'login', max: 10, windowMs: 60_000 }), async (req, res, next) => {
  try {
    const name = cleanName(req.body && req.body.name)
    const password = String((req.body && req.body.password) || '')
    const db = await readAuth()
    const user = db.users.find((u) => u.name.toLowerCase() === name.toLowerCase())
    if (!user || !(await verifyPassword(password, user.salt, user.passwordHash))) {
      return res.status(401).json({ error: 'Nom ou mot de passe incorrect.' })
    }
    // Identifiants corrects mais compte pas (encore) autorisé.
    if (user.active === false) {
      return res.status(403).json({
        error: "Votre accès n'a pas encore été validé par l'administrateur.",
      })
    }
    const token = newToken()
    await updateAuth((d) => {
      d.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() })
    })
    res.json({ token, user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

app.post('/api/logout', authRequired, async (req, res, next) => {
  try {
    await updateAuth((d) => {
      d.sessions = d.sessions.filter((s) => s.token !== req.token)
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

app.get('/api/me', authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

app.patch('/api/me', authRequired, async (req, res, next) => {
  try {
    const b = req.body || {}
    const errors = []
    const upd = {}
    if (typeof b.name === 'string') {
      const { name, error: nameErr } = validateName(b.name)
      if (nameErr) errors.push(nameErr)
      else {
        const db = await readAuth()
        if (
          name.toLowerCase() !== req.user.name.toLowerCase() &&
          db.users.some((u) => u.id !== req.user.id && u.name.toLowerCase() === name.toLowerCase())
        ) {
          errors.push('Ce nom est déjà utilisé.')
        } else if (name !== req.user.name) {
          upd.name = name
        }
      }
    }
    if (typeof b.email === 'string') {
      const em = b.email.trim().slice(0, 200)
      if (em && !EMAIL_RE.test(em)) errors.push('Adresse e-mail invalide.')
      else upd.email = em
    }
    if (typeof b.avatar === 'string') {
      const av = b.avatar.trim()
      if (!av) upd.avatar = ''
      else if (av.length > AVATAR_MAX) errors.push('Photo trop lourde — réduisez-la.')
      else if (AVATAR_RE.test(av) || isGlyphAvatar(av)) upd.avatar = av
      else errors.push('Format de photo non pris en charge (PNG, JPEG, WebP ou GIF, ou emoji).')
    }
    if (typeof b.themeColor === 'string') {
      const tc = b.themeColor.trim().toLowerCase()
      if (!tc) upd.themeColor = ''
      else if (!THEME_RE.test(tc)) errors.push('Couleur de thème invalide.')
      else upd.themeColor = tc
    }
    if (errors.length) return res.status(400).json({ error: errors.join(' ') })
    let updated = req.user
    await updateAuth((d) => {
      const u = d.users.find((x) => x.id === req.user.id)
      if (u) {
        Object.assign(u, upd)
        updated = u
      }
    })
    res.json({ user: publicUser(updated) })
  } catch (err) {
    next(err)
  }
})

app.post('/api/me/password', rateLimit({ key: 'password', max: 10, windowMs: 60_000 }), authRequired, async (req, res, next) => {
  try {
    const current = String((req.body && req.body.currentPassword) || '')
    const nextPw = String((req.body && req.body.newPassword) || '')
    if (!(await verifyPassword(current, req.user.salt, req.user.passwordHash))) {
      return res.status(403).json({ error: 'Mot de passe actuel incorrect.' })
    }
    if (nextPw.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' })
    }
    const { salt, hash } = await hashPassword(nextPw)
    await updateAuth((d) => {
      const u = d.users.find((x) => x.id === req.user.id)
      if (u) {
        u.salt = salt
        u.passwordHash = hash
      }
      // Invalide les autres sessions, garde la courante.
      d.sessions = d.sessions.filter((s) => s.userId !== req.user.id || s.token === req.token)
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

app.post('/api/me/delete', authRequired, async (req, res, next) => {
  try {
    const password = String((req.body && req.body.password) || '')
    if (!(await verifyPassword(password, req.user.salt, req.user.passwordHash))) {
      return res.status(403).json({ error: 'Mot de passe incorrect.' })
    }
    const id = req.user.id
    await updateAuth((d) => {
      d.users = d.users.filter((u) => u.id !== id)
      d.sessions = d.sessions.filter((s) => s.userId !== id)
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// Endpoints CRUD génériques (GET liste + PUT remplacement) pour chaque ressource.
// Tous protégés par authRequired : il faut être connecté pour lire ou écrire.
for (const resource of Object.keys(RESOURCES)) {
  const file = pathOf(resource)
  app.get(`/api/${resource}`, authRequired, async (_req, res) => {
    res.json(await readJson(file))
  })
  app.put(`/api/${resource}`, authRequired, async (req, res) => {
    const err = validateResourceArray(req.body)
    if (err) return res.status(400).json({ error: err })
    await writeJson(file, req.body)
    res.json({ ok: true })
  })
}

// POST /api/modifications : append d'une entrée d'historique (utilisé par les
// services côté client à chaque création/modif/suppression).
app.post('/api/modifications', authRequired, async (req, res) => {
  const m = req.body
  if (!m || typeof m !== 'object' || Array.isArray(m))
    return res.status(400).json({ error: "Entrée d'historique invalide." })
  if (typeof m.id !== 'string' || m.id.trim() === '')
    return res.status(400).json({ error: "Entrée d'historique : \"id\" requis." })
  await appendJson(pathOf('modifications'), m)
  res.json({ ok: true })
})

// ----- Administration des comptes (réservé aux admins) -----

app.get('/api/admin/users', authRequired, adminRequired, async (_req, res, next) => {
  try {
    const db = await readAuth()
    res.json({ users: db.users.map(adminUserView) })
  } catch (err) {
    next(err)
  }
})

// Création directe d'un compte par l'admin : actif immédiatement.
app.post('/api/admin/users', authRequired, adminRequired, async (req, res, next) => {
  try {
    const { name, error: nameErr } = validateName(req.body && req.body.name)
    const password = String((req.body && req.body.password) || '')
    const isAdmin = !!(req.body && req.body.isAdmin)
    if (nameErr) return res.status(400).json({ error: nameErr })
    if (password.length < 6)
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' })
    const db = await readAuth()
    if (db.users.some((u) => u.name.toLowerCase() === name.toLowerCase()))
      return res.status(409).json({ error: 'Ce nom est déjà utilisé.' })
    const { salt, hash } = await hashPassword(password)
    let created
    await updateAuth((d) => {
      created = {
        id: newId(),
        name,
        passwordHash: hash,
        salt,
        email: '',
        avatar: '',
        themeColor: '',
        active: true,
        isAdmin,
        createdAt: new Date().toISOString(),
      }
      d.users.push(created)
    })
    res.status(201).json({ user: adminUserView(created) })
  } catch (err) {
    next(err)
  }
})

// Activer/désactiver un compte ou changer son rôle admin.
app.patch('/api/admin/users/:id', authRequired, adminRequired, async (req, res, next) => {
  try {
    const id = req.params.id
    const b = req.body || {}
    const db = await readAuth()
    const target = db.users.find((u) => u.id === id)
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' })
    const activeAdmins = db.users.filter((u) => u.isAdmin && u.active !== false).length
    const willBeAdmin = typeof b.isAdmin === 'boolean' ? b.isAdmin : !!target.isAdmin
    const willBeActive = typeof b.active === 'boolean' ? b.active : target.active !== false
    // Garde-fou : ne jamais laisser le système sans administrateur actif.
    if (
      target.isAdmin &&
      target.active !== false &&
      (!willBeAdmin || !willBeActive) &&
      activeAdmins <= 1
    ) {
      return res.status(400).json({ error: 'Impossible : c’est le dernier administrateur actif.' })
    }
    let updated
    await updateAuth((d) => {
      const u = d.users.find((x) => x.id === id)
      if (!u) return
      if (typeof b.active === 'boolean') u.active = b.active
      if (typeof b.isAdmin === 'boolean') u.isAdmin = b.isAdmin
      updated = u
      // Désactivation : on révoque immédiatement les sessions de ce compte.
      if (b.active === false) d.sessions = d.sessions.filter((s) => s.userId !== id)
    })
    res.json({ user: adminUserView(updated) })
  } catch (err) {
    next(err)
  }
})

// Refuser une demande / supprimer un compte.
app.delete('/api/admin/users/:id', authRequired, adminRequired, async (req, res, next) => {
  try {
    const id = req.params.id
    if (id === req.user.id)
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte ici.' })
    const db = await readAuth()
    const target = db.users.find((u) => u.id === id)
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' })
    const activeAdmins = db.users.filter((u) => u.isAdmin && u.active !== false).length
    if (target.isAdmin && target.active !== false && activeAdmins <= 1)
      return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur.' })
    await updateAuth((d) => {
      d.users = d.users.filter((u) => u.id !== id)
      d.sessions = d.sessions.filter((s) => s.userId !== id)
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// Sert le build Vite (dist/) si présent — mode prod. En dev, dist/ n'existe pas
// et Vite sert l'UI sur :5179 en proxy vers /api.
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    if (req.path.startsWith('/api')) return next()
    res.sendFile(join(DIST_DIR, 'index.html'))
  })
}

// Middleware d'erreur : toute exception async (lecture/parse/écriture)
// remonte ici plutôt que de laisser la requête pendre.
app.use((err, _req, res, _next) => {
  console.error('[api] erreur :', err)
  if (res.headersSent) return
  res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
})

app.listen(PORT, () => {
  const mode = existsSync(DIST_DIR) ? 'prod (UI + API)' : 'dev (API only)'
  console.log(`[api] MyElec ${mode} listening on http://127.0.0.1:${PORT}`)
})
