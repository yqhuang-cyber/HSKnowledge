# HSK1 检索 / RAG 实现方案（给外挂 AI 应用开发者）

本文说明：**本仓库检索服务到底在做什么**、教学场景下我们怎么做 RAG、**召回为什么关键**、向量化是否在方案内、以及你们的 AI 应用应如何对接。

配套快速接口说明：[retrieve-for-llm.md](./retrieve-for-llm.md)  
设计决策原文：[../superpowers/specs/2026-07-24-hsk1-retrieval-kb-for-llm-design.md](../superpowers/specs/2026-07-24-hsk1-retrieval-kb-for-llm-design.md)

---

## 1. 先用大白话说清楚

**RAG（Retrieval-Augmented Generation）** = 先**检索**相关知识，再让大模型**参考这些知识**生成回复。

在我们系统里：

| 环节 | 谁做 | 做什么 |
|------|------|--------|
| 检索（召回） | **本仓库的 `kb-service`（:8787）** | 根据学生这句话，找出最相关的 HSK1 知识点 |
| 增强生成 | **你们的 AI 应用**（或火山 Realtime 等） | 把检索结果塞给模型，再生成陪练回复 / TTS |

所以：本仓库提供的是 **「教学知识检索底座」**，不是完整陪练客户端。你们外挂 AI 应用时，把我们当成 **外部知识源 / 外部 RAG 服务** 即可。

---

## 2. 面向什么教学场景？

| 项目 | 我们的选择 |
|------|------------|
| 主场景 | **课堂对话 / 口语陪练**（学生说话 → 需要相关词、语法、话题作参考） |
| 知识深度 | **相关知识点召回（参考）**，本阶段**不强行卡死**「每一句是否超纲」 |
| 知识从哪来 | HSK1 图谱 + 教案数据（词汇 / 汉字 / 语法 / 话题 / 任务） |
| 检索放哪 | **留在我方本地**（不托管到平台知识库），便于考纲过滤与可控召回 |
| 典型对接 | 火山 RealtimeAPI **外部 RAG（`ChatRAGText`）**；也兼容普通 Chat Completions 拼 prompt |

**这意味着：** 召回质量直接决定模型「看见」什么。召回偏了，陪练就会扯到无关语法或漏掉饮食场景该用的词——所以 **召回机制是本 RAG 方案的核心**，不是边角料。

---

## 3. 端到端链路（你们应实现的那一半 + 我们负责的那一半）

```
学生发言（文本 / ASR）
        │
        ▼
  你们的 AI 应用
        │  POST http://127.0.0.1:8787/retrieve
        │  { query, top_k, mode, format: "chat_rag_text", filters? }
        ▼
  本仓库 kb-service  ←—— 召回发生在这里
        │  返回 hits[] + rag_text
        ▼
  你们把 rag_text（或 hits）注入模型
        │  例：火山 ChatRAGText / 或拼进 system prompt
        ▼
  模型生成陪练回复（± TTS）
```

火山 Realtime 时序要点：**外部 RAG 由客户端推送**，平台不会替你查我们的库。检索慢时可先发安抚话术（如 `ChatTTSText`），再推 `ChatRAGText`。

