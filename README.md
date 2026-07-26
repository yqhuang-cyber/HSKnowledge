# HSK1 知识系统（教师门户 + 检索知识库）

本仓库（[HSKnowledge](https://github.com/yqhuang-cyber/HSKnowledge)）是一套 **HSK1 本地知识系统**：同一份考纲 / 课程知识，拆成两个可独立启动的服务——给人看的教师门户，和给大模型用的检索 API。

> 数据版本：**HSK1 知识图谱 v2.1**（约 719 个知识点、941 条关系；检索侧约 718 个知识块）

---

## 系统里有什么？

| 组成部分 | 是什么 | 地址 / 产物 |
|----------|--------|-------------|
| **教师门户** | Vue 网页：总览、图谱、词汇 / 语法 / 汉字 / 话题等 | `http://localhost:5173` |
| **检索服务（RAG）** | HTTP API：按学生发言召回相关知识点，可对接火山 `ChatRAGText` | `http://127.0.0.1:8787` |
| **原始数据** | 图谱、教案分类、本体 | `public/*.json` / `ontology.jsonld` |
| **检索产物** | 知识块 + 本地向量（脚本生成） | `kb/chunks.jsonl`、`kb/embeddings.f32` |
| **本体文档** | 类 / 关系说明与复用模版 | `docs/ontology/` |
| **对接文档** | 检索 API 速查 | `docs/kb/retrieve-for-llm.md` |
| **RAG 实现方案** | 教学场景、召回机制、向量化、外挂对接（给 AI 开发者） | `docs/kb/rag-implementation.md` |

```
                    public/（kg + teacher + ontology）
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     教师门户（Vite / Vue）            scripts/build-chunks
     npm run dev → :5173              scripts/build-embeddings
     给人看图谱与清单                         │
                                              ▼
                                         kb/ + kb-service
                                      npm start → :8787
                                   给程序 / LLM 做检索
```

两套服务 **互不依赖**：只备课开门户即可；只接陪练 / Realtime 开检索即可；需要时两个一起开。

---

## 外挂 AI 看这里：我们的检索 / RAG 方案

若你要做陪练、Realtime、或其它要「挂」本仓库知识的 AI 应用，请先读：

**→ [docs/kb/rag-implementation.md](./docs/kb/rag-implementation.md)**（教学场景 + 召回机制 + 向量化 + 对接契约）

### 方案要点（摘要）

1. **场景**：课堂对话 / 口语陪练（教育类 App 的「AI 老师问答」同类）；召回相关 HSK1 知识点作**参考**，本阶段不强行卡模型是否超纲。  
2. **分工**：本仓库只做 **检索**；**生成**在你们的应用或火山 Realtime 侧完成。  
3. **默认策略**：`hybrid` = **浅召回（关键词 / 标签）** + **轻量向量召回**，再做融合排序。  
4. **向量化包含在方案内**：离线 `BAAI/bge-small-zh-v1.5` → `kb/embeddings.f32`；在线只 embed 当前问句。  
5. **对接**：`POST /retrieve` + `format: "chat_rag_text"` → `rag_text` → 火山 **`ChatRAGText`**（或拼 prompt）。平台不会自动查我们的库。

接口字段速查：[docs/kb/retrieve-for-llm.md](./docs/kb/retrieve-for-llm.md)

### RAG 服务全链路（本仓库负责的检索段）

教育类 AI 老师问答里，常见做法是：**先快速捞一批「长得像」的候选（召回），再排个序交给大模型去讲**。我们的 `kb-service` 正是这段「捞候选 + 排序」；大模型生成不在本服务内。

```
【离线准备】（改知识数据后重跑）
  public/*.json
    → build:chunks     → kb/chunks.jsonl      （知识点文本块 + 类型/考纲等标签）
    → build:embeddings → kb/embeddings.f32    （可选；块的向量矩阵）

【在线一次 /retrieve】（默认 mode=hybrid）
  学生提问 / 发言（query）
        │
        ├─① 浅召回（关键词通道）─────────────┐
        │   字面/子串、标题命中、拼音等         │
        │   + filters 标签过滤（类型/考纲/级别） │
        │                                     │
        ├─② 轻量向量召回（语义通道）───────────┤  各取一批候选（约 top_k×2）
        │   小 embedding 模型，非深度对话大模型   │
        │                                     ▼
        └──────────────────────── ③ 融合排序（轻量）
                                   分数归一化 + 加权（词 0.4 / 向 0.6）
                                   + 考纲内 / 话题任务等小幅加权
                                   → 截断 Top-K → hits / rag_text
                                              │
【外挂 AI】                                    ▼
  rag_text → ChatRAGText / prompt → 大模型生成回复（± TTS）
```

| 阶段 | 本服务有没有 | 说明 |
|------|--------------|------|
| 浅召回 | **有（核心一路）** | 关键词匹配 + 元数据标签过滤，见下节 |
| 轻量语义召回 | **有（并行一路）** | 小向量模型比「意思近不近」，不是用 LLM 做检索 |
| 融合排序 | **有（轻量）** | 两路候选合并打分后截断；**没有**独立精排大模型 / cross-encoder |
| 生成回答 | **无** | 由外挂 AI / 火山等完成 |

单设 `mode=keyword` 时，整次请求几乎只有浅召回 + 按关键词分排序；`mode=vector` 则只有向量一路。

### 浅召回展开说明（教育 AI 老师场景）

在教育类 App 的 AI 老师问答里，**「浅召回」**通常指：面对学生提问时，**第一步先不用复杂的深度语义大模型去「理解整库」**，而是用便宜、快、可解释的办法，从知识点库 / 题库里快速捞出一批「长得像」的候选。

我们实现里，浅召回对应 **`keyword` 通道**（也是 `hybrid` 的一路），具体包括：

| 手段 | 我们怎么做 | 教育场景里像什么 |
|------|------------|------------------|
| **关键词 / 字面匹配** | 问句与 chunk 标题、正文做包含与子串重叠打分 | 学生提到「朋友」「吃饭」，直接捞到同名词条 |
| **题库 / 知识库索引** | 全库扫描约 700+ 块（规模小，暴力即可） | 相当于对知识点库做快速索引扫描 |
| **简单标签分类** | `filters`：`chunk_types`（词/语法/话题…）、`compliance`（考纲内/外）、`hsk_level` | 先限定「只要考纲内词汇+话题」再捞，减少跑偏 |
| **可解释加分** | 标题全等/包含、拼音、考纲内、话题/任务类型等规则加权 | 老师能大致说清「为什么捞到这条」 |

**为什么教育场景特别吃浅召回？**

- **专名准**：词条名、语法点名称、汉字本身，字面命中往往比「瞎猜语义」更稳。  
- **快、稳、成本低**：不调用对话大模型做检索，延迟和费用可控，适合每轮学生话都查一次。  
- **可运营**：标签过滤能对齐考纲 / 课型，产品侧好约束「先从哪类知识里找」。

**浅召回的局限（所以我们还并了向量一路）：**  
只靠字面时，口语换说法容易漏或偏——例如「点餐」可能撞上「钟点 / 时量词」（都有「点」）。因此默认 **hybrid**：浅召回保专名，轻量向量补场景与同义说法，再融合排序。  
**注意：** 这里的向量仍是小型 embedding，**不是**「用深度对话大模型做召回」；深度大模型只出现在链路最后的**生成**阶段（外挂侧）。

```
学生发言 → 你们的 AI → POST :8787/retrieve → rag_text → ChatRAGText / prompt → 模型回复
                              ↑
              浅召回 ∥ 轻量向量 → 融合排序（本服务）
```

### 向量化、embed worker，还要不要「向量数据库」？

容易混淆的三件事：

| 概念 | 我们现在怎么做 | 是不是单独再开一套「向量库服务」 |
|------|----------------|----------------------------------|
| **离线向量化** | `build:embeddings` 把知识块算成 `embeddings.f32` 矩阵文件 | 否，构建脚本跑完即可 |
| **在线给问句算向量** | 新问句没法预先算完；由检索进程内的 **embed worker**（Python `fastembed`）算成同空间向量 | 否，是 `kb-service` 内部小模块，不是独立产品服务 |
| **向量相似度检索** | Node 读本地矩阵，对约 700 块做余弦相似度（暴力扫描） | 否，没有 Faiss / Milvus / Qdrant / VikingDB |

**embed worker 是什么？**  
专门「把一句话变成向量」的常驻小助手（`kb-service/src/py_embed_worker.py`）。主服务管 HTTP、浅召回、融合排序；worker 只负责文字 → 数字向量。之所以用 Python worker，是因为本机 Node 侧 embedding 依赖不好装，改走 `fastembed`；做成常驻可避免每次请求重新加载模型。只用 `mode=keyword` 时一般用不上它。

**所以：向量化之后，还需要再挂一个「向量计算服务」吗？**  
需要的是「给**当前问句**算一下向量」这一步，**不是**再部署一整套向量数据库。知识库向量已经离线算好存在文件里；问句向量由 embed worker 现算；比对在 `kb-service` 进程内完成。

**什么时候才需要上真正的向量数据库服务？**  
当前规模（约 700 块、单机、更新不勤）**还不需要**。出现下面情况再考虑 Faiss / Milvus / Qdrant / 云厂商向量库等：

1. 知识块到 **数万～十万级**，全库暴力扫描变慢或占内存过多  
2. 要复杂的「向量 + 多维过滤」（班级、教材版本、权限等）揉在一条查询里  
3. **多个应用 / 多机**共用同一套向量，并要独立扩容、高可用  
4. **频繁增量**增删改知识点，不愿每次全量重算 `embeddings.f32`  
5. 希望托管运维，把索引交给云知识库 / 向量库  

**一句话：** 块少、单机本地 → 继续「矩阵文件 + embed worker」；库很大、要共用或高频增量 → 再上向量数据库。

---

## 两套服务怎么启动？

前提：安装 [Node.js](https://nodejs.org/)（建议 18+）。进入本仓库目录（若克隆后是仓库根目录，则已在此；若在上级目录则 `cd hsk-portal`）：

```bash
npm install
```

### 1）教师门户（给人看）

```bash
npm run dev
```

浏览器打开 **http://localhost:5173/**  
不用时在终端按 `Ctrl + C`。

### 2）检索 / RAG 服务（给大模型）

仓库里一般已带好 `kb/chunks.jsonl` 与 `kb/embeddings.f32`。改过 `public/` 数据后需重跑构建：

```bash
npm run build:chunks
pip3 install --user -r kb-service/requirements.txt   # 首次 / 向量相关
export HF_ENDPOINT=https://hf-mirror.com             # 国内拉模型可选
npm run build:embeddings                             # 可选；没有则 hybrid 降级为关键词
cd kb-service && npm start
```

- 根地址说明：http://127.0.0.1:8787/（这是 API，不是网页）  
- 健康检查：http://127.0.0.1:8787/health  
- 状态：http://127.0.0.1:8787/stats  

默认检索模式 **`hybrid`**（关键词 + 本地向量 `BAAI/bge-small-zh-v1.5`）。

```bash
curl -s -X POST http://127.0.0.1:8787/retrieve \
  -H 'content-type: application/json' \
  -d '{"query":"点餐","top_k":5,"mode":"hybrid","format":"chat_rag_text"}'
```

完整对接（含火山 Realtime **外部 RAG / ChatRAGText**）：[docs/kb/retrieve-for-llm.md](./docs/kb/retrieve-for-llm.md)

---

## 教师门户能做什么？

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

### 图谱怎么用？

1. 打开 **图谱可视化**。上方彩色标签可筛选：任务 / 话题 / 词汇 / 汉字 / 语法。  
2. **拖拽**节点、**滚轮**缩放；**点击**节点打开右侧「本体检视」。  
3. 颜色：红任务 · 橙话题 · 蓝词汇 · 绿汉字 · 紫语法；灰多为考纲外补充。

数据在本机 `public/`，**不上传备课内容**，无需登录。

---

## 检索服务能力一览

| 接口 | 说明 |
|------|------|
| `GET /` | 服务说明与可用接口列表 |
| `GET /health` | 健康检查 |
| `GET /stats` | 知识块数量、向量是否加载 |
| `POST /retrieve` | 检索；`mode`: `keyword` / `vector` / `hybrid`（默认） |
| `format: "chat_rag_text"` | 多返回 `rag_text`，可直接作火山 `ChatRAGText` |

场景：课堂对话 / 陪练——召回相关知识点作参考，**不强行卡模型超纲**。  
机制说明（召回 / 向量化 / 外挂契约）：[docs/kb/rag-implementation.md](./docs/kb/rag-implementation.md)

---

## 目录结构

```
├── public/                 # 原始静态数据（门户直接读）
│   ├── kg_data.json
│   ├── teacher_data.json
│   └── ontology.jsonld
├── kb/                     # 检索产物（脚本生成）
│   ├── chunks.jsonl
│   ├── embeddings.f32
│   └── *.meta.json
├── kb-service/             # 检索 API（:8787）
│   ├── requirements.txt    # Python fastembed
│   └── src/
├── scripts/
│   ├── build-chunks.mjs
│   └── build-embeddings.py
├── src/                    # 教师门户前端（:5173）
├── docs/
│   ├── ontology/           # 本体说明与模版
│   ├── kb/                 # 检索对接说明 + RAG 实现方案
│   │   ├── retrieve-for-llm.md
│   │   └── rag-implementation.md
│   └── superpowers/        # 设计与实现计划
├── package.json
└── vite.config.js
```

常用命令：

```bash
npm run dev              # 教师门户
npm run build            # 打包门户到 dist/
npm run preview          # 预览打包结果
npm run build:chunks     # public → kb/chunks.jsonl
npm run build:embeddings # chunks → kb/embeddings.f32
cd kb-service && npm start
```

技术栈：Vue 3 + Vite + vis-network；检索 Node + Python `fastembed`。

---

## 数据说明（简要）

- **考纲内 / 考纲外补充**：是否属于 HSK1 2026 实施范围。  
- **掌握度 L0–L4**：从「未接触」到「流利运用」。  
- **话题课程覆盖**：已覆盖 / 浅覆盖 / 未覆盖（对照 Kai HSK1）。  
- **本体**：统一的类与关系；说明见 [docs/ontology/](./docs/ontology/)。  

更新数据：替换 `public/` 后刷新门户；若要同步检索，再跑 `build:chunks`（及可选 `build:embeddings`）并重启 `kb-service`。节点 `id` 勿重复。

扩展到 HSK2 / HSK3 等：复制 `docs/ontology/`，按该目录 [README](./docs/ontology/README.md) 改 namespace 与类。

---

## 排错

1. **5173 打不开**：是否在本目录执行了 `npm install` / `npm run dev`？  
2. **8787 打开是 JSON / 不是网页**：正常，那是 API；门户请用 5173。  
3. **`{"error":"not found"}`**：访问了未实现的路径；试 `/`、`/health`、`/stats`，检索用 `POST /retrieve`。  
4. **hybrid 效果差 / 降级关键词**：检查 `/stats` 里 `embeddings_loaded`；按上文安装 Python 依赖并 `npm run build:embeddings`。  
5. Node 建议 18+。

---

## 许可与用途

本项目用于 HSK1 教学研究与备课参考。考纲与课程内容请以官方最新文件及本校教学安排为准。
