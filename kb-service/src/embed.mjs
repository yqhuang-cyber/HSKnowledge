/**
 * Query embedding via long-lived Python fastembed worker.
 * Same model as offline build: BAAI/bge-small-zh-v1.5
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

export const EMBED_MODEL = 'BAAI/bge-small-zh-v1.5'

const __dirname = dirname(fileURLToPath(import.meta.url))
const workerPath = join(__dirname, 'py_embed_worker.py')

let child = null
let rl = null
/** @type {Array<{resolve: Function, reject: Function}>} */
const waiters = []
let readyPromise = null

function pythonBin() {
  return process.env.HSK_PYTHON || process.env.PYTHON || 'python3'
}

function ensureWorker() {
  if (readyPromise) return readyPromise

  readyPromise = new Promise((resolve, reject) => {
    console.log(`Starting embedding worker (${EMBED_MODEL}) …`)
    child = spawn(pythonBin(), [workerPath], {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: process.env,
    })

    rl = createInterface({ input: child.stdout })
    let settled = false

    const fail = (err) => {
      if (!settled) {
        settled = true
        readyPromise = null
        reject(err)
      }
      while (waiters.length) {
        waiters.shift().reject(err)
      }
    }

    child.on('error', (e) => fail(e))
    child.on('exit', (code) => {
      child = null
      rl = null
      readyPromise = null
      fail(new Error(`embed worker exited with code ${code}`))
    })

    rl.on('line', (line) => {
      let msg
      try {
        msg = JSON.parse(line)
      } catch (e) {
        return
      }
      if (!settled && msg.ready) {
        settled = true
        console.log('Embedding worker ready')
        resolve()
        return
      }
      const w = waiters.shift()
      if (!w) return
      if (msg.ok) w.resolve(msg)
      else w.reject(new Error(msg.error || 'embed failed'))
    })
  })

  return readyPromise
}

function request(payload) {
  return ensureWorker().then(
    () =>
      new Promise((resolve, reject) => {
        waiters.push({ resolve, reject })
        child.stdin.write(JSON.stringify(payload) + '\n')
      })
  )
}

/**
 * @param {string} query
 * @returns {Promise<Float32Array>}
 */
export async function embedQuery(query) {
  const msg = await request({ op: 'embed_query', text: query })
  return Float32Array.from(msg.vector)
}

/** @deprecated batch embed is offline-only; kept for API symmetry */
export async function embedTexts(texts, opts = {}) {
  if (!opts.isQuery) {
    throw new Error('Online embedTexts only supports isQuery=true; use build-embeddings.py for passages')
  }
  const out = []
  for (const t of texts) out.push(await embedQuery(t))
  return out
}
