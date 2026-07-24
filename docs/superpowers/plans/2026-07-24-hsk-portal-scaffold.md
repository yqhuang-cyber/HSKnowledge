# HSK Portal Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `hsk-portal` into the agreed Vue/Vite layout with Header/Tabs, nine panel shells, global CSS, and live fetch of `public` JSON/JSON-LD data.

**Architecture:** `App.vue` owns tab state and loads `kg_data.json` + `teacher_data.json`, passing them as props. Panel components are presentational shells (plus a minimal `GraphView` using `vis-network`). `Ontology.vue` fetches `ontology.jsonld` itself. No router, no Pinia.

**Tech Stack:** Vue 3 (`script setup`), Vite 8, `vis-network` (already in `package.json`)

**Spec:** `docs/superpowers/specs/2026-07-24-hsk-portal-scaffold-design.md`

## Global Constraints

- Stay inside `hsk-portal/` for app code; do not invent a second app root.
- Data files already exist at `public/kg_data.json`, `public/teacher_data.json`, `public/ontology.jsonld` — do not regenerate them.
- No new dependencies unless build fails without them.
- No git repository at workspace root — **skip all commit steps** (do not `git init` unless the user asks).
- No unit-test framework in the project — verify with file layout checks + `npm run build`.
- Scope is scaffold only: shells + minimal graph; do not rebuild full teacher-portal business UI.

## File Map

| Path | Responsibility |
|------|----------------|
| `hsk-portal/src/assets/main.css` | Global base styles |
| `hsk-portal/src/main.js` | Create app, import `main.css`, mount `#app` |
| `hsk-portal/src/App.vue` | Header, tabs, data fetch, panel switching |
| `hsk-portal/src/components/Overview.vue` | Overview shell |
| `hsk-portal/src/components/GraphView.vue` | Minimal vis-network graph |
| `hsk-portal/src/components/WordsList.vue` | Words shell |
| `hsk-portal/src/components/GrammarList.vue` | Grammar shell |
| `hsk-portal/src/components/CharsList.vue` | Characters shell |
| `hsk-portal/src/components/TopicsList.vue` | Topics shell |
| `hsk-portal/src/components/Baseline.vue` | Baseline shell |
| `hsk-portal/src/components/CourseMap.vue` | Course map shell |
| `hsk-portal/src/components/Ontology.vue` | Ontology fetch + summary |
| `hsk-portal/index.html` | Title update only |
| Delete: `src/style.css`, `src/components/HelloWorld.vue`, unused demo assets under `src/assets/` | Cleanup |

---

### Task 1: Global CSS, entry, and cleanup

**Files:**
- Create: `hsk-portal/src/assets/main.css`
- Modify: `hsk-portal/src/main.js`
- Modify: `hsk-portal/index.html`
- Delete: `hsk-portal/src/style.css`
- Delete: `hsk-portal/src/components/HelloWorld.vue`
- Delete: `hsk-portal/src/assets/vue.svg`, `hsk-portal/src/assets/vite.svg`, `hsk-portal/src/assets/hero.png` (if present)

**Interfaces:**
- Consumes: none
- Produces: `main.js` mounts `App` and loads global CSS; demo Vite UI removed

- [ ] **Step 1: Write `src/assets/main.css`**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

body {
  font-family: 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: #f7fafc;
  color: #2d3748;
  -webkit-font-smoothing: antialiased;
}

#app {
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
}

.section h2 {
  margin: 0 0 16px;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a202c;
}

.panel-placeholder {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 24px;
  color: #4a5568;
  line-height: 1.6;
}

.panel-placeholder ul {
  margin: 8px 0 0;
  padding-left: 1.25rem;
}

.loading,
.error {
  padding: 24px;
  color: #718096;
}

.error {
  color: #c53030;
}
```

- [ ] **Step 2: Replace `src/main.js`**

```js
import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 3: Update `index.html` title**

Set `<html lang="zh-CN">` and `<title>HSK1 知识图谱 · 教师门户</title>`. Keep `#app` and `/src/main.js` entry.

- [ ] **Step 4: Delete demo files**

Remove `src/style.css`, `src/components/HelloWorld.vue`, and unused `src/assets/{vue.svg,vite.svg,hero.png}` if they exist.

- [ ] **Step 5: Verify cleanup**

Run:

```bash
test ! -f hsk-portal/src/style.css \
  && test ! -f hsk-portal/src/components/HelloWorld.vue \
  && test -f hsk-portal/src/assets/main.css \
  && echo OK
```

Expected: `OK`

- [ ] **Step 6: Commit** — skip (no git repo)

---

### Task 2: Panel shell components (8 non-graph panels)

