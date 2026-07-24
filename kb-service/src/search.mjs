function overlapScore(hay, needle) {
  if (!hay || !needle) return 0
  let score = 0
  // Prefer longer substrings of the query that appear in hay
  const n = needle.length
  for (let len = Math.min(n, 8); len >= 1; len--) {
    for (let i = 0; i <= n - len; i++) {
      const sub = needle.slice(i, i + len)
      if (sub.trim() && hay.includes(sub)) {
        score += len
      }
    }
  }
  return score
}

/**
 * Keyword retrieval over chunks.
 * @param {object[]} chunks
 * @param {{ query: string, top_k?: number, filters?: object }} opts
 */
export function searchChunks(chunks, opts) {
  const query = (opts.query || '').trim()
  const topK = Math.min(Math.max(opts.top_k ?? 8, 1), 50)
  const filters = opts.filters || {}

  let candidates = chunks
  if (filters.chunk_types?.length) {
    const set = new Set(filters.chunk_types)
    candidates = candidates.filter((c) => set.has(c.chunk_type))
  }
  if (filters.compliance?.length) {
    const set = new Set(filters.compliance)
    candidates = candidates.filter((c) => set.has(c.compliance))
  }
  if (filters.hsk_level?.length) {
    const set = new Set(filters.hsk_level.map(Number))
    candidates = candidates.filter((c) => set.has(Number(c.hsk_level)))
  }

  if (!query) {
    return candidates.slice(0, topK).map((c) => ({ ...c, score: 0 }))
  }

  const q = query.toLowerCase()
  const scored = []

  for (const c of candidates) {
    const title = c.title || ''
    const text = c.text || ''
    const titleLower = title.toLowerCase()
    const textLower = text.toLowerCase()
    const pinyin = (c.metadata?.pinyin || '').toLowerCase()

    let score = 0
    if (title === query || titleLower === q) score += 80
    else if (title.includes(query) || titleLower.includes(q)) score += 50

    score += overlapScore(title, query) * 3
    score += Math.min(overlapScore(text, query), 40)

    if (text.includes(query) || textLower.includes(q)) score += 10
    if (pinyin && (q.includes(pinyin) || pinyin.includes(q))) score += 15

    if (c.compliance === '考纲内') score += 2
    if (c.chunk_type === 'topic' || c.chunk_type === 'task') score += 3
    if (c.chunk_type === 'grammar') score += 1

    if (score > 0) scored.push({ ...c, score })
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh'))
  return scored.slice(0, topK)
}
