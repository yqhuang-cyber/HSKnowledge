# HSK Portal 目录骨架设计

**日期:** 2026-07-24  
**状态:** 已确认；实现计划见 `docs/superpowers/plans/2026-07-24-hsk-portal-scaffold.md`  
**范围:** 方案 A — 按目标目录搭齐可运行骨架；业务 UI 后续补齐

## 目标

将现有 Vite + Vue 默认脚手架调整为约定目录结构，接入 `public` 下已有数据文件，挂上 Header/Tabs 与各面板空壳，保证 `npm run dev` 可切换标签并加载 JSON。

## 非目标（本轮不做）

- 完整还原原单页各面板业务逻辑与筛选交互
- 图谱节点样式/过滤 chips 的完整实现（`GraphView` 仅最小可渲染）
- 设计系统重构、路由库、状态管理库

## 目录结构

```
hsk-portal/
├── public/
│   ├── kg_data.json          # 已就绪（由 knowledge_graph.json 重命名）
│   ├── teacher_data.json     # 已就绪
│   └── ontology.jsonld       # 已就绪（由 hsk1-ontology.jsonld 重命名）
├── src/
│   ├── assets/
│   │   └── main.css          # 全局基础样式（原 <style> 中的全局部分）
│   ├── components/
│   │   ├── Overview.vue
│   │   ├── GraphView.vue
│   │   ├── WordsList.vue
│   │   ├── GrammarList.vue
│   │   ├── CharsList.vue
│   │   ├── TopicsList.vue
│   │   ├── Baseline.vue
│   │   ├── CourseMap.vue
│   │   └── Ontology.vue
│   ├── App.vue
│   └── main.js
├── index.html
├── package.json
└── vite.config.js
```

## 架构

```
main.js
  └─ App.vue
       ├─ Header + Tabs（本地 currentTab）
       ├─ onMounted: fetch /kg_data.json, /teacher_data.json
       └─ 按 tab 条件渲染子组件，传入 kgData / teacherData
            └─ Ontology.vue 自行 fetch /ontology.jsonld
```

- 数据流：JSON 静态放 `public/`，运行时 `fetch`；不做 pinia/vuex。
- 图谱：`GraphView` 使用已安装的 `vis-network`，按用户提供的骨架在 `kgData` 就绪后初始化 Network。
- 其余面板：空壳展示标题 + 简要数据摘要（如节点数、分类数），便于确认 props 接通。

## Tabs 清单

| id | 名称 | 组件 |
|----|------|------|
| overview | 总览 | Overview |
| graph | 图谱可视化 | GraphView |
| words | 词汇清单 | WordsList |
| grammar | 语法点 | GrammarList |
| chars | 汉字 | CharsList |
| topics | 话题 | TopicsList |
| baseline | 达标基线 | Baseline |
| course | 课程映射 | CourseMap |
| ontology | 本体模型 | Ontology |

## 样式

- `src/assets/main.css`：全局 reset、页面背景、`.app-container` 等基础样式。
- `App.vue` scoped：Header / Tabs / content（沿用用户提供的样式）。
- 各面板 scoped：各自容器样式。
- 删除 Vite 默认 `src/style.css` 与 HelloWorld / 演示资源引用。

## 清理项

- 移除 `src/components/HelloWorld.vue`
- 移除或停止引用 `src/style.css`、`src/assets/vue.svg` / `hero.png` / `vite.svg`（演示资源）
- 保留 `public/favicon.svg`（可选保留 `icons.svg`）

## 错误处理

- `App.vue` fetch 失败时 `console.error`，界面显示简短「数据加载失败」提示；子组件在 `kgData == null` 时显示加载中占位。

## 验收标准

1. 目录与上表一致（含 9 个面板文件 + `main.css`）。
2. `npm run dev` 启动后可切换全部 Tabs。
3. Network 中可见对 `/kg_data.json`、`/teacher_data.json` 的成功请求。
4. Graph 标签在数据加载后能画出基础节点/边（最小配置）。
5. Ontology 标签能请求并展示 `/ontology.jsonld` 的摘要或原始片段。

## 后续迭代

用户继续提供各面板完整源码或原 HTML `<style>` 时，在现有空壳上替换实现即可，不必再改目录。
