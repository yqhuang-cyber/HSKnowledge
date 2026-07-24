<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { Network, DataSet } from 'vis-network/standalone'
import NodeInspector from './NodeInspector.vue'
import { loadOntology, TYPE_COLORS } from '../utils/ontologyMap.js'

const props = defineProps({
  kgData: { type: Object, default: null },
})

const graphContainer = ref(null)
const currentFilter = ref('all')
const selectedNodeId = ref(null)
const ontologyIndex = ref(null)
const ontologyError = ref(null)

const filters = [
  { id: 'all', label: '全部' },
  { id: 'Task', label: '任务' },
  { id: 'Topic', label: '话题' },
  { id: 'Word', label: '词汇' },
  { id: 'Character', label: '汉字' },
  { id: 'GrammarPoint', label: '语法' },
]

let network = null
let nodeItems = []
let edgeItems = []
let nodesDS = null
let edgesDS = null
let nodesById = new Map()
let rawEdges = []

const colors = TYPE_COLORS

const edgeColors = {
  enables: '#9f7aea',
  'relates-to': '#4299e1',
  composes: '#48bb78',
  requires: '#ed8936',
}

const selectedNode = computed(() =>
  selectedNodeId.value ? nodesById.get(selectedNodeId.value) || null : null
)

const outgoing = computed(() => {
  if (!selectedNodeId.value) return []
  return rawEdges
    .filter((e) => e.from === selectedNodeId.value)
    .map((e) => ({
      ...e,
      toNode: nodesById.get(e.to) || { id: e.to, name_zh: e.to },
    }))
})

const incoming = computed(() => {
  if (!selectedNodeId.value) return []
  return rawEdges
    .filter((e) => e.to === selectedNodeId.value)
    .map((e) => ({
      ...e,
      fromNode: nodesById.get(e.from) || { id: e.from, name_zh: e.from },
    }))
})

const visibleNodeIds = computed(() => {
  if (currentFilter.value === 'all') {
    return new Set(nodeItems.map((n) => n.id))
  }
  return new Set(
    nodeItems.filter((n) => n.group === currentFilter.value).map((n) => n.id)
  )
})

const destroyGraph = () => {
  if (network) {
    network.destroy()
    network = null
  }
  nodesDS = null
  edgesDS = null
}

const buildItems = () => {
  const seen = new Set()
  nodeItems = []
  nodesById = new Map()
  for (const n of props.kgData.nodes || []) {
    if (!n?.id || seen.has(n.id)) continue
    seen.add(n.id)
    nodesById.set(n.id, n)
    nodeItems.push({
      id: n.id,
      label: n.name_zh,
      title: (n.name_zh || '') + (n.pinyin ? ` [${n.pinyin}]` : ''),
      group: n.type,
      color: {
        background:
          n.compliance === '考纲外补充' ? '#a0aec0' : colors[n.type] || '#888',
        border: '#2d3748',
      },
      shape: n.type === 'Word' || n.type === 'Character' ? 'box' : 'ellipse',
      font: { size: n.type === 'Task' ? 18 : 13, color: '#fff' },
      size: n.type === 'Task' ? 25 : n.type === 'Topic' ? 20 : 12,
    })
  }

  const edgeSeen = new Set()
  edgeItems = []
  rawEdges = []
  ;(props.kgData.edges || []).forEach((e, i) => {
    if (!e?.from || !e?.to || !seen.has(e.from) || !seen.has(e.to)) return
    const key = `${e.from}->${e.to}|${e.type || ''}`
    if (edgeSeen.has(key)) return
    edgeSeen.add(key)
    const item = {
      id: e.id || `e-${i}`,
      from: e.from,
      to: e.to,
      type: e.type,
      color: { color: edgeColors[e.type] || '#a0aec0', opacity: 0.4 },
      width: 1,
    }
    edgeItems.push(item)
    rawEdges.push({ from: e.from, to: e.to, type: e.type })
  })
}

