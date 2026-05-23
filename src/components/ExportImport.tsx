import { useRef, useState } from 'react'
import type { MyElecState } from '../hooks/useTableaux'

export function ExportImport({ state }: { state: MyElecState }) {
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleExport = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      tableaux: state.tableaux,
      modifications: state.modifications,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    a.href = url
    a.download = `myelec-export-${ts}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const tableaux = Array.isArray(parsed) ? parsed : parsed.tableaux
      const modifications = Array.isArray(parsed)
        ? []
        : (parsed.modifications ?? [])
      if (!Array.isArray(tableaux))
        throw new Error('Le fichier ne contient pas de tableaux exploitables.')
      if (
        !confirm(
          `Remplacer toutes les données par celles du fichier (${tableaux.length} tableau(x), ${modifications.length} entrée(s) d'historique) ?`,
        )
      )
        return
      await state.importAll(tableaux, modifications)
      alert('Import effectué.')
    } catch (e) {
      alert(`Erreur d'import : ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Données
      </button>
      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          className="absolute right-0 mt-1 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-30"
        >
          <button
            onClick={() => {
              handleExport()
              setOpen(false)
            }}
            className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Exporter (JSON)
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Importer (JSON)…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                void handleImportFile(f)
                setOpen(false)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
