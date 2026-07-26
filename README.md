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
| **对接文档** | 检索 API 与大模型接入说明 | `docs/kb/retrieve-for-llm.md` |

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
│   ├── kb/                 # 检索对接说明
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
