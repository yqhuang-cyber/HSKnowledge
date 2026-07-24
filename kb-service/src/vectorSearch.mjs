import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const kbDir = join(__dirname, '../../kb')

/**
 * @returns {{ vectors: Float32Array, dim: number, chunkIds: string[], meta: object } | null}
 */
export function loadEmbeddings() {
  const metaPath = join(kbDir, 'embeddings.meta.json')
  const binPath = join(kbDir, 'embeddings.f32')
  if (!existsSync(metaPath) || !existsSync(binPath)) return null

  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  const dim = meta.dim
  const chunkIds = meta.chunk_ids
  const n = chunkIds.length
  const buf = readFileSync(binPath)
  const expected = n * dim * 4
  if (buf.length !== expected) {
    throw new Error(
      `embeddings.f32 size mismatch: got ${buf.length}, expected ${expected}`
    )
  }
  const vectors = new Float32Array(buf.buffer, buf.byteOffset, n * dim)
  return { vectors, dim, chunkIds, meta, count: n }
}

/** Cosine similarity; assumes L2-normalized vectors */
export function cosine(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

/**
 * @param {Float32Array} queryVec
 * @param {{ vectors: Float32Array, dim: number, chunkIds: string[], count: number }} emb
 * @param {Map<string, object>} chunkById
 * @param {object} filters
 * @param {number} topK
 */
export function searchVector(queryVec, emb, chunkById, filters, topK) {
  const { vectors, dim, chunkIds, count } = emb
  const scored = []

  for (let i = 0; i < count; i++) {
    const id = chunkIds[i]
    const c = chunkById.get(id)
    if (!c) continue
    if (filters.chunk_types?.length && !filters.chunk_types.includes(c.chunk_type)) continue
    if (filters.compliance?.length && !filters.compliance.includes(c.compliance)) continue
    if (filters.hsk_level?.length) {
      const set = new Set(filters.hsk_level.map(Number))
      if (!set.has(Number(c.hsk_level))) continue
    }
    const row = vectors.subarray(i * dim, i * dim + dim)
    let score = cosine(queryVec, row)
    if (c.compliance === '考纲内') score += 0.01
    if (c.chunk_type === 'topic' || c.chunk_type === 'task') score += 0.015
    scored.push({ ...c, score, score_vector: score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}
