# HSK1 知识图谱 · 教师门户

面向 HSK1 教师的本地知识工具：用可视化方式查看**词汇、汉字、语法、话题、任务**之间的关系，并对照 **2026 实施版考纲** 与 **Kai HSK1 课程** 的覆盖情况。

同一套数据也支撑 **本地检索知识库**（`kb-service`）：给课堂陪练 / 大模型做知识点召回，可对接火山 RealtimeAPI 的 **`ChatRAGText`**（关键词 + 本地向量混合检索）。

> 数据版本：**HSK1 知识图谱 v2.1**（约 719 个知识点、941 条关系；检索侧约 718 个知识块）

---

## 这个门户能帮你做什么？

| 你想了解的 | 去哪个标签页 |
|------------|--------------|
| 整体规模：有多少词、字、语法、话题 | **总览** |
| 知识点之间怎么连在一起 | **图谱可视化**（可点击节点看详情） |
| 按分类浏览词汇 / 搜索拼音 | **词汇清单** |
| 按语法类别查看语法点与例句 | **语法点** |
| 汉字、部首、笔画、是否考纲内 | **汉字** |
| 16 个一级话题及课程覆盖情况 | **话题** |
| 听读写说要达到什么掌握度 | **达标基线** |
| Kai 30 Missions 对应哪些主题 | **课程映射** |
| 知识是按什么「类」组织的（本体） | **本体模型** |

---

## 怎么打开（教师 / 非技术同事）

