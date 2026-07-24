const TYPE_TO_CLASS = {
  Word: 'hsk1:Word',
  Character: 'hsk1:Character',
  GrammarPoint: 'hsk1:GrammarPoint',
  Topic: 'hsk1:Topic',
  Task: 'hsk1:Task',
}

const EDGE_TO_PROP = {
  requires: 'hsk1:requires',
  composes: 'hsk1:composedOf',
  enables: 'hsk1:enables',
  'relates-to': 'hsk1:relatesTo',
}

export const TYPE_COLORS = {
  Task: '#f56565',
  Topic: '#ed8936',
  Word: '#4299e1',
  Character: '#48bb78',
  GrammarPoint: '#9f7aea',
}

export const TYPE_LABELS = {
  Task: '任务',
  Topic: '话题',
  Word: '词汇',
  Character: '汉字',
  GrammarPoint: '语法点',
}

const FIELD_EXTRACTORS = {
  'hsk1:hasName': (n) => n.name_zh,
  'hsk1:hasPinyin': (n) => n.pinyin,
  'hsk1:hasDefinition': (n) => n.definition || n.meaning_full,
  'hsk1:hasEnglishDefinition': (n) => n.name_en,
  'hsk1:hasExample': (n) => n.example,
  'hsk1:hasHSKLevel': (n) => n.hsk_level,
  'hsk1:hasPartOfSpeech': (n) => n.pos,
  'hsk1:hasRadical': (n) => n.radical,
  'hsk1:hasStrokeCount': (n) => n.strokes,
  'hsk1:hasSubTopics': (n) =>
    Array.isArray(n.sub_topics) ? n.sub_topics.join('、') : n.sub_topics,
  'hsk1:isInSyllabus': (n) => {
    if (n.compliance === '考纲内') return true
    if (n.compliance === '考纲外补充') return false
    return undefined
  },
  'hsk1:hasProficiencyLevel': (n) => {
    const t = n.proficiency_target
    if (!t || typeof t !== 'object') return undefined
    return ['listening', 'reading', 'speaking', 'writing']
      .filter((k) => t[k])
      .map((k) => `${k}:${t[k]}`)
      .join(' · ')
  },
}

let cachedIndex = null
let loadPromise = null

export function typeToClassId(type) {
  return TYPE_TO_CLASS[type] || null
}

export function edgeTypeToProp(edgeType) {
  return EDGE_TO_PROP[edgeType] || null
}

function parentIdOf(cls) {
  const sub = cls?.subClassOf
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub['@id']
}

export function indexOntology(jsonld) {
  const graph = jsonld?.['@graph'] || []
  const classes = {}
  const objectProps = {}
  const dataProps = {}

  for (const n of graph) {
    const id = n['@id']
    if (!id) continue
    if (n['@type'] === 'owl:Class') classes[id] = n
    else if (n['@type'] === 'owl:ObjectProperty') objectProps[id] = n
    else if (n['@type'] === 'owl:DatatypeProperty') dataProps[id] = n
  }

  return { classes, objectProps, dataProps, raw: jsonld }
}

export async function loadOntology() {
  if (cachedIndex) return cachedIndex
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const res = await fetch('/ontology.jsonld')
    if (!res.ok) throw new Error(`ontology.jsonld HTTP ${res.status}`)
    cachedIndex = indexOntology(await res.json())
    return cachedIndex
  })()
  try {
    return await loadPromise
  } catch (e) {
    loadPromise = null
    throw e
  }
}

export function getClassMeta(index, classId) {
  if (!index || !classId) return null
  return index.classes[classId] || null
}

export function getAncestorPath(index, classId) {
  if (!index || !classId) return []
  const path = []
  let current = classId
  const seen = new Set()
  while (current && !seen.has(current)) {
    seen.add(current)
    const cls = index.classes[current]
    if (!cls) {
      path.unshift({ id: current, name_zh: current.replace('hsk1:', '') })
      break
    }
    path.unshift({
      id: current,
      name_zh: cls.name_zh || current.replace('hsk1:', ''),
    })
    current = parentIdOf(cls)
  }
  return path
}

function domainMatches(domain, classId, ancestorIds) {
  if (!domain) return true
  const domains = Array.isArray(domain) ? domain : [domain]
  return domains.some((d) => {
    const id = typeof d === 'string' ? d : d['@id']
    return id === classId || ancestorIds.includes(id)
  })
}

export function buildDatatypeFacts(index, node) {
  if (!node) return []
  const classId = typeToClassId(node.type)
  const path = getAncestorPath(index, classId)
  const ancestorIds = path.map((p) => p.id)
  const facts = []

  const propIds = index?.dataProps
    ? Object.keys(index.dataProps)
    : Object.keys(FIELD_EXTRACTORS)

  for (const propId of propIds) {
    const extractor = FIELD_EXTRACTORS[propId]
    if (!extractor) continue
    const meta = index?.dataProps?.[propId]
    if (meta && !domainMatches(meta.domain, classId, ancestorIds)) continue
    const value = extractor(node)
    if (value === undefined || value === null || value === '') continue
    facts.push({
      id: propId,
      name_zh: meta?.name_zh || propId.replace('hsk1:', ''),
      value: typeof value === 'boolean' ? (value ? '是' : '否') : String(value),
    })
  }
  return facts
}

export function getObjectPropMeta(index, edgeType) {
  const propId = edgeTypeToProp(edgeType)
  if (!propId) {
    return { id: edgeType, name_zh: edgeType }
  }
  const meta = index?.objectProps?.[propId]
  return {
    id: propId,
    name_zh: meta?.name_zh || propId.replace('hsk1:', ''),
  }
}

export function buildOtherAttrs(node) {
  if (!node) return []
  const keys = [
    'category',
    'subcategory',
    'compliance',
    'compliance_reason',
    'course_coverage',
    'course_coverage_label',
    'idx_in_syllabus',
    'is_fixed_phrase',
    'description',
  ]
  return keys
    .map((k) => {
      const v = node[k]
      if (v === undefined || v === null || v === '') return null
      return { key: k, value: typeof v === 'boolean' ? String(v) : String(v) }
    })
    .filter(Boolean)
}
