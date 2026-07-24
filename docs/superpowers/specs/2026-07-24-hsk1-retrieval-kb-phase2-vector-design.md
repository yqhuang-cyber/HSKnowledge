# HSK1 检索知识库 · 二期（本地向量 + 混合检索）设计

**日期:** 2026-07-24  
**状态:** 已确认并开工（2026-07-24）  
**实现备注:** 本机 `@xenova/transformers` 依赖的 `sharp` 无法编译，已落地为 **Python `fastembed` + `BAAI/bge-small-zh-v1.5`**：离线 `scripts/build-embeddings.py`；在线 `kb-service` 经常驻 `py_embed_worker.py` 只 embed 当前 query（等价 C2，向量文件仍为 `embeddings.f32`）。国内拉取模型建议 `export HF_ENDPOINT=https://hf-mirror.com`。  
**前置:** 一期已交付（关键词 `/retrieve` + `ChatRAGText` 文本）  
**关联方案:** [2026-07-24-hsk1-retrieval-kb-for-llm-design.md](./2026-07-24-hsk1-retrieval-kb-for-llm-design.md)

---

## 0. 决策记录（含本期澄清）

| # | 议题 | 选择 |
|---|------|------|
| 1–4 | 场景 B / 深度 D / 对接 C / 火山 `ChatRAGText` | 沿用一期 |
| 5 | 向量方案 | **A. 全本地**（不依赖火山 Embedding / VikingDB） |
| 6 | Embedding 怎么跑 | **C. 离线构建向量，在线只做相似度计算**（服务启动不加载大模型） |

**用大白话复述二期目标：**  
一期靠「字一不一样」找知识点，口语（如「点餐」）容易漏。  
二期给每条知识块和用户问句各算一份「意思坐标」（embedding），用「意思近不近」来找；并和关键词结果**合并**，专名与口语都照顾到。

---

## 1. 什么是 Embedding（写进方案，方便同事阅读）

- **Embedding：** 把一段文字变成固定长度的数字向量（如 512 维）。  
- **相似度：** 两个向量夹角越小（余弦相似度越高），意思越接近。  
- **本库规模：** 约 700+ 块，即使暴力算余弦也足够快（毫秒～几十毫秒），不必上复杂向量数据库。

---

## 2. 技术方案对比（向量存储与在线检索）

| 方案 | 做法 | 优点 | 缺点 | 结论 |
|------|------|------|------|------|
| **1. 暴力余弦（推荐）** | 离线存 `float32` 矩阵；在线 query 向量 × 全库点积/余弦 | 实现简单、零运维、700 块毫无压力 | 块增到数万以后再升级 | **采用** |
| **2. 本地 ANN 库**（hnswlib/faiss） | 建近似最近邻索引 | 大规模更快 | 对本数据量过度设计 | 三期再议 |
| **3. SQLite + 向量扩展** | 存库查询 | 便于过滤 SQL | 依赖与复杂度上升 | 不做 |

**离线 Embedding 模型（推荐）：**

- `BAAI/bge-small-zh-v1.5`（中文小模型，效果与体积平衡）  
- 用 **Python + sentence-transformers** 仅在 `scripts/build-embeddings.py` 中加载；产出向量文件后，**Node `kb-service` 不依赖 Python 运行时**（在线路径保持纯 Node）。

备选：若环境装 Python 困难，可改为 Node `@xenova/transformers` 做离线构建；接口文件格式不变。

---

## 3. 总体架构（二期）

```
public/*.json
      │
      ▼
scripts/build-chunks.mjs          → kb/chunks.jsonl          （一期已有）
      │
      ▼
scripts/build-embeddings.py       → kb/embeddings.npz        （向量矩阵）
                                  → kb/embeddings.meta.json  （模型名、维度、chunk id 顺序）
      │
      ▼
kb-service（Node）
  load chunks + embeddings
  POST /retrieve
       mode=keyword | vector | hybrid（默认 hybrid）
      │
      ▼
rag_text → 火山 ChatRAGText（不变）
```

**在线路径：**  
用户 query →（若 hybrid/vector）用**预计算好的同款模型**？——注意：在线也要把 query 变成向量。

### 3.1 在线 query 怎么变成向量？（C 方案的关键点）

「离线构建、在线不加载大模型」有两种落地：

| 子方案 | 在线如何 embed query | 取舍 |
|--------|----------------------|------|
| **C1. 在线仍轻量加载模型（推荐修正）** | Node 用 ONNX/`@xenova/transformers` **只 embed 当前 query**（模型可懒加载一次缓存）；库侧向量全是离线算好的 | 在线第一次稍慢，之后快；**无需常驻 Python** |
| **C2. 严格零模型在线** | 另启本地 mini embed HTTP（Python），仅 `/embed` 一句 | 多一个进程 |
| **C3. 仅预计算「常见问法」** | 无开放域 query 向量 | **不适合陪练口语**，否决 |

