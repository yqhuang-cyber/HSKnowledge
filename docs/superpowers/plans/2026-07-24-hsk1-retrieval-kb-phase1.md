# HSK1 Retrieval KB (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build phase-1 HSK1 retrieval knowledge base: generate text chunks from existing public JSON, serve `POST /retrieve` (keyword), and provide `ChatRAGText` formatting for Volcengine RealtimeAPI external RAG.

**Architecture:** Offline script reads `public/kg_data.json` + `teacher_data.json` (+ light ontology class tags) into `kb/chunks.jsonl`. A small Node HTTP service loads chunks into memory and scores queries. Shared util formats hits for `ChatRAGText`. Teacher portal unchanged except optional README / docs links.

**Tech Stack:** Node.js (ESM), no new heavy deps for phase 1 (built-in `http` or add `express` only if cleaner); Vue portal untouched for core features.

**Spec:** `docs/superpowers/specs/2026-07-24-hsk1-retrieval-kb-for-llm-design.md`

## Global Constraints

- Scenario B (dialogue practice), depth D (retrieval reference only, no hard syllabus filter on model output).
- Integration C + Volcengine Realtime `ChatRAGText` (client pushes RAG text).
- Phase 1: **keyword** retrieval only; hybrid/vector is phase 2.
- Phase 1: **do not** build full Realtime WebSocket client.
- Keep source of truth in `public/*.json`; do not fork knowledge into a second hand-edited corpus.
- Deduplicate node ids when building chunks (same as GraphView).
- Prefer commit after each task if git is available; user may ask to push later.

## File Map

| Path | Responsibility |
|------|----------------|
| `scripts/build-chunks.mjs` | Build `kb/chunks.jsonl` + `kb/chunks.meta.json` |
| `kb/chunks.jsonl` | Generated chunks (commit small jsonl OK) |
| `kb/chunks.meta.json` | Build metadata |
| `kb-service/package.json` | Service package (name `hsk-kb-service`) |
| `kb-service/src/server.mjs` | HTTP server: health/stats/retrieve |
| `kb-service/src/search.mjs` | Keyword scoring |
| `kb-service/src/formatChatRAGText.mjs` | hits → ChatRAGText string |
| `kb-service/src/loadChunks.mjs` | Load jsonl |
| `docs/kb/retrieve-for-llm.md` | Integration guide |
| `package.json` (root) | Add `build:chunks` script |
| `README.md` | Link to KB docs |
| `.gitignore` | Ignore future vector dirs if any; keep jsonl tracked |

---

### Task 1: Chunk builder script

**Files:**
- Create: `scripts/build-chunks.mjs`
- Create: `kb/.gitkeep` then generate jsonl
- Modify: root `package.json` — add `"build:chunks": "node scripts/build-chunks.mjs"`

**Interfaces:**
- Produces: each line of `kb/chunks.jsonl` matching spec §4.3 fields: `id`, `source_id`, `chunk_type`, `hsk_level`, `compliance`, `title`, `text`, `metadata`
- Types: `word` | `character` | `grammar` | `topic` | `task`

- [ ] **Step 1: Implement `scripts/build-chunks.mjs`**

Read `public/kg_data.json` and `public/teacher_data.json`. Dedupe nodes by `id`. Emit:

- Words / Characters / GrammarPoints / Topics / Tasks from `kg_data.nodes`
- Enrich topic text with up to 15 words from `teacher_data.topics_with_words` when name matches
- Enrich grammar with category from teacher data when possible
- Set `metadata.ontology_class` via map Word→`hsk1:Word` etc. (same as `ontologyMap.js`)
- Truncate long `example` to 200 chars
- Skip empty titles; still emit if only name+pinyin exist
- Write `kb/chunks.meta.json` with `built_at`, counts by type, node/edge counts

- [ ] **Step 2: Run builder**

```bash
cd hsk-portal && node scripts/build-chunks.mjs
```

Expected: prints totals; `kb/chunks.jsonl` exists; word count ~300+, total chunks ~700+.

- [ ] **Step 3: Spot-check one line**

```bash
head -n 1 kb/chunks.jsonl | python3 -m json.tool
```

Expected: valid JSON with `text` non-empty.

- [ ] **Step 4: Add npm script** in root `package.json`: `"build:chunks": "node scripts/build-chunks.mjs"`

- [ ] **Step 5: Commit** (if user wants / when executing with commit permission)

```bash
git add scripts/build-chunks.mjs kb/chunks.jsonl kb/chunks.meta.json package.json
git commit -m "feat(kb): build HSK1 retrieval chunks from public graph data"
```

