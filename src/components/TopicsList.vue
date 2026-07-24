<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  kgData: { type: Object, default: null },
  teacherData: { type: Object, default: null },
})

const currentFilter = ref('all')

const coverageLabel = {
  covered: '✓',
  shallow: '🟡',
  uncovered: '⚠️',
}

const filteredTopics = computed(() => {
  if (!props.teacherData?.topics_with_words) return []
  const data = props.teacherData.topics_with_words
  return Object.entries(data)
    .filter(([, t]) =>
      currentFilter.value === 'all'
        ? true
        : t.course_coverage === currentFilter.value
    )
    .map(([name, t]) => ({ name, ...t }))
})
</script>

<template>
  <div class="section">
    <h2>16 个一级话题</h2>
    <div v-if="!teacherData" class="loading">⏳ 正在加载数据...</div>
    <template v-else>
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
          :class="{ active: currentFilter === 'covered' }"
          @click="currentFilter = 'covered'"
        >
          已覆盖
        </span>
        <span
          class="chip"
          :class="{ active: currentFilter === 'shallow' }"
          @click="currentFilter = 'shallow'"
        >
          浅覆盖
        </span>
        <span
          class="chip"
          :class="{ active: currentFilter === 'uncovered' }"
          @click="currentFilter = 'uncovered'"
        >
          未覆盖
        </span>
      </div>
      <div v-if="filteredTopics.length === 0" class="muted">无匹配话题</div>
      <div
        v-for="t in filteredTopics"
        :key="t.name"
        class="topic-card"
        :class="t.course_coverage"
      >
        <div class="topic-title">
          {{ t.name }}
          <span class="tag" :class="'tag-' + t.course_coverage">
            {{ coverageLabel[t.course_coverage] || '' }} {{ t.course_coverage }}
          </span>
        </div>
        <div class="topic-meta">
          子话题：{{ (t.sub_topics || []).join('、') }}
        </div>
        <div class="topic-words" style="margin-top: 12px">
          <span
            v-for="(w, i) in (t.words || []).slice(0, 30)"
            :key="w.id || i"
            class="word-card"
            style="
              display: inline-flex;
              flex-direction: row;
              gap: 4px;
              padding: 4px 8px;
              margin: 2px;
              font-size: 13px;
            "
          >
            <span class="name" style="font-size: 14px">{{ w.name_zh }}</span>
            <span class="pinyin" style="font-size: 11px">{{ w.pinyin || '' }}</span>
          </span>
          <span
            v-if="(t.words || []).length > 30"
            style="color: #718096; font-size: 12px"
          >
            ...等 {{ t.words.length }} 个
          </span>
        </div>
      </div>
    </template>
  </div>
</template>
