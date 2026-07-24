<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  kgData: { type: Object, default: null },
  teacherData: { type: Object, default: null },
})

const search = ref('')

const groups = computed(() => {
  if (!props.teacherData?.grammar_by_category) return []
  const q = search.value.toLowerCase()
  const entries = Object.entries(props.teacherData.grammar_by_category).sort(
    (a, b) => b[1].length - a[1].length
  )
  return entries
    .map(([cat, items]) => {
      const filtered = q
        ? items.filter(
            (g) =>
              (g.name_zh || '').toLowerCase().includes(q) ||
              (g.example || '').toLowerCase().includes(q)
          )
        : items
      return { cat, items: filtered }
    })
    .filter((g) => g.items.length > 0)
})
</script>

<template>
  <div class="section">
    <h2>语法点清单 (HSK1 2026 完整版)</h2>
    <div v-if="!teacherData" class="loading">⏳ 正在加载数据...</div>
    <template v-else>
      <input
        v-model="search"
        type="text"
        class="search-box"
        placeholder="搜索语法点..."
      />
      <div v-if="groups.length === 0" class="muted">无匹配的语法点</div>
      <div v-for="group in groups" :key="group.cat" class="grammar-group">
        <h3>{{ group.cat }} ({{ group.items.length }})</h3>
        <div class="grammar-list">
          <div v-for="(g, i) in group.items" :key="g.id || i" class="grammar-item">
            <strong>{{ g.name_zh }}</strong>
            <template v-if="g.example">
              <br />
              <span style="color: #718096; font-size: 12px">例：{{ g.example }}</span>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
