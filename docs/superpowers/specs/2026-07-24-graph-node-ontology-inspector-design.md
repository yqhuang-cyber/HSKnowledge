# 图谱节点本体检视侧栏设计

**日期:** 2026-07-24  
**状态:** 已实现  
**范围:** 图谱可视化 Tab — 点击节点后，右侧固定侧栏从本体视角展示实例信息

## 目标

教师在「图谱可视化」中点击任一节点，右侧侧栏展示该实例的本体视角信息：所属类与父类路径、适用数据属性值、对象属性邻居关系；可点击邻居切换检视对象。

## 非目标

- 不实现可编辑本体 / 写回 JSON
- 不做完整 RDF 三元组浏览器（方案 C）
- 不在其他 Tab（词汇清单等）复用检视器（本轮仅 GraphView；映射模块可预留复用）
- 不改变 `public/` 源数据；图谱渲染层继续做节点 id 去重

## 交互与布局

- **形态：** 右侧固定侧栏（约 360px），与图谱并排：`display: grid; grid-template-columns: 1fr 360px`
- **未选中：** 侧栏占位「点击节点查看本体信息」
- **选中：** 展示检视内容；右上角关闭按钮清空选中
- **点空白画布：** 取消选中（`deselectNode` / 点击非节点）
- **点邻居：** 切换 `selectedNodeId`；若该邻居仍在当前过滤可见集合中，则 `network.focus` / `selectNodes`

## 侧栏信息结构（深度 B）

1. **抬头**
   - `name_zh`（大标题）
   - 类型色标（与图谱配色一致）+ `type` 中文标签
   - 实例 id（等宽小字，如 `word-爱`）

2. **本体类**
   - `rdf:type` → `hsk1:{Type}`（由 `node.type` 映射）
   - 类的 `name_zh`、`comment_zh`（来自 `ontology.jsonld`）
   - **父类路径**面包屑：从根 `hsk1:HSKKnowledgePoint` 到当前类（经 `subClassOf` 上溯）

3. **数据属性**
   - 仅展示「对该类（或祖先类）声明 domain、且实例有值」的字段
   - 字段映射见下表；值为空 / 缺省则跳过

4. **对象属性 / 关系**
   - 按图谱边映射到本体对象属性
   - 分「出边（本节点为 from）」「入边（本节点为 to）」
   - 每条：属性中文名 + 谓词 id + 邻居 `name_zh`（可点）

## 映射表

### 节点类型 → 本体类

| `node.type` | 本体类 |
|-------------|--------|
| Word | `hsk1:Word` |
| Character | `hsk1:Character` |
| GrammarPoint | `hsk1:GrammarPoint` |
| Topic | `hsk1:Topic` |
| Task | `hsk1:Task` |

（若日后有更细子类映射，如按 `pos`→`hsk1:Verb`，可作为增强，本轮不做。）

### 边类型 → 对象属性

| `edge.type` | 对象属性 | 中文名（优先用 ontology） |
|-------------|---------|---------------------------|
| requires | `hsk1:requires` | 前置依赖 |
| composes | `hsk1:composedOf` | 由...组成 |
| enables | `hsk1:enables` | 使能 |
| relates-to | `hsk1:relatesTo` | 相关 |

注意：图谱边方向可能与 ontology domain/range 习惯不完全一致（例如 `composes` 常为 `char → word`）。侧栏按**实际边方向**标注「出/入」，并显示映射后的属性名，不强制改写边方向。

### 数据属性 ← 实例字段

| 本体数据属性 | 实例字段 | 适用类型（示意） |
|--------------|----------|------------------|
| `hasName` | `name_zh` | 全部 |
| `hasPinyin` | `pinyin` | Word / Character |
| `hasDefinition` | `definition` 或 `meaning_full` | Word 等 |
| `hasEnglishDefinition` | `name_en` | Character |
| `hasExample` | `example` | Word / GrammarPoint |
| `hasHSKLevel` | `hsk_level` | 全部 |
| `hasPartOfSpeech` | `pos` | Word |
| `hasRadical` | `radical` | Character |
| `hasStrokeCount` | `strokes` | Character |
| `hasSubTopics` | `sub_topics`（数组 join） | Topic |
| `isInSyllabus` | 由 `compliance === '考纲内'` 推导 | 全部 |
| `hasProficiencyLevel` | `proficiency_target`（展开听/说/读/写） | 有该字段的节点 |

未列入但有展示价值的实例字段（如 `course_coverage`、`category`、`subcategory`）可放在侧栏底部「其他属性」小节，不强制挂 ontology 谓词。

## 架构

```
GraphView.vue
  ├─ 图谱 + filter chips
  ├─ selectedNodeId / clear / neighbor navigate
  └─ NodeInspector.vue
        props: node, neighbors, ontologyIndex

src/utils/ontologyMap.js
  ├─ loadOntology() / indexOntology(jsonld)
  ├─ typeToClassId(type)
  ├─ edgeTypeToProp(edgeType)
  ├─ getClassMeta(classId)
  ├─ getAncestorPath(classId)
  └─ buildDatatypeFacts(node, classId)
```

- 首次进入图谱 Tab 或首次打开检视时 `fetch('/ontology.jsonld')` 并缓存索引
- 邻居列表由 `kgData.edges` + 去重后的 `nodesById` 计算

## UI 约束

- 侧栏样式沿用现有 portal：白底、圆角 section、tag / chip 色系；类型色与图谱 `colors` 一致
- 长文本（例句）可折叠或限高滚动
- 父类路径过长时单行省略 + title 悬停全路径

## 验收标准

1. 点击任意可见节点，右侧出现该节点检视；关闭或点空白可清空
2. 侧栏含：类 id、类说明、父类路径、至少若干有值数据属性、入/出关系列表
3. 点击关系中的邻居可切换到该邻居的检视
4. 在类型过滤后，仅对当前可见节点可点；不可见邻居仍可在列表中展示名称，点击时若不可见则只切换侧栏、不强行 focus
5. `npm run build` 通过；原有图谱过滤与去重行为不回归

## 文件变更（预期）

- 修改：`src/components/GraphView.vue`
- 新增：`src/components/NodeInspector.vue`
- 新增：`src/utils/ontologyMap.js`
- 可选微调：`src/assets/main.css`（侧栏相关类）
