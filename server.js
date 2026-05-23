import express from 'express'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const TABLEAUX_FILE = join(DATA_DIR, 'tableaux.json')
const MODIFS_FILE = join(DATA_DIR, 'modifications.json')

const PORT = Number(process.env.API_PORT ?? 5180)

async function ensureFile(path, fallback) {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  if (!existsSync(path)) await writeFile(path, JSON.stringify(fallback, null, 2))
}

async function readJson(path) {
  const raw = await readFile(path, 'utf-8')
  return JSON.parse(raw)
}

async function writeJson(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2))
}

await ensureFile(TABLEAUX_FILE, [])
await ensureFile(MODIFS_FILE, [])

const app = express()
app.use(express.json({ limit: '10mb' }))

app.get('/api/tableaux', async (_req, res) => {
  res.json(await readJson(TABLEAUX_FILE))
})

app.put('/api/tableaux', async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'expected array' })
  await writeJson(TABLEAUX_FILE, req.body)
  res.json({ ok: true })
})

app.get('/api/modifications', async (_req, res) => {
  res.json(await readJson(MODIFS_FILE))
})

app.post('/api/modifications', async (req, res) => {
  const current = await readJson(MODIFS_FILE)
  current.push(req.body)
  await writeJson(MODIFS_FILE, current)
  res.json({ ok: true })
})

app.put('/api/modifications', async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'expected array' })
  await writeJson(MODIFS_FILE, req.body)
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`[api] MyElec data server listening on http://127.0.0.1:${PORT}`)
})