**Files:**
- Create: `hsk-portal/src/components/Overview.vue`
- Create: `hsk-portal/src/components/WordsList.vue`
- Create: `hsk-portal/src/components/GrammarList.vue`
- Create: `hsk-portal/src/components/CharsList.vue`
- Create: `hsk-portal/src/components/TopicsList.vue`
- Create: `hsk-portal/src/components/Baseline.vue`
- Create: `hsk-portal/src/components/CourseMap.vue`
- Create: `hsk-portal/src/components/Ontology.vue`

**Interfaces:**
- Consumes: props `kgData: Object | null`, `teacherData: Object | null` (Ontology needs neither)
- Produces: named default exports usable from `App.vue`

Shared pattern for shells that take `kgData` (and optionally `teacherData`): if prop is null, show `.loading`「数据加载中…」; else show `.section` with title + `.panel-placeholder` summary.

- [ ] **Step 1: Create `Overview.vue`**

```vue
<script setup>
import { computed } from 'vue'

const props = defineProps({
  kgData: { type: Object, default: null },
})

const summary = computed(() => {
  if (!props.kgData) return null
  const nodes = props.kgData.nodes || []
  const byType = nodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1
    return acc
  }, {})
  return {
    title: props.kgData.metadata?.title,
    version: props.kgData.metadata?.version,
    nodeCount: nodes.length,
    edgeCount: (props.kgData.edges || []).length,
    byType,
  }
})
</script>

<template>
  <div class="section">
    <h2>总览</h2>
    <div v-if="!kgData" class="loading">数据加载中…</div>
    <div v-else class="panel-placeholder">
      <p>{{ summary.title }} · v{{ summary.version }}</p>
      <ul>
        <li>节点：{{ summary.nodeCount }}</li>
        <li>边：{{ summary.edgeCount }}</li>
        <li v-for="(count, type) in summary.byType" :key="type">{{ type }}：{{ count }}</li>
      </ul>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create `WordsList.vue`**

Props: `kgData`, `teacherData`. Summary: Word node count from `kgData.nodes`; category count from `Object.keys(teacherData.words_by_category || {})`.

- [ ] **Step 3: Create `GrammarList.vue`**

Props: `kgData`, `teacherData`. Summary: GrammarPoint count; `Object.keys(teacherData.grammar_by_category || {}).length` categories.

- [ ] **Step 4: Create `CharsList.vue`**

Props: `kgData`. Summary: count of nodes with `type === 'Character'`.

- [ ] **Step 5: Create `TopicsList.vue`**

Props: `kgData`, `teacherData`. Summary: Topic node count; `Object.keys(teacherData.topics_with_words || {}).length` topics.

- [ ] **Step 6: Create `Baseline.vue`**

Props: `teacherData`. Summary: keys under `teacherData.compliance` and `teacherData.proficiency_stats` (list key names / nested list lengths if arrays).

- [ ] **Step 7: Create `CourseMap.vue`**

Props: `kgData`. Summary: show `kgData.metadata.course_extra_words` if present, else「暂无课程映射摘要」; count nodes where `course_coverage` is truthy if that field exists.

- [ ] **Step 8: Create `Ontology.vue`**

No props from App. On mount:

```js
const ontology = ref(null)
const error = ref(null)
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
```

Template: title「本体模型」; on error show `.error`; while null show loading; else show `@context` key count and top-level keys (or a truncated `JSON.stringify(ontology, null, 2)` in a `<pre>` max-height scroll).

- [ ] **Step 9: Verify files exist**

```bash
for f in Overview WordsList GrammarList CharsList TopicsList Baseline CourseMap Ontology; do
  test -f "hsk-portal/src/components/$f.vue" || exit 1
done
echo OK
```

Expected: `OK`

- [ ] **Step 10: Commit** — skip (no git repo)

---

### Task 3: GraphView with vis-network

**Files:**
- Create: `hsk-portal/src/components/GraphView.vue`

**Interfaces:**
- Consumes: `kgData: Object | null` with `nodes[]` (`id`, `name_zh`, `type`) and `edges[]` (`from`, `to`)
- Produces: Network instance in `#graph-container` when `kgData` is set

- [ ] **Step 1: Create `GraphView.vue`**

