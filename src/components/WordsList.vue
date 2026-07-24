<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  kgData: { type: Object, default: null },
  teacherData: { type: Object, default: null },
})

const search = ref('')
const currentFilter = ref('all')

const categories = computed(() =>
  props.teacherData?.words_by_category
    ? Object.keys(props.teacherData.words_by_category)
    : []
)

const allWordCount = computed(
  () => (props.kgData?.nodes || []).filter((n) => n.type === 'Word').length
)

const filteredWords = computed(() => {
  if (!props.kgData) return []
  let words = props.kgData.nodes.filter((n) => n.type === 'Word')
  if (currentFilter.value !== 'all' && props.teacherData?.words_by_category) {
    const wids = new Set(
      (props.teacherData.words_by_category[currentFilter.value] || []).map(
        (w) => w.id
      )
    )
    words = words.filter((w) => wids.has(w.id))
  }
  const q = search.value.toLowerCase()
  if (q) {
    words = words.filter(
      (w) =>
        (w.name_zh || '').includes(q) ||
        (w.pinyin || '').toLowerCase().includes(q)
    )
  }
  return words
})
</script>

<template>
  <div class="section">
    <h2>词汇清单</h2>
    <div v-if="!kgData" class="loading">⏳ 正在加载数据...</div>
    <template v-else>
      <input
        v-model="search"
        type="text"
        class="search-box"
        placeholder="搜索词（中文/拼音）..."
      />
      <div class="filter-chips">
        <span
          class="chip"
          :class="{ active: currentFilter === 'all' }"
          @click="currentFilter = 'all'"
        >
          全部 ({{ allWordCount }})
        </span>
        <span
          v-for="cat in categories"
          :key="cat"
          class="chip"
          :class="{ active: currentFilter === cat }"
          @click="currentFilter = cat"
        >
          {{ cat }} ({{ teacherData.words_by_category[cat].length }})
        </span>
      </div>
      <div class="muted">显示 {{ filteredWords.length }} 个词</div>
      <div class="word-grid">
        <div
          v-for="w in filteredWords"
          :key="w.id"
          class="word-card"
          :title="w.definition || w.pinyin || ''"
        >
          <span class="name">{{ w.name_zh || '?' }}</span>
          <span class="pinyin">{{ w.pinyin || '' }}</span>
          <span
            class="prof-dot"
            :class="'prof-' + (w.proficiency_target?.speaking || 'L2')"
          ></span>
          <span
            class="tag"
            :class="w.compliance === '考纲内' ? 'tag-in' : 'tag-out'"
            style="font-size: 9px; margin-top: 2px"
          >
            {{ w.compliance === '考纲内' ? '✓' : '+' }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>