---

### Task 2: kb-service keyword retrieve API

**Files:**
- Create: `kb-service/package.json`
- Create: `kb-service/src/loadChunks.mjs`
- Create: `kb-service/src/search.mjs`
- Create: `kb-service/src/formatChatRAGText.mjs`
- Create: `kb-service/src/server.mjs`

**Interfaces:**
- `POST /retrieve` body: `{ query, top_k?, filters?, mode? }` → `{ query, took_ms, hits[] }`
- `GET /health` → `{ ok: true }`
- `GET /stats` → meta + loaded count
- `formatHitsForChatRAGText(hits)` → string

- [ ] **Step 1: Scaffold `kb-service/package.json`**

```json
{
  "name": "hsk-kb-service",
  "private": true,
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "start": "node src/server.mjs",
    "dev": "node --watch src/server.mjs"
  }
}
```

No required dependencies for phase 1 (use Node `http`).

- [ ] **Step 2: Implement load + search**

`loadChunks.mjs`: read `../kb/chunks.jsonl` (path relative to repo: resolve from `kb-service` → `../kb/chunks.jsonl`).

`search.mjs` scoring (simple, deterministic):

- Normalize query trim
- Filter by `filters.chunk_types`, `filters.compliance`, `filters.hsk_level` if provided
- Score: title exact include +50; title char overlap; text include +10; prefer 考纲内 +2; prefer topic/task +3
- Sort desc, take `top_k` (default 8)

- [ ] **Step 3: Implement `formatChatRAGText.mjs`**

```js
export function formatHitsForChatRAGText(hits) {
  if (!hits?.length) return '【HSK1 知识库参考】（无命中）'
  const body = hits
    .map((h, i) => `${i + 1}. [${h.chunk_type}] ${h.title}：${h.text}`)
    .join('\n')
  return `【HSK1 知识库参考】\n${body}`
}
```

Also expose `POST /retrieve` optional `format: "chat_rag_text"` that adds `rag_text` field to response for convenience.

- [ ] **Step 4: Implement server on port 8787**

CORS: `Access-Control-Allow-Origin: *` for local portal testing.

- [ ] **Step 5: Manual verify**

```bash
cd hsk-portal && npm run build:chunks
cd kb-service && npm start
# other terminal:
curl -s http://127.0.0.1:8787/health
curl -s http://127.0.0.1:8787/stats
curl -s -X POST http://127.0.0.1:8787/retrieve \
  -H 'content-type: application/json' \
  -d '{"query":"我想请朋友吃饭","top_k":5,"format":"chat_rag_text"}'
```

Expected: hits related to 饮食/吃/朋友 etc.; `rag_text` present.

- [ ] **Step 6: Commit**

```bash
git add kb-service
git commit -m "feat(kb): add keyword retrieval service for HSK1 chunks"
```

---

### Task 3: Docs + README entry

**Files:**
- Create: `docs/kb/retrieve-for-llm.md`
- Modify: `README.md`

- [ ] **Step 1: Write `docs/kb/retrieve-for-llm.md`** covering:

  - What phase 1 is / is not
  - How to build chunks + start service
  - curl examples
  - Volcengine Realtime flow: query → retrieve → `ChatRAGText` ← `rag_text`
  - Sequence summary from official diagram
  - Generic prompt fallback
  - Rebuild after data change

- [ ] **Step 2: Update root README** with short「知识库检索服务」section linking to that doc

- [ ] **Step 3: Commit**

```bash
git add docs/kb/retrieve-for-llm.md README.md
git commit -m "docs(kb): add LLM retrieve and ChatRAGText integration guide"
```

---

### Task 4: Smoke checklist (no new code)

- [ ] **Step 1:** `npm run build:chunks` succeeds  
- [ ] **Step 2:** Service `/retrieve` for queries: `自我介绍`, `明天星期几`, `点餐` returns non-empty sensible hits  
- [ ] **Step 3:** `rag_text` length reasonable (< ~4k chars for top_k=8)  
- [ ] **Step 4:** Portal `npm run build` still passes (no breakage)

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Chunk build | 1 |
| `/retrieve` keyword API | 2 |
| ChatRAGText adapter | 2 |
| Integration docs | 3 |
| No full Realtime client | (out of scope) |
| Volcengine external RAG path | 3 |

## Defaults locked by user confirmation

- Node.js · keyword phase 1 · `hsk-portal/kb` + `kb-service` · ChatRAGText text adapter · no full voice client in phase 1