```vue
<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Network, DataSet } from 'vis-network/standalone'

const props = defineProps({
  kgData: { type: Object, default: null },
})

const graphContainer = ref(null)
let network = null

const destroyGraph = () => {
  if (network) {
    network.destroy()
    network = null
  }
}

const initGraph = () => {
  if (!props.kgData || !graphContainer.value) return
  destroyGraph()

  const nodes = new DataSet(
    props.kgData.nodes.map((n) => ({
      id: n.id,
      label: n.name_zh || n.id,
      group: n.type,
    }))
  )

  const edges = new DataSet(
    props.kgData.edges.map((e, i) => ({
      id: e.id || `e-${i}`,
      from: e.from,
      to: e.to,
    }))
  )

  network = new Network(
    graphContainer.value,
    { nodes, edges },
    {
      physics: { enabled: true, stabilization: { iterations: 200 } },
      interaction: { hover: true },
    }
  )
}

watch(
  () => props.kgData,
  (val) => {
    if (val) initGraph()
  }
)

onMounted(() => {
  if (props.kgData) initGraph()
})

onBeforeUnmount(() => {
  destroyGraph()
})
</script>

<template>
  <div class="section">
    <h2>知识图谱交互式可视化</h2>
    <div v-if="!kgData" class="loading">数据加载中…</div>
    <div v-show="kgData" ref="graphContainer" id="graph-container"></div>
  </div>
</template>

<style scoped>
#graph-container {
  width: 100%;
  height: calc(100vh - 220px);
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
</style>
```

If `import { Network, DataSet } from 'vis-network/standalone'` fails at build time, fall back to:

```js
import { Network } from 'vis-network/standalone'
import { DataSet } from 'vis-data/standalone'
```

(`vis-data` is already a transitive dependency of `vis-network`.)

- [ ] **Step 2: Commit** — skip (no git repo)

---

### Task 4: App.vue shell (Header + Tabs + fetch)

**Files:**
- Create/Overwrite: `hsk-portal/src/App.vue`

**Interfaces:**
- Consumes: all nine components from Task 2–3
- Produces: fetches `/kg_data.json` and `/teacher_data.json`; passes props; `currentTab` drives `v-if` panels

- [ ] **Step 1: Write full `App.vue`**

```vue
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
      <div v-if="loadError" class="error">数据加载失败：{{ loadError }}</div>
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
        <Baseline v-if="currentTab === 'baseline'" :teacher-data="teacherData" />
        <CourseMap v-if="currentTab === 'course'" :kg-data="kgData" />
        <Ontology v-if="currentTab === 'ontology'" />
      </template>
    </main>
  </div>
</template>

<style scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 32px;
}
.header h1 {
  margin: 0 0 6px;
  font-size: 1.5rem;
}
.subtitle {
  opacity: 0.9;
  font-size: 0.9rem;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 32px;
}
.tab {
  padding: 14px 20px;
  cursor: pointer;
  color: #718096;
  user-select: none;
}
.tab.active {
  color: #5a67d8;
  border-bottom: 3px solid #5a67d8;
}
.content {
  padding: 24px 32px;
  max-width: 1600px;
  margin: 0 auto;
}
</style>
```

Note: In templates use kebab-case props (`:kg-data`) matching `kgData` in script `defineProps`.

- [ ] **Step 2: Commit** — skip (no git repo)

---

### Task 5: Build verification

**Files:** none new

- [ ] **Step 1: Confirm public data filenames**

```bash
test -f hsk-portal/public/kg_data.json \
  && test -f hsk-portal/public/teacher_data.json \
  && test -f hsk-portal/public/ontology.jsonld \
  && echo OK
```

Expected: `OK`

- [ ] **Step 2: Confirm component tree**

```bash
find hsk-portal/src -type f | sort
```

Expected to include: `assets/main.css`, `main.js`, `App.vue`, and all nine `components/*.vue`. Must not include `HelloWorld.vue` or `style.css`.

- [ ] **Step 3: Production build**

```bash
cd hsk-portal && npm run build
```

Expected: Vite build succeeds (exit 0). If GraphView import fails, apply the `vis-data` fallback from Task 3 and rebuild.

- [ ] **Step 4: Optional smoke (dev server)**

```bash
cd hsk-portal && npm run dev -- --host 127.0.0.1 --port 5173
```

Manually: open app, switch all 9 tabs, confirm overview counts look non-zero, graph canvas appears, ontology tab shows JSON keys. Stop server when done.

- [ ] **Step 5: Commit** — skip (no git repo)

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Directory layout + `main.css` | 1 |
| Nine panel components | 2–3 |
| `App.vue` Header/Tabs/fetch | 4 |
| Remove HelloWorld / default style | 1 |
| Ontology self-fetch | 2 Step 8 |
| Minimal GraphView | 3 |
| Acceptance via build/dev | 5 |

## Placeholder scan

No TBD / “implement later” left in task steps.

## Type / naming consistency

- Prop names: `kgData`, `teacherData` in script; `:kg-data`, `:teacher-data` in template.
- Tab ids: `overview | graph | words | grammar | chars | topics | baseline | course | ontology`.
- Fetch paths: `/kg_data.json`, `/teacher_data.json`, `/ontology.jsonld`.
