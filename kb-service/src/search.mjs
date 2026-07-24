function overlapScore(hay, needle) {
  if (!hay || !needle) return 0
  let score = 0
  const n = needle.length
  for (let len = Math.min(n, 8); len >= 1; len--) {
    for (let i = 0; i <= n - len; i++) {
      const sub = needle.slice(i, i + len)
      if (sub.trim() && hay.includes(sub)) score += len
    }
  }
  return score
}

function applyFilters(chunks, filters = {}) {
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
  return candidates
}

/**
 * Keyword retrieval over chunks.
 */
export function searchChunks(chunks, opts) {
  const query = (opts.query || '').trim()
  const topK = Math.min(Math.max(opts.top_k ?? 8, 1), 50)
  const filters = opts.filters || {}
  const candidates = applyFilters(chunks, filters)

  if (!query) {
    return candidates.slice(0, topK).map((c) => ({ ...c, score: 0, score_keyword: 0 }))
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

    if (score > 0) scored.push({ ...c, score, score_keyword: score })
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh'))
  return scored.slice(0, topK)
}

function minMaxNorm(items, key) {
  if (!items.length) return
  let min = Infinity
  let max = -Infinity
  for (const it of items) {
    const v = it[key] ?? 0
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = max - min || 1
  for (const it of items) {
    it[`_${key}_n`] = ((it[key] ?? 0) - min) / span
  }
}

/**
 * Hybrid: fuse keyword + vector candidate lists.
 * @param {object[]} kwHits
 * @param {object[]} vecHits
 * @param {number} topK
 * @param {{ kwWeight?: number, vecWeight?: number }} [weights]
 */
export function fuseHybrid(kwHits, vecHits, topK, weights = {}) {
  const kwW = weights.kwWeight ?? 0.4
  const vecW = weights.vecWeight ?? 0.6
  const pool = new Map()

  for (const h of kwHits) {
    pool.set(h.id, {
      ...h,
      score_keyword: h.score_keyword ?? h.score ?? 0,
      score_vector: 0,
    })
  }
  for (const h of vecHits) {
    const prev = pool.get(h.id)
    if (prev) {
      prev.score_vector = h.score_vector ?? h.score ?? 0
    } else {
      pool.set(h.id, {
        ...h,
        score_keyword: 0,
        score_vector: h.score_vector ?? h.score ?? 0,
      })
    }
  }

  const items = [...pool.values()]
  minMaxNorm(items, 'score_keyword')
  minMaxNorm(items, 'score_vector')

  for (const it of items) {
    it.score = kwW * (it._score_keyword_n || 0) + vecW * (it._score_vector_n || 0)
    if (it.compliance === '考纲内') it.score += 0.01
    if (it.chunk_type === 'topic' || it.chunk_type === 'task') it.score += 0.02
  }

  items.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh'))
  return items.slice(0, topK)
}
