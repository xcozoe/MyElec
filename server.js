import express from 'express'
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

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
const THEME_RE = /^#[0-9a-f]{6}$/i

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const derived = scryptSync(String(password), salt, SCRYPT_KEYLEN).toString('hex')
  return { salt, hash: derived }
}

function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false
  const derived = scryptSync(String(password), salt, SCRYPT_KEYLEN).toString('hex')
  const a = Buffer.from(derived, 'hex')
  const b = Buffer.from(expectedHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
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

const app = express()
app.use(express.json({ limit: '10mb' }))

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
    req.user = user
    req.token = token
    return next()
  } catch (err) {
    return next(err)
  }
}

// ----- Routes Auth -----

app.post('/api/register', async (req, res, next) => {
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
    const { salt, hash } = hashPassword(password)
    const user = {
      id: newId(),
      name,
      passwordHash: hash,
      salt,
      email: '',
      avatar: '',
      themeColor: '',
      createdAt: new Date().toISOString(),
    }
    const token = newToken()
    await updateAuth((d) => {
      d.users.push(user)
      d.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() })
    })
    res.status(201).json({ token, user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

app.post('/api/login', async (req, res, next) => {
  try {
    const name = cleanName(req.body && req.body.name)
    const password = String((req.body && req.body.password) || '')
    const db = await readAuth()
    const user = db.users.find((u) => u.name.toLowerCase() === name.toLowerCase())
    if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
      return res.status(401).json({ error: 'Nom ou mot de passe incorrect.' })
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
      else if (!AVATAR_RE.test(av)) errors.push('Format de photo non pris en charge (PNG, JPEG, WebP ou GIF).')
      else upd.avatar = av
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

app.post('/api/me/password', authRequired, async (req, res, next) => {
  try {
    const current = String((req.body && req.body.currentPassword) || '')
    const nextPw = String((req.body && req.body.newPassword) || '')
    if (!verifyPassword(current, req.user.salt, req.user.passwordHash)) {
      return res.status(403).json({ error: 'Mot de passe actuel incorrect.' })
    }
    if (nextPw.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' })
    }
    const { salt, hash } = hashPassword(nextPw)
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
    if (!verifyPassword(password, req.user.salt, req.user.passwordHash)) {
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
    if (!Array.isArray(req.body))
      return res.status(400).json({ error: 'expected array' })
    await writeJson(file, req.body)
    res.json({ ok: true })
  })
}

// POST /api/modifications : append d'une entrée d'historique (utilisé par les
// services côté client à chaque création/modif/suppression).
app.post('/api/modifications', authRequired, async (req, res) => {
  await appendJson(pathOf('modifications'), req.body)
  res.json({ ok: true })
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