**本期采用 C1：**  
- 离线：Python 把 **所有 chunk.text** 算成矩阵（可复现、可换机器批跑）  
- 在线：Node 懒加载同一小模型（或兼容的 ONNX），**只对当前 query** 算向量，再与矩阵比余弦  
- 若用户坚持「机器上完全不跑模型」，可降级为仅 `mode=keyword`，或临时启 C2

> 说明：要对任意新问句做语义检索，**至少要对 query 算一次 embedding**；C 的精髓是「知识库向量预先算好」，不是「永远不算任何向量」。

---

## 4. 产物格式

### 4.1 `kb/embeddings.meta.json`

```json
{
  "built_at": "ISO-8601",
  "model": "BAAI/bge-small-zh-v1.5",
  "dim": 512,
  "metric": "cosine",
  "chunk_ids": ["chunk:word:word-爱", "..."],
  "chunks_hash": "与 chunks.meta 对齐的校验"
}
```

### 4.2 `kb/embeddings.npz`（或 `.bin` + meta）

- 数组 `vectors`: shape `[N, dim]` float32，行顺序与 `chunk_ids` 一致  
- 一期可用 `.npz` 由 Python 写出；Node 用 `npzjs` 或改存 **裸 float32 `.bin` + meta** 方便纯 Node 读取（**推荐 `.bin` + meta**，避免 Node 解析 npz 麻烦）

**推荐落地文件：**

- `kb/embeddings.f32` — 长度 `N * dim * 4` 字节  
- `kb/embeddings.meta.json` — 含 `chunk_ids`, `dim`, `model`

---

## 5. API 变更（兼容一期）

`POST /retrieve` 增加：

```json
{
  "query": "点餐",
  "top_k": 8,
  "mode": "hybrid",
  "format": "chat_rag_text"
}
```

| `mode` | 行为 |
|--------|------|
| `keyword` | 同一期（默认可保留为 hybrid，或默认 hybrid、keyword 显式） |
| `vector` | 仅语义相似度 Top-K |
| `hybrid` | **默认**：关键词分与向量分融合（见下） |

**融合（简单可用）：**

1. 各取 Top-`2*K` 候选  
2. 分数分别 min-max 归一化到 0～1  
3. `final = 0.4 * keyword + 0.6 * vector`（权重可配置；口语场景向量略高）  
4. 再截断到 `top_k`  
5. 同分仍优先 `考纲内`、`topic/task`

响应字段不变；可选增加 `score_keyword` / `score_vector` 便于调试。

`GET /stats` 增加：`embeddings_loaded`, `model`, `dim`。

---

## 6. 构建与运行命令（预期）

```bash
# 一期
npm run build:chunks

# 二期新增（需本机 Python 3.10+ 与一次模型下载）
npm run build:embeddings
# → node scripts/run-build-embeddings.mjs 或直接 python scripts/build-embeddings.py

cd kb-service && npm start
# 首次 vector/hybrid 请求可能下载/加载 ONNX，随后缓存
```

`README` / `docs/kb/retrieve-for-llm.md` 补充二期说明与「点餐」对比示例。

---

## 7. 验收标准（二期）

1. 「点餐」「我想点菜」「请朋友吃饭」能召回 **饮食相关 topic/word**（人工看 Top-5 合理）  
2. 「明天星期几」关键词优势不退化（hybrid 仍应命中明天/星期）  
3. `mode=keyword|vector|hybrid` 均可调用  
4. 无向量文件时：`hybrid/vector` 返回明确错误或自动降级 keyword（需在响应里标注 `degraded: true`）  
5. 火山对接方式不变：仍用 `rag_text` → `ChatRAGText`  
6. 教师门户构建不受影响  

---

## 8. 非目标（二期不做）

- 不上 VikingDB / 云向量库  
- 不做完整 Realtime 语音客户端  
- 不做生成后硬超纲过滤（仍为深度 D）  
- 不更换 chunks 语义边界（仍按知识点一块）  

---

## 9. 实施任务拆分（确认后写详细 plan）

1. Python `scripts/build-embeddings.py` → `embeddings.f32` + meta  
2. Node：加载矩阵、余弦、query embed（Xenova/bge ONNX）  
3. `/retrieve` 支持 `mode` + hybrid 融合  
4. 文档与「点餐」前后对比说明  
5. （可选）门户检索试玩页增加 mode 切换  

---

## 10. 请你确认

默认按上文推进，请确认：

1. 采用 **本地 bge-small-zh + 离线灌库 + 在线只 embed 当前问句（C1）**  
2. 默认检索 **`mode=hybrid`**  
3. 向量文件 **`embeddings.f32` + meta**（方便 Node 读取）  

若同意，回复确认后我再写二期实现计划并开工。
