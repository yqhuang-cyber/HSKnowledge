# HSK Portal 原版 UI 还原设计

**日期:** 2026-07-24  
**状态:** 已实现  
**来源:** `/Users/yuqinghuang/Downloads/HSK1 教师门户 v7（含本体模型）.html`  
**范围:** 方案 A — 九个 Tab 的样式与交互对齐原 HTML（不含 MiniMax 浮球）

## 目标

在现有 Vue/Vite 目录骨架上，把原单页的视觉与行为迁入对应组件，使词汇清单、语法点等 Tab 与原版一致，而不再是摘要空壳。

## 非目标

- 不改 `public/` 数据文件内容（图谱去重仍在 `GraphView` 渲染层处理）
- 不引入路由/Pinia
- 不移植 MiniMax 浮球广告代码

## 样式策略

- 将原 HTML `<style>`（约 L6–L178）整体迁入 `src/assets/main.css`，替换当前精简全局样式。
- `App.vue` 的 Header/Tabs 样式与原版对齐（可用全局类，减少 scoped 冲突）；组件内仅保留必要局部样式。
- 保留现有类名：`stats-grid`、`word-card`、`grammar-group`、`character-card`、`topic-card`、`chip`、`tag-*`、`ont-*` 等。

## 组件职责（1:1 映射原 `render*`）

| 组件 | 对齐原函数/区块 | 行为 |
|------|----------------|------|
| `Overview.vue` | `renderOverview` + 静态课程覆盖文案 | 统计卡、合规、掌握度、Kai 覆盖 |
| `GraphView.vue` | `initGraph` + filter chips | 颜色/形状/物理引擎对齐；类型过滤；**保留 id 去重** |
| `WordsList.vue` | `renderWords` | 搜索 + 分类 chips + word-grid |
| `GrammarList.vue` | `renderGrammar` | 搜索 + 按 `grammar_by_category` 分组 |
| `CharsList.vue` | `renderChars` | 搜索 + 考纲内/外 chips + character-card |
| `TopicsList.vue` | `renderTopics` | covered/shallow/uncovered chips + topic-card |
| `Baseline.vue` | `#baseline` 静态 HTML | 量表/基线表/自评清单（静态） |
| `CourseMap.vue` | `#course` 静态 HTML | 说明 + M1–M30 映射表（静态） |
| `Ontology.vue` | `renderOntology` | fetch JSON-LD；类树/属性/实例映射/原则 |

`App.vue`：继续负责 Tabs + 加载 `kg_data`/`teacher_data`；Ontology 自取 `ontology.jsonld`。

## 数据与交互细节

- **Words：** 分类来自 `teacherData.words_by_category`；过滤用 category 内 `id` 集合；搜索匹配 `name_zh` / `pinyin`。
- **Grammar：** 分类按条目数降序；搜索匹配 `name_zh` / `example`。
- **Chars：** `compliance` 过滤（`考纲内` / `考纲外补充`）。
- **Topics：** `teacherData.topics_with_words[*].course_coverage`；词展示前 30 个。
- **Graph：** 节点着色与原 `colors`/`shape`/`size` 一致；过滤时只显示该 type 及两端都在集合内的边；构建 DataSet 前去重节点 id（修 `word-字`）。

## 验收

1. 九个 Tab 视觉与原 HTML 同构（布局、颜色、卡片、表格）。
2. 词汇/语法/汉字/话题的搜索与 chips 可用。
3. 图谱可过滤类型且不再因重复 id 崩溃。
4. 本体 Tab 显示类树与属性网格。
5. `npm run build` 通过。

## 实现顺序

1. 替换 `main.css` + 微调 `App.vue`  
2. Overview → Words → Grammar → Chars → Topics  
3. Baseline / CourseMap 静态迁入  
4. GraphView 样式+过滤（保留去重）  
5. Ontology 完整渲染  
6. build 验收  
