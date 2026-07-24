#!/usr/bin/env node
/**
 * Build kb/chunks.jsonl from public KG + teacher data for LLM retrieval.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicDir = join(root, 'public')
const kbDir = join(root, 'kb')

const TYPE_TO_CLASS = {
  Word: 'hsk1:Word',
  Character: 'hsk1:Character',
  GrammarPoint: 'hsk1:GrammarPoint',
  Topic: 'hsk1:Topic',
  Task: 'hsk1:Task',
}

const CHUNK_TYPE = {
  Word: 'word',
  Character: 'character',
  GrammarPoint: 'grammar',
  Topic: 'topic',
  Task: 'task',
}

function loadJson(name) {
  return JSON.parse(readFileSync(join(publicDir, name), 'utf8'))
}

function fileHash(name) {
  const buf = readFileSync(join(publicDir, name))
  return createHash('sha256').update(buf).digest('hex').slice(0, 16)
}

function trunc(s, n = 200) {
  if (!s) return ''
  const t = String(s).replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

function proficiencyLine(t) {
  if (!t || typeof t !== 'object') return ''
  return ['listening', 'reading', 'speaking', 'writing']
    .filter((k) => t[k])
    .map((k) => `${k}:${t[k]}`)
    .join('/')
}

function dedupeNodes(nodes) {
  const seen = new Set()
  const out = []
  for (const n of nodes || []) {
    if (!n?.id || seen.has(n.id)) continue
    seen.add(n.id)
    out.push(n)
  }
  return out
}

function buildWordText(n) {
  const parts = [`【词汇】${n.name_zh || '?'}`]
  if (n.pinyin) parts[0] += `（${n.pinyin}）`
  if (n.pos) parts.push(`词性：${n.pos}`)
  if (n.compliance) parts.push(`考纲：${n.compliance}`)
  const def = n.definition || n.meaning_full
  if (def) parts.push(`释义：${trunc(def, 120)}`)
  if (n.example) parts.push(`例句：${trunc(n.example, 200)}`)
  const prof = proficiencyLine(n.proficiency_target)
  if (prof) parts.push(`掌握目标：${prof}`)
  return parts.join('。') + '。'
}

function buildCharText(n) {
  const parts = [`【汉字】${n.name_zh || '?'}`]
  if (n.pinyin) parts[0] += `（${n.pinyin}）`
  if (n.radical) parts.push(`部首：${n.radical}`)
  if (n.strokes) parts.push(`笔画：${n.strokes}`)
  if (n.compliance) parts.push(`考纲：${n.compliance}`)
  if (n.name_en) parts.push(`英文：${trunc(n.name_en, 80)}`)
  const prof = proficiencyLine(n.proficiency_target)
  if (prof) parts.push(`掌握目标：${prof}`)
  return parts.join('。') + '。'
}

function buildGrammarText(n, catHint) {
  const parts = [`【语法】${n.name_zh || '?'}`]
  const cat = catHint || n.category
  if (cat) parts.push(`类别：${cat}`)
  if (n.subcategory && n.subcategory !== cat) parts.push(`子类：${n.subcategory}`)
  if (n.compliance) parts.push(`考纲：${n.compliance}`)
  if (n.example) parts.push(`例句：${trunc(n.example, 200)}`)
  const prof = proficiencyLine(n.proficiency_target)
  if (prof) parts.push(`掌握目标：${prof}`)
  return parts.join('。') + '。'
}

function buildTopicText(n, teacherTopic) {
  const parts = [`【话题】${n.name_zh || '?'}`]
  const subs = n.sub_topics || teacherTopic?.sub_topics
  if (subs?.length) parts.push(`子话题：${subs.join('、')}`)
  const cov = n.course_coverage_label || n.course_coverage || teacherTopic?.course_coverage
  if (cov) parts.push(`课程覆盖：${cov}`)
  if (n.compliance) parts.push(`考纲：${n.compliance}`)
  const words = teacherTopic?.words
  if (words?.length) {
    const sample = words
      .slice(0, 15)
      .map((w) => w.name_zh + (w.pinyin ? `(${w.pinyin})` : ''))
      .join('、')
    parts.push(`代表词：${sample}${words.length > 15 ? `等共${words.length}个` : ''}`)
  }
  return parts.join('。') + '。'
}

function buildTaskText(n) {
  const parts = [`【任务】${n.name_zh || '?'}`]
  if (n.description) parts.push(`说明：${trunc(n.description, 160)}`)
  if (n.category) parts.push(`类别：${n.category}`)
  if (n.compliance) parts.push(`考纲：${n.compliance}`)
  const prof = proficiencyLine(n.proficiency_target)
  if (prof) parts.push(`掌握目标：${prof}`)
  return parts.join('。') + '。'
}

function grammarCategoryIndex(teacherData) {
  const map = new Map()
  const cats = teacherData?.grammar_by_category || {}
  for (const [cat, items] of Object.entries(cats)) {
    for (const g of items || []) {
      if (g?.id) map.set(g.id, cat)
      if (g?.name_zh && !map.has(g.name_zh)) map.set(g.name_zh, cat)
    }
  }
  return map
}

function main() {
  const kg = loadJson('kg_data.json')
  const teacher = loadJson('teacher_data.json')
  const nodes = dedupeNodes(kg.nodes)
  const grammarCat = grammarCategoryIndex(teacher)
  const topicsByName = teacher.topics_with_words || {}

  const chunks = []
  const counts = {
    word: 0,
    character: 0,
    grammar: 0,
    topic: 0,
    task: 0,
  }

  for (const n of nodes) {
    const chunkType = CHUNK_TYPE[n.type]
    if (!chunkType) continue
    const title = n.name_zh || n.id
    if (!title) continue

    let text = ''
    if (n.type === 'Word') text = buildWordText(n)
    else if (n.type === 'Character') text = buildCharText(n)
    else if (n.type === 'GrammarPoint') {
      const hint = grammarCat.get(n.id) || grammarCat.get(n.name_zh)
      text = buildGrammarText(n, hint)
    } else if (n.type === 'Topic') {
      text = buildTopicText(n, topicsByName[n.name_zh])
    } else if (n.type === 'Task') text = buildTaskText(n)

    chunks.push({
      id: `chunk:${chunkType}:${n.id}`,
      source_id: n.id,
      chunk_type: chunkType,
      hsk_level: n.hsk_level ?? 1,
      compliance: n.compliance || '',
      title,
      text,
      metadata: {
        pinyin: n.pinyin || undefined,
        pos: n.pos || undefined,
        proficiency_target: n.proficiency_target || undefined,
        ontology_class: TYPE_TO_CLASS[n.type],
        category: n.category || undefined,
        course_coverage: n.course_coverage || undefined,
      },
    })
    counts[chunkType]++
  }

  mkdirSync(kbDir, { recursive: true })
  const jsonl = chunks.map((c) => JSON.stringify(c)).join('\n') + '\n'
  writeFileSync(join(kbDir, 'chunks.jsonl'), jsonl, 'utf8')

  const meta = {
    built_at: new Date().toISOString(),
    source_hashes: {
      kg_data: fileHash('kg_data.json'),
      teacher_data: fileHash('teacher_data.json'),
    },
    totals: {
      chunks: chunks.length,
      nodes_in: (kg.nodes || []).length,
      nodes_deduped: nodes.length,
      edges: (kg.edges || []).length,
      by_type: counts,
    },
  }
  writeFileSync(join(kbDir, 'chunks.meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8')

  console.log('Built', meta.totals.chunks, 'chunks → kb/chunks.jsonl')
  console.log('By type:', counts)
}

main()