官方参考：[外部 RAG 输入](https://docs.volcengine.com/docs/6561/1594356?lang=zh#_4-3-外部rag输入)

---

## 4. 我们的 RAG 怎么实现？（含向量化）

**是的，向量化是正式方案的一部分**（二期已落地）。完整流水线分三层：

### 4.1 离线：知识块（Chunks）

从 `public/kg_data.json` 等生成可读短文本块，约 **718** 条，写入 `kb/chunks.jsonl`。

每块大致包含：

- `id` / `chunk_type`（word / character / grammar / topic / task …）
- `title` / `text`（给模型读的自然语言）
- `compliance`（考纲内 / 考纲外补充）、`hsk_level`
- `metadata`（拼音等）

脚本：`npm run build:chunks` → `scripts/build-chunks.mjs`

### 4.2 离线：向量化（Embedding）

把每条 chunk 的文本变成 **512 维向量**，存成矩阵文件，供在线快速比「意思近不近」。

| 项 | 值 |
|----|-----|
| 模型 | `BAAI/bge-small-zh-v1.5`（中文小模型） |
| 工具 | Python `fastembed` |
| 产物 | `kb/embeddings.f32` + `kb/embeddings.meta.json` |
| 何时跑 | 改完知识数据后：`npm run build:embeddings` |

**在线查询时**也会对当前 `query` 做一次同样模型的 embedding（`kb-service` 内 Python worker），再与矩阵算余弦相似度。  
「知识库向量预先算好 + 问句现算」——这是我们采用的落地方式。

没有向量文件时：服务仍可启动，`hybrid` **降级为纯关键词**（响应里 `degraded: true`）。

### 4.3 在线：召回机制（最关键）

默认 **`mode=hybrid`（混合检索）**——这是推荐给教学陪练的模式。

```
                    query（学生这句话）
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
   关键词通道                          向量通道
   （字面/子串重叠等）              （embedding 余弦相似）
   擅长：专名、词面、语法名          擅长：口语、同义、场景说法
   例：「点」字精确命中              例：「点餐」→ 饮食 / 午饭
           │                               │
           └───────────────┬───────────────┘
                           ▼
                    分数归一化后融合
                 （默认关键词 0.4 + 向量 0.6）
                           ▼
                      Top-K hits
                           ▼
              可选 format → rag_text（ChatRAGText 友好）
```

| `mode` | 行为 | 何时用 |
|--------|------|--------|
| `hybrid`（**默认**） | 关键词 + 向量融合 | **外挂陪练应用请用这个** |
| `keyword` | 仅字面相关 | 调试专名；或无向量环境 |
| `vector` | 仅语义相似 | 调试口语召回 |

**为什么召回这么关键？**

- 只靠关键词：学生说「点餐」可能偏到「钟点 / 时量词」（因为都有「点」），陪练参考就偏了。  
- 只靠向量：专名、精确词条有时不够稳。  
- **混合**：专名与口语场景都照顾到——这是本教学 RAG 的核心设计。

可选 `filters`：按 `chunk_types` / `compliance` / `hsk_level` 收窄召回范围（例如只要考纲内词汇+话题）。

---

## 5. 对你们应用的接入契约

### 5.1 最小对接（推荐）

```http
POST http://127.0.0.1:8787/retrieve
Content-Type: application/json

{
  "query": "我想请朋友吃饭",
  "top_k": 8,
  "mode": "hybrid",
  "format": "chat_rag_text"
}
```

取响应字段：

- **`rag_text`**：已拼好的参考文本 → 直接可作为火山 **`ChatRAGText`** 内容  
- **`hits[]`**：结构化结果（自己拼 prompt / UI 展示 / 打点分析）

`rag_text` 形态示例：

```text
【HSK1 知识库参考】
1. [word] 朋友：【词汇】朋友（péngyou）……
2. [topic] 饮食：……
```

### 5.2 建议客户端策略（陪练）

1. 每轮用户话（或 ASR 定稿后）调用一次 `/retrieve`  
2. 检索可能数百毫秒～首包更慢（冷启动 embedding worker）：可先播「稍等…」再推 RAG  
3. 把 `rag_text` 推给模型；**不要假设模型会自己访问 8787**  
4. 若 `degraded: true`：说明当时走了关键词降级，可打日志或提示运维补向量  

### 5.3 非 Realtime 的拼法

```text
你是 HSK1 中文陪练老师。请参考下列知识点回复学生，优先用考纲内表达。
【检索到的知识点】
{rag_text}
【学生说】
{query}
```

### 5.4 本阶段明确「不做」的事（避免误解）

- **不**在服务端强制过滤模型输出是否超纲（召回是参考，不是监考器）  
- **不**替你们维护 Realtime WebSocket / ASR / TTS 全链路  
- **不**要求你们再自建一套 HSK 向量库（除非要离线副本）；在线问句向量由本服务完成  

---

## 6. 运维与更新（外挂系统依赖时）

| 步骤 | 命令 / 检查 |
|------|-------------|
| 启动检索 | `cd kb-service && npm start` → `:8787` |
| 健康 | `GET /health`、`GET /stats`（看 `embeddings_loaded`） |
| 改知识数据后 | `npm run build:chunks` →（建议）`npm run build:embeddings` → 重启服务 |
| 国内拉 embedding 模型 | `export HF_ENDPOINT=https://hf-mirror.com` |
| Python 依赖 | `pip3 install --user -r kb-service/requirements.txt` |

根路径 `GET /` 会返回接口说明（浏览器打开不是网页，是 API 说明 JSON）。

---

## 7. 一句话总结（可写进你们的架构说明）

> **HSKnowledge 的 RAG = 本地 HSK1 知识块 +（可选）BGE 向量化 + 默认混合召回 HTTP API；外挂 AI 负责把召回结果注入生成链路（如 `ChatRAGText`）。教学场景下，召回质量优先于「硬卡超纲」。**

若接口字段有变更，以 [retrieve-for-llm.md](./retrieve-for-llm.md) 与运行中的 `GET /` / `GET /stats` 为准。
