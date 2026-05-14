import * as XLSX from 'xlsx'

type Fila = (string | number | null | undefined)[]

function escaparCSV(v: string | number | null | undefined): string {
  const s = String(v ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

export function descargarCSV(filename: string, headers: string[], rows: Fila[]) {
  const lines = [
    headers.map(escaparCSV).join(','),
    ...rows.map(r => r.map(escaparCSV).join(',')),
  ]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function descargarXLSX(filename: string, headers: string[], rows: Fila[]) {
  const data = [headers, ...rows.map(r => r.map(v => v ?? ''))]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  XLSX.writeFile(wb, filename)
}
