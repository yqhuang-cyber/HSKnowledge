<script setup>
import { ref, computed, onMounted } from 'vue'
import OntClassNode from './OntClassNode.vue'

const props = defineProps({
  kgData: { type: Object, default: null },
})

const ontology = ref(null)
const error = ref(null)

const classNodes = computed(
  () => ontology.value?.['@graph']?.filter((n) => n['@type'] === 'owl:Class') || []
)
const objProps = computed(
  () =>
    ontology.value?.['@graph']?.filter((n) => n['@type'] === 'owl:ObjectProperty') ||
    []
)
const dataProps = computed(
  () =>
    ontology.value?.['@graph']?.filter(
      (n) => n['@type'] === 'owl:DatatypeProperty'
    ) || []
)

const rootClass = computed(() =>
  classNodes.value.find((c) => c['@id'] === 'hsk1:HSKKnowledgePoint')
)

const typeCounts = computed(() => {
  const counts = {}
  ;(props.kgData?.nodes || []).forEach((n) => {
    counts[n.type] = (counts[n.type] || 0) + 1
  })
  return counts
})

const instanceMapping = [
  { ontClass: 'Word', icon: '📝', dataType: 'Word' },
  { ontClass: 'Character', icon: '🔤', dataType: 'Character' },
  { ontClass: 'GrammarPoint', icon: '📐', dataType: 'GrammarPoint' },
  { ontClass: 'Topic', icon: '🎯', dataType: 'Topic' },
  { ontClass: 'Task', icon: '⚡', dataType: 'Task' },
]

onMounted(async () => {
  try {
    const res = await fetch('/ontology.jsonld')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    ontology.value = await res.json()
  } catch (e) {
    error.value = e.message || String(e)
    console.error('ontology 加载失败:', e)
  }
})
</script>

<template>
  <div>
    <div class="section">
      <h2>本体模型 (Ontology) - 类层级</h2>
      <p class="muted">
        HSK1 本体模型定义了所有 HSK 知识点的<strong>类、属性、关系</strong>。类层级采用三层结构：基础层 →
        能力层 → 应用层。 数据实例（如 word-我, char-我, topic-个人信息）都是这些类的具体化。
      </p>
      <div v-if="error" class="error">本体数据加载失败: {{ error }}</div>
      <div v-else-if="!ontology" class="loading">⏳ 正在加载本体...</div>
      <div v-else class="ont-tree">
        <OntClassNode
          v-if="rootClass"
          :cls="rootClass"
          :class-nodes="classNodes"
        />
      </div>
    </div>

    <div v-if="ontology" class="two-col">
      <div class="section">
        <h2>对象属性 (Object Properties)</h2>
        <p class="muted" style="font-size: 12px; margin-bottom: 8px">
          关系类属性 - 链接两个知识点
        </p>
        <div class="ont-props-grid">
          <div v-for="p in objProps" :key="p['@id']" class="ont-prop obj">
            <div class="name">{{ p['@id'] }}</div>
            <div class="desc">
              {{ p.name_zh || ''
              }}{{ p.comment_zh ? ' - ' + p.comment_zh : '' }}
            </div>
            <div class="meta">
              {{ p.domain || '' }} → {{ p.range || ''
              }}{{ p.transitive ? ' · 传递' : ''
              }}{{ p.symmetric ? ' · 对称' : '' }}
            </div>
          </div>
        </div>
      </div>
      <div class="section">
        <h2>数据属性 (Datatype Properties)</h2>
        <p class="muted" style="font-size: 12px; margin-bottom: 8px">
          属性类字段 - 字符串/数字等
        </p>
        <div class="ont-props-grid">
          <div v-for="p in dataProps" :key="p['@id']" class="ont-prop data">
            <div class="name">{{ p['@id'] }}</div>
            <div class="desc">{{ p.name_zh || '' }}</div>
            <div class="meta">
              {{ (p.domain || '').replace('hsk1:', '') }} →
              {{ (p.range || '').replace('xsd:', '') }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="ontology" class="section">
      <h2>实例映射 (Instance Mapping)</h2>
      <p class="muted">
        知识图谱中的实际节点都是本体类的实例。以下是每类节点的数量统计：
      </p>
      <div v-if="!kgData" class="muted">数据未加载</div>
      <div
        v-for="m in instanceMapping"
        :key="m.ontClass"
        style="
          display: flex;
          align-items: center;
          padding: 12px;
          background: #f7fafc;
          border-radius: 8px;
          margin-bottom: 8px;
        "
      >
        <div style="font-size: 24px; margin-right: 12px">{{ m.icon }}</div>
        <div style="flex: 1">
          <strong style="color: #2d3748">{{ m.ontClass }}</strong>
          <div style="color: #718096; font-size: 12px">
            对应数据节点类型: {{ m.dataType }}
          </div>
        </div>
        <div style="font-size: 20px; font-weight: 700; color: #5a67d8">
          {{ typeCounts[m.dataType] || 0 }}
        </div>
      </div>
    </div>

    <div class="section">
      <h2>核心原则 (Design Principles)</h2>
      <div
        style="
          padding: 16px;
          background: #f7fafc;
          border-radius: 6px;
          line-height: 1.8;
          font-size: 14px;
        "
      >
        <div>
          <strong style="color: #4299e1">1. 三层分层</strong>：基础层 (语音/字/词/语法) →
          能力层 (听/说/读/写) → 应用层 (话题/任务/场景)
        </div>
        <div>
          <strong style="color: #48bb78">2. 双维度评估</strong>：每个知识点同时定义掌握度（5
          级量表）和依赖前置
        </div>
        <div>
          <strong style="color: #9f7aea">3. 多视图分类</strong>：同一本体支持按知识类型/话题/难度切换
        </div>
        <div>
          <strong style="color: #ed8936">4. 可量化达成</strong>：SWRL 规则定义了 HSK1
          达标的判断标准
        </div>
        <div>
          <strong style="color: #f56565">5. 可扩展</strong>：可平滑扩展到 HSK2/3/4/5/6
        </div>
      </div>
    </div>
  </div>
</template>
