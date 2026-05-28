import express from 'express'
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.MYELEC_DATA_DIR
  ? process.env.MYELEC_DATA_DIR
  : join(__dirname, 'data')
const DIST_DIR = join(__dirname, 'dist')

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

const app = express()
app.use(express.json({ limit: '10mb' }))

// Endpoints CRUD génériques (GET liste + PUT remplacement) pour chaque ressource.
for (const resource of Object.keys(RESOURCES)) {
  const file = pathOf(resource)
  app.get(`/api/${resource}`, async (_req, res) => {
    res.json(await readJson(file))
  })
  app.put(`/api/${resource}`, async (req, res) => {
    if (!Array.isArray(req.body))
      return res.status(400).json({ error: 'expected array' })
    await writeJson(file, req.body)
    res.json({ ok: true })
  })
}

// POST /api/modifications : append d'une entrée d'historique (utilisé par les
// services côté client à chaque création/modif/suppression).
app.post('/api/modifications', async (req, res) => {
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
