// src/utils/export.js
import { saveAs } from 'file-saver'

export function exportToCSV(data, filename = 'export') {
  if (!data.length) return
  const keys = Object.keys(data[0]).filter(k => !['id'].includes(k))
  const rows = [
    keys.join(','),
    ...data.map(row =>
      keys.map(k => {
        const v = row[k]
        const val = v?.seconds ? new Date(v.seconds * 1000).toISOString() : (v ?? '')
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(',')
    )
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
}