const applyFilter = () => {
  if (!nodesDS || !edgesDS) return
  if (currentFilter.value === 'all') {
    nodesDS.clear()
    nodesDS.add(nodeItems)
    edgesDS.clear()
    edgesDS.add(edgeItems)
  } else {
    const filteredNodes = nodeItems.filter((n) => n.group === currentFilter.value)
    const nodeIds = new Set(filteredNodes.map((n) => n.id))
    const filteredEdges = edgeItems.filter(
      (e) => nodeIds.has(e.from) && nodeIds.has(e.to)
    )
    nodesDS.clear()
    nodesDS.add(filteredNodes)
    edgesDS.clear()
    edgesDS.add(filteredEdges)
  }

  if (selectedNodeId.value && !visibleNodeIds.value.has(selectedNodeId.value)) {
    // keep inspector open for filtered-out selection, but clear network selection
    try {
      network?.unselectAll()
    } catch (_) {
      /* ignore */
    }
  }
}

const clearSelection = () => {
  selectedNodeId.value = null
  try {
    network?.unselectAll()
  } catch (_) {
    /* ignore */
  }
}

const selectNode = (id, { focus = true } = {}) => {
  if (!id || !nodesById.has(id)) return
  selectedNodeId.value = id
  if (!network) return
  const visible = visibleNodeIds.value.has(id)
  if (visible) {
    try {
      network.selectNodes([id])
      if (focus) network.focus(id, { scale: 1.2, animation: true })
    } catch (_) {
      /* ignore */
    }
  } else {
    try {
      network.unselectAll()
    } catch (_) {
      /* ignore */
    }
  }
}

const bindNetworkEvents = () => {
  if (!network) return
  network.on('click', (params) => {
    if (params.nodes?.length) {
      selectNode(params.nodes[0], { focus: false })
    } else {
      clearSelection()
    }
  })
}

const initGraph = async () => {
  if (!props.kgData || !graphContainer.value) return
  await nextTick()
  if (!graphContainer.value.offsetWidth) {
    setTimeout(initGraph, 200)
    return
  }

  const keepId = selectedNodeId.value
  destroyGraph()
  buildItems()
  nodesDS = new DataSet(nodeItems)
  edgesDS = new DataSet(edgeItems)

  network = new Network(
    graphContainer.value,
    { nodes: nodesDS, edges: edgesDS },
    {
      nodes: { borderWidth: 1 },
      edges: { smooth: { type: 'continuous' } },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -3000,
          springLength: 100,
          springConstant: 0.04,
        },
        stabilization: { iterations: 200 },
      },
      interaction: { hover: true, navigationButtons: true, keyboard: true },
    }
  )

  bindNetworkEvents()
  if (currentFilter.value !== 'all') applyFilter()
  if (keepId && nodesById.has(keepId)) {
    selectNode(keepId, { focus: false })
  }
}

const setFilter = (id) => {
  currentFilter.value = id
  applyFilter()
}

const ensureOntology = async () => {
  if (ontologyIndex.value) return
  try {
    ontologyIndex.value = await loadOntology()
  } catch (e) {
    ontologyError.value = e.message || String(e)
    console.error('ontology 加载失败:', e)
  }
}

watch(
  () => props.kgData,
  (val) => {
    if (val) initGraph()
  }
)

onMounted(async () => {
  await ensureOntology()
  if (props.kgData) initGraph()
})

onBeforeUnmount(() => {
  destroyGraph()
})
</script>

<template>
  <div>
    <div class="section">
      <h2>知识图谱交互式可视化</h2>
      <p class="muted">提示：拖拽节点、滚轮缩放、点击节点查看右侧本体信息</p>
      <div class="filter-chips">
        <span
          v-for="f in filters"
          :key="f.id"
          class="chip"
          :class="{ active: currentFilter === f.id }"
          @click="setFilter(f.id)"
        >
          {{ f.label }}
        </span>
      </div>
      <p v-if="ontologyError" class="error" style="margin: 8px 0 0">
        本体加载失败：{{ ontologyError }}（关系映射仍可用边类型名）
      </p>
    </div>

    <div v-if="!kgData" class="loading">⏳ 正在加载数据...</div>
    <div v-else class="graph-layout">
      <div ref="graphContainer" id="graph-container"></div>
      <NodeInspector
        :node="selectedNode"
        :outgoing="outgoing"
        :incoming="incoming"
        :ontology-index="ontologyIndex"
        @close="clearSelection"
        @select-neighbor="(id) => selectNode(id, { focus: true })"
      />
    </div>
  </div>
</template>
