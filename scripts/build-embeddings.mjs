#!/usr/bin/env node
/**
 * Thin wrapper: run scripts/build-embeddings.py (fastembed / BAAI/bge-small-zh-v1.5)
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const py = join(__dirname, 'build-embeddings.py')
const bin = process.env.HSK_PYTHON || process.env.PYTHON || 'python3'

const r = spawnSync(bin, [py], { stdio: 'inherit', env: process.env })
if (r.error) {
  console.error(r.error)
  console.error('\nHint: pip3 install --user "numpy<2" fastembed')
  process.exit(1)
}
process.exit(r.status ?? 1)
