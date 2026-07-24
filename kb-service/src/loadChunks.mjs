import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const kbDir = join(__dirname, '../../kb')

export function loadChunks() {
  const raw = readFileSync(join(kbDir, 'chunks.jsonl'), 'utf8')
  const chunks = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l))

  let meta = null
  try {
    meta = JSON.parse(readFileSync(join(kbDir, 'chunks.meta.json'), 'utf8'))
  } catch {
    meta = { totals: { chunks: chunks.length } }
  }
  return { chunks, meta }
}