电脑上需要先安装 [Node.js](https://nodejs.org/)（建议 LTS 版本）。然后：

1. 打开终端（Mac 可用「终端」App）
2. 进入本项目目录，例如：

```bash
cd hsk-portal
```

3. 第一次使用，安装依赖（只需做一次）：

```bash
npm install
```

4. 启动本地预览：

```bash
npm run dev
```

5. 终端里会出现一个本地地址（通常是 `http://localhost:5173`）。用浏览器打开即可。

不用时在终端按 `Ctrl + C` 结束即可。

> 说明：数据都在本机 `public/` 文件夹里，**不会上传你的备课内容**；打开后也无需登录。

---

## 图谱可视化：怎么用？

1. 打开 **图谱可视化** 标签页。  
2. 上方彩色小标签可筛选：任务 / 话题 / 词汇 / 汉字 / 语法。  
3. **拖拽**节点、**滚轮**缩放。  
4. **点击**某个节点：右侧「本体检视」会显示：
   - 它属于哪一类（如：词汇、汉字）
   - 类的说明与上级分类路径
   - 拼音、词性、掌握度、是否考纲内等属性
   - 和其他知识点的关系（可再点邻居继续查看）
5. 点击画布空白处，或点侧栏右上角 **×**，可关闭详情。

颜色大致含义：

- 红：任务 · 橙：话题 · 蓝：词汇 · 绿：汉字 · 紫：语法  
- 灰色节点：考纲外补充（如课程用词、文化词）

---

## 项目里有什么？（给想改数据 / 开发的人）

```
hsk-portal/
├── public/                      # 静态数据（改完刷新页面即可）
│   ├── kg_data.json             # 知识图谱：节点 + 关系
│   ├── teacher_data.json        # 教案向分类（词汇/语法/话题等）
│   └── ontology.jsonld          # 本体模型（类、属性定义）
├── kb/                          # 检索产物（由脚本生成，勿手改）
│   ├── chunks.jsonl             # 知识块
│   ├── embeddings.f32           # 向量矩阵（二期）
│   └── embeddings.meta.json
├── kb-service/                  # 本地检索 API（默认 hybrid）
│   ├── requirements.txt         # Python：fastembed（向量）
│   └── src/                     # Node 服务 + Python embed worker
├── scripts/
│   ├── build-chunks.mjs         # public → chunks
│   └── build-embeddings.py      # chunks → embeddings.f32
├── src/                         # 教师门户前端
├── docs/
│   ├── ontology/                # 本体说明 + 建模模版
│   ├── kb/                      # 检索与大模型对接说明
│   └── superpowers/             # 设计稿 / 实现计划
├── package.json
└── vite.config.js
```

常用命令：

```bash
npm run dev              # 本地开发预览（教师门户）
npm run build            # 打包到 dist/
npm run preview          # 预览打包结果
npm run build:chunks     # 从 public 数据生成 kb/chunks.jsonl
npm run build:embeddings # 生成 kb/embeddings.f32（需 Python + fastembed）
```

技术栈：Vue 3 + Vite + vis-network；检索服务 Node（关键词 / 混合）+ Python `fastembed`（`BAAI/bge-small-zh-v1.5`）。

---

## 知识库检索服务（给大模型用）

教师门户负责**给人看**；`kb-service` 负责**给大模型检索**。

### 启动步骤

```bash
# 1) 知识块（改完 public 数据后重跑）
npm run build:chunks

# 2) 向量（二期；口语/语义召回需要）
pip3 install --user -r kb-service/requirements.txt
export HF_ENDPOINT=https://hf-mirror.com   # 若 huggingface.co 超时
npm run build:embeddings

# 3) 检索服务
cd kb-service && npm start
# → http://127.0.0.1:8787
```

未生成 `embeddings.f32` 时服务仍可启动：`hybrid` 会降级为纯关键词。

### 能力一览

| 能力 | 说明 |
|------|------|
| `POST /retrieve` | 检索知识点；默认 **`mode=hybrid`**（关键词 + 向量融合） |
| `mode` | `keyword` / `vector` / `hybrid` |
| `format: "chat_rag_text"` | 响应多返回 `rag_text`，可直接作火山 **`ChatRAGText`** |
| `GET /health` · `GET /stats` | 健康检查；`stats` 含向量是否已加载 |

示例：

```bash
curl -s -X POST http://127.0.0.1:8787/retrieve \
  -H 'content-type: application/json' \
  -d '{"query":"点餐","top_k":5,"mode":"hybrid","format":"chat_rag_text"}'
```

完整对接说明：[docs/kb/retrieve-for-llm.md](./docs/kb/retrieve-for-llm.md)  
二期设计：[docs/superpowers/specs/2026-07-24-hsk1-retrieval-kb-phase2-vector-design.md](./docs/superpowers/specs/2026-07-24-hsk1-retrieval-kb-phase2-vector-design.md)

---

## 数据说明（简要）

- **考纲内 / 考纲外补充**：是否严格属于 HSK1 2026 实施范围。  
- **掌握度 L0–L4**：从「未接触」到「流利运用」；总览里会按词汇的「说」目标做统计。  
- **话题课程覆盖**：已覆盖 / 浅覆盖 / 未覆盖，对应 Kai HSK1 课程是否训到该话题。  
- **本体**：用统一的「类」和「关系」描述知识点（例如：词由汉字组成、话题关联词汇）。图谱侧栏就是用这套说法来解释你点中的节点。  
  - 说明文档与建模模版见：[docs/ontology/](./docs/ontology/)（含 [ONTOLOGY.md](./docs/ontology/ONTOLOGY.md)、JSON-LD / OWL 模版）  
  - 门户运行时加载：`public/ontology.jsonld`

更新数据时：替换 `public/` 下对应 JSON / JSON-LD 文件后刷新页面。注意节点 `id` 不要重复（例如不要出现两个相同的 `word-字`），否则图谱可能报错。

若要做 **HSK2 / HSK3 / 商务汉语** 等新本体：复制 `docs/ontology/`，按该目录 [README](./docs/ontology/README.md) 修改 namespace 与类即可。

---

## 仓库

GitHub：https://github.com/yqhuang-cyber/HSKnowledge

若使用中遇到页面打不开、数据加载失败等问题，请检查：

1. 是否在 `hsk-portal` 目录下执行了 `npm install` / `npm run dev`  
2. 浏览器控制台是否提示某个 `public/*.json` 找不到  
3. Node.js 版本是否过旧（建议 18+）  
4. 检索服务向量不可用：是否安装了 `kb-service/requirements.txt`、是否跑过 `npm run build:embeddings`（国内可设 `HF_ENDPOINT=https://hf-mirror.com`）

---

## 许可与用途

本项目用于 HSK1 教学研究与备课参考。考纲与课程内容请以官方最新文件及本校教学安排为准。
