import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/** Control char used to mark lines we know are headings (docx/markdown). */
export const HEADING_MARK = '\u0001'

export interface ExtractedDoc {
  text: string
  kind: 'docx' | 'pdf' | 'text'
  /** True when real heading markup was found (lets the UI default to heading-split). */
  hasHeadings: boolean
  /** Tables as [table][row][cell]. First row is treated as column headers. */
  tables: string[][][]
}

export async function extractText(file: File): Promise<ExtractedDoc> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.docx')) return extractDocx(file)
  if (name.endsWith('.pdf')) return extractPdf(file)
  if (name.endsWith('.md') || name.endsWith('.markdown')) return extractMarkdown(file)
  return extractPlain(file)
}

function parseHtmlTables(doc: Document): string[][][] {
  const tables: string[][][] = []
  doc.querySelectorAll('table').forEach((table) => {
    const rows: string[][] = []
    table.querySelectorAll('tr').forEach((tr) => {
      const cells: string[] = []
      tr.querySelectorAll('th,td').forEach((cell) => cells.push((cell.textContent ?? '').trim()))
      if (cells.some((c) => c)) rows.push(cells)
    })
    if (rows.length >= 2) tables.push(rows)
  })
  return tables
}

async function extractDocx(file: File): Promise<ExtractedDoc> {
  const arrayBuffer = await file.arrayBuffer()
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer })
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const lines: string[] = []
  let hasHeadings = false
  doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li').forEach((el) => {
    if (el.closest('table')) return // table content is captured separately
    const text = el.textContent?.trim()
    if (!text) return
    if (/^h[1-6]$/i.test(el.tagName)) {
      lines.push(HEADING_MARK + text)
      hasHeadings = true
    } else {
      lines.push(text)
    }
  })

  return { text: lines.join('\n'), kind: 'docx', hasHeadings, tables: parseHtmlTables(doc) }
}

/**
 * Some PDFs have broken font encodings that decode the space character as a
 * stray glyph (e.g. ")" or "&"), so words run together. When real spaces are
 * abnormally scarce, find the non-space characters repeatedly wedged between
 * letters — those are really spaces — and restore them.
 */
function repairSpacing(text: string): string {
  const letters = (text.match(/[A-Za-z]/g) ?? []).length
  if (!letters) return text
  const spaces = (text.match(/ /g) ?? []).length
  if (spaces / letters > 0.12) return text // already looks like normal prose

  const counts: Record<string, number> = {}
  for (const m of text.matchAll(/[A-Za-z0-9]([^A-Za-z0-9\s])[A-Za-z0-9]/g)) {
    counts[m[1]] = (counts[m[1]] ?? 0) + 1
  }
  const bogus = new Set(
    Object.entries(counts)
      .filter(([, c]) => c >= 3)
      .map(([ch]) => ch)
  )
  if (!bogus.size) return text

  let out = ''
  for (const ch of text) out += bogus.has(ch) ? ' ' : ch
  return out.replace(/[ \t]{2,}/g, ' ')
}

async function extractPdf(file: File): Promise<ExtractedDoc> {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const lines: string[] = []
  for (let p = 1; p <= pdf.numPages; p += 1) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    let lastY: number | null = null
    let line = ''
    for (const raw of content.items as Array<{ str?: string; transform?: number[] }>) {
      const str = raw.str ?? ''
      const y = raw.transform?.[5] ?? null
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        if (line.trim()) lines.push(line.trim())
        line = ''
      }
      line += `${str} `
      lastY = y
    }
    if (line.trim()) lines.push(line.trim())
  }
  return { text: repairSpacing(lines.join('\n')), kind: 'pdf', hasHeadings: false, tables: [] }
}

function parseMarkdownTables(raw: string): string[][][] {
  const tables: string[][][] = []
  const lines = raw.split(/\r?\n/)
  let block: string[] = []
  const flush = (): void => {
    if (block.length >= 2 && /^\s*\|?\s*:?-{2,}/.test(block[1])) {
      const rows = block
        .filter((_, i) => i !== 1)
        .map((l) =>
          l
            .trim()
            .replace(/^\||\|$/g, '')
            .split('|')
            .map((c) => c.trim())
        )
      if (rows.length >= 2) tables.push(rows)
    }
    block = []
  }
  for (const l of lines) {
    if (l.includes('|')) block.push(l)
    else flush()
  }
  flush()
  return tables
}

async function extractMarkdown(file: File): Promise<ExtractedDoc> {
  const raw = await file.text()
  const lines = raw.split(/\r?\n/).map((l) => {
    const m = l.match(/^#{1,6}\s+(.*)$/)
    return m ? HEADING_MARK + m[1].trim() : l
  })
  return {
    text: lines.join('\n'),
    kind: 'text',
    hasHeadings: lines.some((l) => l.startsWith(HEADING_MARK)),
    tables: parseMarkdownTables(raw)
  }
}

async function extractPlain(file: File): Promise<ExtractedDoc> {
  return { text: await file.text(), kind: 'text', hasHeadings: false, tables: [] }
}
