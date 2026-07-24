import { createServer } from 'node:http'
import { loadChunks } from './loadChunks.mjs'
import { searchChunks } from './search.mjs'
import { formatHitsForChatRAGText } from './formatChatRAGText.mjs'

const PORT = Number(process.env.PORT || 8787)

const { chunks, meta } = loadChunks()
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

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {})
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, { ok: true })
  }

  if (req.method === 'GET' && url.pathname === '/stats') {
    return sendJson(res, 200, {
      ok: true,
      loaded: chunks.length,
      meta,
    })
  }

  if (req.method === 'POST' && url.pathname === '/retrieve') {
    try {
      const body = await readBody(req)
      const query = body.query
      if (typeof query !== 'string' || !query.trim()) {
        return sendJson(res, 400, { error: 'query (string) is required' })
      }
      const t0 = Date.now()
      const hits = searchChunks(chunks, {
        query,
        top_k: body.top_k,
        filters: body.filters,
      })
      const took_ms = Date.now() - t0
      const payload = {
        query,
        took_ms,
        hits: hits.map(({ score, id, source_id, chunk_type, title, text, compliance, hsk_level, metadata }) => ({
          id,
          score,
          chunk_type,
          source_id,
          title,
          text,
          compliance,
          hsk_level,
          metadata,
        })),
      }
      if (body.format === 'chat_rag_text') {
        payload.rag_text = formatHitsForChatRAGText(payload.hits)
      }
      return sendJson(res, 200, payload)
    } catch (e) {
      return sendJson(res, 400, { error: e.message || String(e) })
    }
  }

  sendJson(res, 404, { error: 'not found' })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`hsk-kb-service listening on http://127.0.0.1:${PORT}`)
})
