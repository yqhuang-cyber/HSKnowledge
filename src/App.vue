<script setup>
import { ref, onMounted } from 'vue'
import Overview from './components/Overview.vue'
import GraphView from './components/GraphView.vue'
import WordsList from './components/WordsList.vue'
import GrammarList from './components/GrammarList.vue'
import CharsList from './components/CharsList.vue'
import TopicsList from './components/TopicsList.vue'
import Baseline from './components/Baseline.vue'
import CourseMap from './components/CourseMap.vue'
import Ontology from './components/Ontology.vue'

const currentTab = ref('overview')
const tabs = [
  { id: 'overview', name: '总览' },
  { id: 'graph', name: '图谱可视化' },
  { id: 'words', name: '词汇清单' },
  { id: 'grammar', name: '语法点' },
  { id: 'chars', name: '汉字' },
  { id: 'topics', name: '话题' },
  { id: 'baseline', name: '达标基线' },
  { id: 'course', name: '课程映射' },
  { id: 'ontology', name: '本体模型' },
]

const kgData = ref(null)
const teacherData = ref(null)
const loadError = ref(null)

onMounted(async () => {
  try {
    const [kgRes, tdRes] = await Promise.all([
      fetch('/kg_data.json'),
      fetch('/teacher_data.json'),
    ])
    if (!kgRes.ok || !tdRes.ok) {
      throw new Error(`HTTP kg=${kgRes.status} teacher=${tdRes.status}`)
    }
    kgData.value = await kgRes.json()
    teacherData.value = await tdRes.json()
  } catch (error) {
    loadError.value = error.message || String(error)
    console.error('数据加载失败:', error)
  }
})
</script>

<template>
  <div class="app-container">
    <header class="header">
      <h1>HSK1 知识图谱 · 教师门户</h1>
      <div class="subtitle">HSK 2026-07 实施版严格遵循 · v2.1 (含 Kai 课程映射)</div>
    </header>

    <div class="tabs">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: currentTab === tab.id }"
        @click="currentTab = tab.id"
      >
        {{ tab.name }}
      </div>
    </div>

    <main class="content">
      <div v-if="loadError" class="error">
        数据加载失败: {{ loadError }}<br />
        请检查 public 目录下 kg_data.json 和 teacher_data.json
      </div>
      <template v-else>
        <Overview v-if="currentTab === 'overview'" :kg-data="kgData" />
        <GraphView v-if="currentTab === 'graph'" :kg-data="kgData" />
        <WordsList
          v-if="currentTab === 'words'"
          :kg-data="kgData"
          :teacher-data="teacherData"
        />
        <GrammarList
          v-if="currentTab === 'grammar'"
          :kg-data="kgData"
          :teacher-data="teacherData"
        />
        <CharsList v-if="currentTab === 'chars'" :kg-data="kgData" />
        <TopicsList
          v-if="currentTab === 'topics'"
          :kg-data="kgData"
          :teacher-data="teacherData"
        />
        <Baseline v-if="currentTab === 'baseline'" />
        <CourseMap v-if="currentTab === 'course'" />
        <Ontology v-if="currentTab === 'ontology'" :kg-data="kgData" />
      </template>
    </main>
  </div>
</template>
