import { createServer } from 'node:http'
import { loadChunks } from './loadChunks.mjs'
import { searchChunks, fuseHybrid } from './search.mjs'
import { formatHitsForChatRAGText } from './formatChatRAGText.mjs'
import { loadEmbeddings, searchVector } from './vectorSearch.mjs'
import { embedQuery } from './embed.mjs'

const PORT = Number(process.env.PORT || 8787)

const { chunks, meta } = loadChunks()
const chunkById = new Map(chunks.map((c) => [c.id, c]))

let embeddings = null
let embeddingsError = null
try {
  embeddings = loadEmbeddings()
  if (embeddings) {
    console.log(
      `Loaded embeddings: ${embeddings.count} x ${embeddings.dim} (${embeddings.meta.model})`
    )
  } else {
    console.warn('No embeddings found — vector/hybrid will degrade to keyword')
  }
} catch (e) {
  embeddingsError = e.message || String(e)
  console.warn('Failed to load embeddings:', embeddingsError)
}

console.log(`Loaded ${chunks.length} chunks (built_at=${meta.built_at || 'n/a'})`)

function sendJson(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(data)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunksBuf = []
    req.on('data', (c) => chunksBuf.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunksBuf).toString('utf8')
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function mapHit(h) {
  return {
    id: h.id,
    score: h.score,
    score_keyword: h.score_keyword,
    score_vector: h.score_vector,
    chunk_type: h.chunk_type,
    source_id: h.source_id,
    title: h.title,
    text: h.text,
    compliance: h.compliance,
    hsk_level: h.hsk_level,
    metadata: h.metadata,
  }
}

async function retrieve(body) {
  const query = body.query
  const topK = body.top_k ?? 8
  const filters = body.filters || {}
  let mode = body.mode || 'hybrid'
  if (!['keyword', 'vector', 'hybrid'].includes(mode)) mode = 'hybrid'

  let degraded = false
  let degradeReason = null

  const needVector = mode === 'vector' || mode === 'hybrid'
  if (needVector && !embeddings) {
    if (mode === 'vector') {
      const err = new Error(
        embeddingsError ||
          'embeddings not built; run: npm run build:embeddings'
      )
      err.status = 503
      throw err
    }
    mode = 'keyword'
    degraded = true
    degradeReason = embeddingsError || 'embeddings missing; fell back to keyword'
  }

  let hits
  if (mode === 'keyword') {
    hits = searchChunks(chunks, { query, top_k: topK, filters })
  } else if (mode === 'vector') {
    const qv = await embedQuery(query)
    hits = searchVector(qv, embeddings, chunkById, filters, topK)
  } else {
    const pool = Math.min(topK * 2, 40)
    const kwHits = searchChunks(chunks, { query, top_k: pool, filters })
    const qv = await embedQuery(query)
    const vecHits = searchVector(qv, embeddings, chunkById, filters, pool)
    hits = fuseHybrid(kwHits, vecHits, topK)
  }

  return { mode, degraded, degradeReason, hits }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {})
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
    return sendJson(res, 200, {
      ok: true,
      service: 'hsk-kb-service',
      message: '这是检索 API，不是网页。请用下面接口，或看 docs/kb/retrieve-for-llm.md',
      endpoints: {
        'GET /health': '健康检查',
        'GET /stats': '知识块 / 向量加载状态',
        'POST /retrieve': '检索（默认 mode=hybrid；body: { query, top_k?, mode?, format? }）',
      },
      example_curl:
        'curl -s -X POST http://127.0.0.1:8787/retrieve -H \'content-type: application/json\' -d \'{"query":"点餐","top_k":5,"format":"chat_rag_text"}\'',
      chunks: chunks.length,
      embeddings_loaded: Boolean(embeddings),
    })
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, { ok: true })
  }

  if (req.method === 'GET' && url.pathname === '/stats') {
    return sendJson(res, 200, {
      ok: true,
      loaded: chunks.length,
      meta,
      embeddings_loaded: Boolean(embeddings),
      embeddings_error: embeddingsError,
      embeddings: embeddings
        ? {
            model: embeddings.meta.model,
            dim: embeddings.dim,
            count: embeddings.count,
            built_at: embeddings.meta.built_at,
          }
        : null,
    })
  }

  if (req.method === 'POST' && url.pathname === '/retrieve') {
    try {
      const body = await readBody(req)
      if (typeof body.query !== 'string' || !body.query.trim()) {
        return sendJson(res, 400, { error: 'query (string) is required' })
      }
      const t0 = Date.now()
      const { mode, degraded, degradeReason, hits } = await retrieve(body)
      const took_ms = Date.now() - t0
      const payload = {
        query: body.query,
        mode,
        degraded: degraded || undefined,
        degrade_reason: degradeReason || undefined,
        took_ms,
        hits: hits.map(mapHit),
      }
      if (body.format === 'chat_rag_text') {
        payload.rag_text = formatHitsForChatRAGText(payload.hits)
      }
      return sendJson(res, 200, payload)
    } catch (e) {
      return sendJson(res, e.status || 400, { error: e.message || String(e) })
    }
  }

  sendJson(res, 404, { error: 'not found' })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`hsk-kb-service listening on http://127.0.0.1:${PORT}`)
})
