import type { ContentEntry, ContentType } from '@/types/content'

/**
 * Builds an in-memory index of library names and matches spoken transcript
 * against it. Matching is fuzzy by design: Whisper lightly garbles rare proper
 * nouns (proven during voice de-risk — "Expeditious Retreat" → "Expedition
 * Retreat"), so we use Sørensen–Dice character-bigram similarity, not just
 * exact string matching.
 */

const STOPWORDS = new Set([
  'the', 'of', 'a', 'an', 'and', 'to', 'in', 'on', 'at', 'is', 'it', 'i', 'you', 'my'
])

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(s: string): string[] {
  const n = normalize(s)
  return n ? n.split(' ') : []
}

function bigrams(s: string): Map<string, number> {
  const map = new Map<string, number>()
  const t = s.replace(/\s/g, '')
  for (let i = 0; i < t.length - 1; i += 1) {
    const bg = t.slice(i, i + 2)
    map.set(bg, (map.get(bg) ?? 0) + 1)
  }
  return map
}

function bigramTotal(map: Map<string, number>): number {
  let total = 0
  for (const v of map.values()) total += v
  return total
}

function diceSim(
  aBigrams: Map<string, number>,
  aTotal: number,
  bBigrams: Map<string, number>,
  bTotal: number
): number {
  if (aTotal === 0 || bTotal === 0) return 0
  let inter = 0
  // iterate the smaller map
  const [small, large] = aBigrams.size <= bBigrams.size ? [aBigrams, bBigrams] : [bBigrams, aBigrams]
  for (const [bg, c] of small) {
    const d = large.get(bg)
    if (d) inter += Math.min(c, d)
  }
  return (2 * inter) / (aTotal + bTotal)
}

interface IndexEntry {
  id: string
  name: string
  norm: string
  tokenCount: number
  bigrams: Map<string, number>
  bgTotal: number
  type: ContentType
}

export interface KeywordIndex {
  exact: Map<string, IndexEntry[]>
  byTokenCount: Map<number, IndexEntry[]>
  size: number
}

/**
 * @param aliases learned corrections: normalized spoken phrase → content id.
 * Each becomes an extra exact-match pointing at the canonical entry, so a
 * mistranscription the user has corrected once is recognised automatically.
 */
export function buildKeywordIndex(
  items: ContentEntry[],
  aliases: Record<string, string> = {}
): KeywordIndex {
  const exact = new Map<string, IndexEntry[]>()
  const byTokenCount = new Map<number, IndexEntry[]>()
  const byId = new Map<string, ContentEntry>()

  const add = (id: string, name: string, type: ContentType, norm: string): void => {
    if (!norm) return
    const bg = bigrams(norm)
    const entry: IndexEntry = {
      id,
      name,
      norm,
      tokenCount: norm.split(' ').length,
      bigrams: bg,
      bgTotal: bigramTotal(bg),
      type
    }
    const exactList = exact.get(norm)
    if (exactList) exactList.push(entry)
    else exact.set(norm, [entry])

    const tcList = byTokenCount.get(entry.tokenCount)
    if (tcList) tcList.push(entry)
    else byTokenCount.set(entry.tokenCount, [entry])
  }

  for (const item of items) {
    byId.set(item.id, item)
    add(item.id, item.name, item.type, normalize(item.name))
  }

  for (const [phrase, id] of Object.entries(aliases)) {
    const item = byId.get(id)
    if (item) add(item.id, item.name, item.type, normalize(phrase))
  }

  return { exact, byTokenCount, size: items.length }
}

export interface KeywordMatch {
  id: string
  /** Canonical library name. */
  term: string
  type: ContentType
  /** The transcript text that triggered it. */
  matched: string
  score: number
}

export interface MatchOptions {
  fuzzy: boolean
  /** Dice similarity threshold for fuzzy matches (0–1). */
  threshold?: number
  maxTokens?: number
}

export function matchText(index: KeywordIndex, text: string, opts: MatchOptions): KeywordMatch[] {
  const tokens = tokenize(text)
  if (!tokens.length) return []

  const threshold = opts.threshold ?? 0.82
  const maxN = Math.min(opts.maxTokens ?? 4, tokens.length)
  const best = new Map<string, KeywordMatch>()

  const record = (e: IndexEntry, matched: string, score: number): void => {
    const prev = best.get(e.id)
    if (!prev || score > prev.score) {
      best.set(e.id, { id: e.id, term: e.name, type: e.type, matched, score })
    }
  }

  for (let w = 1; w <= maxN; w += 1) {
    for (let i = 0; i + w <= tokens.length; i += 1) {
      const windowTokens = tokens.slice(i, i + w)
      const candidate = windowTokens.join(' ')

      const exact = index.exact.get(candidate)
      if (exact) {
        for (const e of exact) record(e, candidate, 1)
        continue
      }
      if (!opts.fuzzy) continue

      // Don't fuzzy-match trivial single tokens — too noisy.
      if (w === 1 && (candidate.length < 5 || STOPWORDS.has(candidate))) continue

      const candBigrams = bigrams(candidate)
      const candTotal = bigramTotal(candBigrams)
      for (const tc of [w, w - 1, w + 1]) {
        const bucket = index.byTokenCount.get(tc)
        if (!bucket) continue
        for (const e of bucket) {
          if (Math.abs(e.norm.length - candidate.length) > 4) continue
          const score = diceSim(candBigrams, candTotal, e.bigrams, e.bgTotal)
          if (score >= threshold) record(e, candidate, score)
        }
      }
    }
  }

  return [...best.values()].sort((a, b) => b.score - a.score)
}

/**
 * Find the closest library entries to a free-text query — used when the user
 * clicks a word in the transcript to ask "what could this be?".
 */
export function fuzzyFind(items: ContentEntry[], query: string, limit = 6): ContentEntry[] {
  const q = normalize(query)
  if (!q) return []
  const qb = bigrams(q)
  const qt = bigramTotal(qb)
  const scored: Array<{ item: ContentEntry; score: number }> = []
  for (const item of items) {
    const n = normalize(item.name)
    if (!n) continue
    let score: number
    if (n === q) score = 1.2
    else if (n.includes(q) || q.includes(n)) score = 0.95
    else {
      const nb = bigrams(n)
      score = diceSim(qb, qt, nb, bigramTotal(nb))
    }
    if (score >= 0.34) scored.push({ item, score })
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item)
}
