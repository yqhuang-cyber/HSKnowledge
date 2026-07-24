<script setup>
import { computed } from 'vue'
import {
  TYPE_COLORS,
  TYPE_LABELS,
  typeToClassId,
  getClassMeta,
  getAncestorPath,
  buildDatatypeFacts,
  getObjectPropMeta,
  buildOtherAttrs,
} from '../utils/ontologyMap.js'

const props = defineProps({
  node: { type: Object, default: null },
  outgoing: { type: Array, default: () => [] },
  incoming: { type: Array, default: () => [] },
  ontologyIndex: { type: Object, default: null },
})

const emit = defineEmits(['close', 'select-neighbor'])

const classId = computed(() =>
  props.node ? typeToClassId(props.node.type) : null
)
const classMeta = computed(() =>
  getClassMeta(props.ontologyIndex, classId.value)
)
const ancestorPath = computed(() =>
  getAncestorPath(props.ontologyIndex, classId.value)
)
const pathTitle = computed(() =>
  ancestorPath.value.map((p) => p.name_zh).join(' → ')
)
const datatypeFacts = computed(() =>
  buildDatatypeFacts(props.ontologyIndex, props.node)
)
const otherAttrs = computed(() => buildOtherAttrs(props.node))
const typeColor = computed(
  () => TYPE_COLORS[props.node?.type] || '#718096'
)
const typeLabel = computed(
  () => TYPE_LABELS[props.node?.type] || props.node?.type || ''
)

function mapRelation(edge, direction) {
  const meta = getObjectPropMeta(props.ontologyIndex, edge.type)
  const neighbor =
    direction === 'out'
      ? edge.toNode
      : edge.fromNode
  return {
    key: `${direction}-${edge.from}-${edge.to}-${edge.type}`,
    propId: meta.id,
    propName: meta.name_zh,
    neighborId: neighbor?.id,
    neighborName: neighbor?.name_zh || neighbor?.id || '?',
    neighborType: neighbor?.type,
  }
}

const outRelations = computed(() =>
  props.outgoing.map((e) => mapRelation(e, 'out'))
)
const inRelations = computed(() =>
  props.incoming.map((e) => mapRelation(e, 'in'))
)
</script>

<template>
  <aside class="node-inspector">
    <div class="inspector-toolbar">
      <span class="inspector-toolbar-title">本体检视</span>
      <button
        v-if="node"
        type="button"
        class="inspector-close"
        aria-label="关闭"
        @click="emit('close')"
      >
        ×
      </button>
    </div>

    <div v-if="!node" class="inspector-empty">
      点击节点查看本体信息
    </div>

    <div v-else class="inspector-body">
      <header class="inspector-header">
        <div class="inspector-name">{{ node.name_zh || node.id }}</div>
        <div class="inspector-type-row">
          <span
            class="type-dot"
            :style="{ background: typeColor }"
          ></span>
          <span>{{ typeLabel }}</span>
          <span class="tag" :class="node.compliance === '考纲内' ? 'tag-in' : 'tag-out'">
            {{ node.compliance || '—' }}
          </span>
        </div>
        <div class="inspector-id">{{ node.id }}</div>
      </header>

      <section class="inspector-section">
        <h3>本体类</h3>
        <div class="inspector-kv">
          <span class="k">rdf:type</span>
          <span class="v mono">{{ classId || '—' }}</span>
        </div>
        <div v-if="classMeta?.name_zh" class="inspector-kv">
          <span class="k">类名</span>
          <span class="v">{{ classMeta.name_zh }}</span>
        </div>
        <p v-if="classMeta?.comment_zh" class="inspector-comment">
          {{ classMeta.comment_zh }}
        </p>
        <div
          class="ancestor-path"
          :title="pathTitle"
        >
          <template v-for="(p, i) in ancestorPath" :key="p.id">
            <span v-if="i > 0" class="path-sep">→</span>
            <span class="path-item">{{ p.name_zh }}</span>
          </template>
          <span v-if="!ancestorPath.length" class="muted">类路径不可用</span>
        </div>
      </section>

      <section class="inspector-section">
        <h3>数据属性</h3>
        <div v-if="!datatypeFacts.length" class="muted">暂无已填充的数据属性</div>
        <div v-for="f in datatypeFacts" :key="f.id" class="inspector-kv">
          <span class="k" :title="f.id">{{ f.name_zh }}</span>
          <span class="v fact-value">{{ f.value }}</span>
        </div>
      </section>

      <section class="inspector-section">
        <h3>对象属性 · 出边</h3>
        <div v-if="!outRelations.length" class="muted">无出边</div>
        <button
          v-for="r in outRelations"
          :key="r.key"
          type="button"
          class="rel-item"
          @click="r.neighborId && emit('select-neighbor', r.neighborId)"
        >
          <div class="rel-prop">
            <strong>{{ r.propName }}</strong>
            <span class="mono dim">{{ r.propId }}</span>
          </div>
          <div class="rel-neighbor">→ {{ r.neighborName }}</div>
        </button>
      </section>

      <section class="inspector-section">
        <h3>对象属性 · 入边</h3>
        <div v-if="!inRelations.length" class="muted">无入边</div>
        <button
          v-for="r in inRelations"
          :key="r.key"
          type="button"
          class="rel-item"
          @click="r.neighborId && emit('select-neighbor', r.neighborId)"
        >
          <div class="rel-prop">
            <strong>{{ r.propName }}</strong>
            <span class="mono dim">{{ r.propId }}</span>
          </div>
          <div class="rel-neighbor">← {{ r.neighborName }}</div>
        </button>
      </section>

      <section v-if="otherAttrs.length" class="inspector-section">
        <h3>其他属性</h3>
        <div v-for="a in otherAttrs" :key="a.key" class="inspector-kv">
          <span class="k">{{ a.key }}</span>
          <span class="v">{{ a.value }}</span>
        </div>
      </section>
    </div>
  </aside>
</template>
