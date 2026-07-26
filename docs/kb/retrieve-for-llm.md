# HSK1 知识库检索服务（对接大模型）

一期能力：从图谱数据生成可检索知识块（chunks），提供本地 HTTP 检索，并把结果格式化为火山 RealtimeAPI **外部 RAG** 所需的 `ChatRAGText` 文本。

**场景：** 课堂对话 / 陪练（深度：相关知识点召回，不强行卡超纲）  
**给外挂 AI 开发者的完整 RAG 方案（含召回机制与向量化）：** [rag-implementation.md](./rag-implementation.md)  
**设计原文：** [../superpowers/specs/2026-07-24-hsk1-retrieval-kb-for-llm-design.md](../superpowers/specs/2026-07-24-hsk1-retrieval-kb-for-llm-design.md)

---

## 快速开始

在仓库 `hsk-portal` 目录下：

```bash
# 1. 从 public 数据生成知识块（改完 kg/teacher 数据后请重跑）
npm run build:chunks

# 2. 生成向量（需 Python3 + fastembed；国内可设 HF 镜像）
#    pip3 install --user -i https://pypi.tuna.tsinghua.edu.cn/simple "numpy<2" fastembed
export HF_ENDPOINT=https://hf-mirror.com   # 若 huggingface.co 超时
npm run build:embeddings

# 3. 启动检索服务（默认 http://127.0.0.1:8787；默认 mode=hybrid）
cd kb-service && npm start
```

健康检查：

```bash
curl -s http://127.0.0.1:8787/health
curl -s http://127.0.0.1:8787/stats
```

---

## 检索 API

### `POST /retrieve`

```bash
curl -s -X POST http://127.0.0.1:8787/retrieve \
  -H 'content-type: application/json' \
  -d '{
    "query": "我想请朋友吃饭",
    "top_k": 8,
    "format": "chat_rag_text",
    "filters": {
      "chunk_types": ["word", "grammar", "topic", "task"],
      "compliance": ["考纲内", "考纲外补充"],
      "hsk_level": [1]
    }
  }'
```

| 字段 | 说明 |
|------|------|
| `query` | 必填，学生发言或意图文本 |
| `top_k` | 可选，默认 8 |
| `mode` | 可选：`keyword` / `vector` / `hybrid`（默认 **hybrid**） |
| `filters` | 可选，按类型 / 考纲 / 级别过滤 |
| `format` | 设为 `"chat_rag_text"` 时，响应多一个 `rag_text` 字段 |

响应中的 `hits[]` 含：`id`, `score`, `score_keyword`, `score_vector`, `chunk_type`, `source_id`, `title`, `text`, `metadata`。  
未构建 `kb/embeddings.f32` 时，`hybrid` 会降级为 `keyword`（`degraded: true`）。

---

## 对接火山 RealtimeAPI（外部 RAG）

官方流程要点：客户端自行检索 → 用 **`ChatRAGText`** 把外部知识推给 RealtimeAPI → 模型基于 RAG 再生成（可 TTS）。检索较慢时可用 **`ChatTTSText`** 先播安抚话术。

推荐链路：

```
用户话（ASR 文本）
  → POST /retrieve { query, format: "chat_rag_text" }
  → 取响应里的 rag_text
  → 作为 ChatRAGText 内容发给 RealtimeAPI
  → 收到 ChatResponse / TTS
```

`rag_text` 示例形态：

```text
【HSK1 知识库参考】
1. [word] 朋友：【词汇】朋友（péngyou）……
2. [topic] 饮食：……
```

若官方日后要求结构化 JSON 数组，只需在客户端把 `hits` 再映射一层，不必改知识库主契约。

文档入口：[外部 RAG 输入](https://docs.volcengine.com/docs/6561/1594356?lang=zh#_4-3-外部rag输入)

---

## 通用 Chat Completions 兜底（非 Realtime）

把 `hits` 拼进 system prompt 亦可：

```text
你是 HSK1 中文陪练老师……
【检索到的知识点】
{rag_text 或自行拼接 hits}
```

---

## 目录

| 路径 | 说明 |
|------|------|
| `scripts/build-chunks.mjs` | 知识块构建 |
| `scripts/build-embeddings.py` | 向量构建（fastembed / `BAAI/bge-small-zh-v1.5`） |
| `kb/chunks.jsonl` | 知识块 |
| `kb/embeddings.f32` + `embeddings.meta.json` | 向量矩阵 |
| `kb-service/` | 检索服务（在线 query 经 Python worker 嵌入） |

二期：本地向量 + 混合检索；对接火山 `ChatRAGText` 不变。
