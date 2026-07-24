<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  kgData: { type: Object, default: null },
})

const search = ref('')
const currentFilter = ref('all')

const filteredChars = computed(() => {
  if (!props.kgData) return []
  let chars = props.kgData.nodes.filter((n) => n.type === 'Character')
  if (currentFilter.value !== 'all') {
    chars = chars.filter((c) => c.compliance === currentFilter.value)
  }
  const q = search.value
  if (q) {
    const ql = q.toLowerCase()
    chars = chars.filter(
      (c) =>
        (c.name_zh || '').includes(q) ||
        (c.pinyin || '').toLowerCase().includes(ql)
    )
  }
  return chars
})
</script>

<template>
  <div class="section">
    <h2>汉字清单</h2>
    <div v-if="!kgData" class="loading">⏳ 正在加载数据...</div>
    <template v-else>
      <input
        v-model="search"
        type="text"
        class="search-box"
        placeholder="搜索汉字..."
      />
      <div class="filter-chips">
        <span
          class="chip"
          :class="{ active: currentFilter === 'all' }"
          @click="currentFilter = 'all'"
        >
          全部
        </span>
        <span
          class="chip"
          :class="{ active: currentFilter === '考纲内' }"
          @click="currentFilter = '考纲内'"
        >
          考纲内
        </span>
        <span
          class="chip"
          :class="{ active: currentFilter === '考纲外补充' }"
          @click="currentFilter = '考纲外补充'"
        >
          考纲外
        </span>
      </div>
      <div class="muted" style="margin-top: 12px">
        显示 {{ filteredChars.length }} 个字
      </div>
      <div>
        <div
          v-for="c in filteredChars"
          :key="c.id"
          class="character-card"
          :title="c.definition || ''"
        >
          <span class="ch">{{ c.name_zh }}</span>
          <span class="info">
            <span class="pinyin">{{ (c.pinyin || '').slice(0, 15) }}</span>
          </span>
          <span class="info">
            部首 {{ c.radical || '-' }} · {{ c.strokes || '-' }}画
          </span>
        </div>
      </div>
    </template>
  </div>
</template>
