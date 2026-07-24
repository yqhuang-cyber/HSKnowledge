# HSK1 检索知识库（对接大模型 · 陪练场景）完整方案

**日期:** 2026-07-24  
**状态:** 已确认（2026-07-24）——可进入实现计划  
**确认项:** 场景 B · 深度 D · 对接 C · 火山 Realtime `ChatRAGText` · Node 一期 keyword · 路径 `kb/` + `kb-service/` · 一期不做完整语音客户端  
**范围:** 将现有知识图谱/本体升级为可被大模型检索的知识库（RAG 底座 + HTTP 检索 API）  
**关联仓库:** `hsk-portal`（现有教师门户保持不变，本方案在其上增加「知识服务」层）

---

## 0. 决策记录（此前已确认的选择）

| # | 议题 | 选择 | 含义 |
|---|------|------|------|
| 1 | 主使用场景 | **B. 课堂对话 / 陪练** | 大模型作为陪练对象时，用检索到的 HSK1 知识点辅助生成回复 |
| 2 | 知识约束深度 | **D. 先做相关知识点召回** | 查出相关词/语法/话题等给模型当参考；**本阶段不强行卡死每一句是否超纲** |
| 3 | 对接形态 | **C. HTTP 检索 API + 可向量化文档块** | 同时具备：① 标准化文本块（chunks）便于建索引；② 简单 `POST /retrieve` 供客户端取回知识 |
| 4 | 目标大模型侧 | **火山 RealtimeAPI · 外部 RAG（`ChatRAGText`）** | 客户端自行检索后，把知识文本经 `ChatRAGText` 推给 RealtimeAPI；模型基于外部 RAG 再生成（并 TTS） |

**本阶段明确不做（非目标）：**

- 不强制「回复用词 100% 在考纲内」的硬过滤（留给后续「A/B/C 约束增强」）
- 不做完整备课出题工作流（场景 A）
- 不把检索托管到火山方舟「平台知识库」（检索留在我方，便于 HSK 图谱过滤与可控召回）
- 不改教师门户现有九个 Tab 的核心交互（可另开「检索试玩」页，可选）
- 不在本阶段上线复杂权限 / 多租户
- 一期不实现完整 Realtime WebSocket 陪练客户端（先交付检索服务 + `ChatRAGText` 载荷适配；完整语音链路可二期）

---

## 1. 目标与成功标准

### 1.1 目标

在现有 `kg_data.json` / `teacher_data.json` / `ontology.jsonld` 之上，建成一套：

1. **知识块（chunks）**：每块是一段给 LLM 读的短文本 + 结构化元数据  
2. **检索服务**：输入「用户这句话 / 当前对话意图」，返回 Top-K 相关知识点块  
3. **对接契约**：文档说明如何把检索结果交给火山 RealtimeAPI 的 `ChatRAGText`（外部 RAG），并附通用 prompt 拼接兜底  

### 1.2 成功标准（验收）

1. 能从现有 JSON **一键生成** chunks 文件（可重复构建）  
2. `POST /retrieve` 对中文查询返回相关 Word / Grammar / Topic / Task 等块（人工 spot-check 合理）  
3. 提供 **`hits → ChatRAGText` 文本载荷** 的适配说明/函数（可直接给 RealtimeAPI 客户端用）  
4. 提供一份 **示例 prompt 模板**（非 Realtime 场景的兜底拼法）  
5. 教师门户仍可独立 `npm run dev`；知识服务可单独启动  
6. 文档写清：数据更新后如何重建索引  
7. （可选）门户「检索试玩」页能看到召回结果  

---

## 1A. 火山 RealtimeAPI 外部 RAG 对接确认（基于官方时序图）

参考文档：[外部 RAG 输入](https://docs.volcengine.com/docs/6561/1594356?lang=zh#_4-3-外部rag输入) 时序图。关键结论：**外部 RAG 由客户端推送，不是平台替你查库。**

### 时序（与官方图对齐）

```
客户端                         RealtimeAPI
  │  TaskRequest（用户 query）      │
  │───────────────────────────────►│
  │  ASRInfo / ASRResponse / ASREnded
  │◄───────────────────────────────│
  │                                 │
  │  【若当前回复不足 → 走外部 RAG】  │
  │                                 │
  │  ChatTTSText（安抚话术，可选）   │  ← 掩盖检索耗时
  │───────────────────────────────►│
  │  TTS…（安抚语音）               │
  │◄───────────────────────────────│
  │                                 │
  │  ★ ChatRAGText（外部 RAG 数据） │  ← 我方 /retrieve 结果填这里
  │───────────────────────────────►│
  │                                 │
  │  ChatResponse + TTS…（基于 RAG 总结后的输出）
  │◄───────────────────────────────│
```

### 和本方案的映射

| 官方环节 | 本工程职责 |
|----------|------------|
| 用户 query | 陪练学生发言（ASR 文本或文本输入） |
| 判断「模型结果无法满足」 | 客户端策略：陪练场景可**每次或按需**触发检索（一期建议：每轮用户话后检索） |
| 安抚话术 `ChatTTSText` | 客户端可选：「请稍等，我帮你想一想…」等；检索慢时再用 |
| **`ChatRAGText`（外部 RAG 数据）** | 调用 `POST /retrieve` → 把 `hits[].text` 拼成一段/多段文本 → 作为 `ChatRAGText` 内容发送 |
| `ChatResponse` | RealtimeAPI 侧模型基于外部 RAG 生成陪练回复 |

### 兼容性结论

**可以对接。** 方案 C 正是 RealtimeAPI「外部 RAG」所假设的架构：

- 检索在 **你的客户端 / 你的 kb-service**  
- 知识通过 **`ChatRAGText`** 注入  
- 火山侧负责 **基于 RAG 的总结生成 + TTS**

我方一期交付重点仍是：**chunks + `/retrieve` + 拼出适合 `ChatRAGText` 的纯文本（或官方要求的字符串格式）**。  
完整 WebSocket 会话状态机（ASR/TTS/安抚）属于 Realtime 客户端工程，可与知识库并行开发。

### `ChatRAGText` 载荷建议（待官方字段细则最终敲定）

在拿到精确 JSON schema 前，先约定可落地的文本拼法（多数 Realtime 外部 RAG 接受文本内容）：

```text
【HSK1 知识库参考】
1. [topic] 饮食：……
2. [word] 吃（chī）：……
3. [grammar] ……
```

实现上提供：

```js
function formatHitsForChatRAGText(hits) {
  return hits.map((h, i) =>
    `${i + 1}. [${h.chunk_type}] ${h.title}：${h.text}`
  ).join('\n')
}
```

若官方要求结构化数组（如 `{ title, content }[]`），在适配层再包一层，**不改 `/retrieve` 主契约**。

### 陪练推荐策略（一期）

1. 收到用户 query（ASR 结束）→ 立刻 `POST /retrieve`  
2. （可选）同时发 `ChatTTSText` 安抚  
3. 检索返回 → `ChatRAGText`  
4. 等待 `ChatResponse` / TTS 播给学生  

深度仍为 **D**：送参考知识点，不在客户端做硬超纲拦截。

## 2. 技术方案对比（检索实现）

| 方案 | 做法 | 优点 | 缺点 | 结论 |
|------|------|------|------|------|
| **1. 仅关键词 / BM25** | 对 chunk 文本做分词检索 | 实现快、无 embedding 依赖、中文专名（词、语法名）准 | 口语化提问（「想请朋友吃饭怎么说」）语义召回弱 | 可作为第一期兜底 |
| **2. 仅向量检索** | embedding + 向量库 | 口语/场景问法友好 | 专名精确匹配可能丢；要选模型与向量库 | 单独不够稳 |
| **3. 混合检索（推荐）** | BM25/关键词 ∪ 向量，再融合排序 | 专名 + 语义兼顾，适合陪练对话 | 实现略重 | **采用** |

**推荐路径（分两期）：**

- **一期（可马上用）：** 生成 chunks + **关键词/BM25 检索 API**（满足 C 的「可向量化块」已就绪）  
- **二期：** 同一套 chunks 上加 embedding，实现混合检索，API 参数不变

这样不阻塞「先对接大模型试对话」，又为向量化留好格式。

---

## 3. 总体架构

```
现有数据（source of truth）
  public/kg_data.json
  public/teacher_data.json
  public/ontology.jsonld
  docs/ontology/*          ← 人读说明 / 建模模版（不直接检索）
           │
           ▼
   [构建脚本] build-chunks
           │
           ▼
   kb/chunks.jsonl         ← 可向量化文档块（一节点或一逻辑单元一块）
   kb/chunks.meta.json     ← 构建版本、数量、时间戳
           │
     ┌─────┴─────┐
     ▼           ▼
 检索索引      （二期）向量索引
 BM25/关键词    embeddings
     │           │
     └─────┬─────┘
           ▼
   kb-service  POST /retrieve
           │
           ▼
   大模型应用（陪练）把 hits 写入 system/user prompt
```

**与教师门户的关系：**

- 门户：给人浏览、看图谱、看本体  
- 知识服务：给机器检索  
- 共用同一份 `public/*.json` 源数据；**不要**在两处各维护一套知识点

建议目录（新增，可放在 `hsk-portal/` 内或并列 `hsk-kb/`；本方案默认放仓库内）：

```
hsk-portal/
├── public/                 # 已有源数据
├── kb/                     # 构建产物（可 gitignore 大向量文件；jsonl 可入库）
│   ├── chunks.jsonl
│   └── chunks.meta.json
├── scripts/
│   └── build-chunks.mjs    # 或 .py
├── kb-service/             # 轻量检索 API（Node 或 Python）
│   ├── package.json / requirements.txt
│   └── ...
└── docs/
    └── kb/
        └── retrieve-for-llm.md   # 对接说明 + prompt 模板
```

---

## 4. 知识块（Chunk）设计

### 4.1 设计原则

- **一块 ≈ 一个可独立理解的知识点**（词 / 字 / 语法 / 话题 / 任务）  
- 文本用自然语言写，方便 embedding 与 LLM 阅读  
- 元数据保留图谱 id、类型、考纲、掌握度等，便于过滤与审计  
- 关系信息不强行拆成海量小块；在块内用 1～3 行「相关」摘要即可（避免噪声）

### 4.2 Chunk 类型与来源（一期）

| chunk_type | 来源 | 约数量 | 文本应包含 |
|------------|------|--------|------------|
| `word` | `kg_data` nodes type=Word | ~313 | 词、拼音、词性、例句、考纲、说读写听目标 |
| `character` | Character 节点 | ~256 | 字、拼音、部首、笔画、考纲 |
| `grammar` | GrammarPoint 或 teacher grammar | ~119 | 语法名、类别、例句 |
| `topic` | Topic + teacher topics_with_words | ~16 | 话题名、子话题、课程覆盖、代表词（截断） |
| `task` | Task 节点 | ~15 | 任务名、描述、掌握度 |
| `ontology_class`（可选） | ontology.jsonld 类 | ~40 | 类名、注释、父类（供「本体视角」问法；一期可后做） |

合计一期大约 **700～800 块**，规模小，本地检索足够。

### 4.3 Chunk JSON 记录格式（jsonl 每行一条）

```json
{
  "id": "chunk:word:word-爱",
  "source_id": "word-爱",
  "chunk_type": "word",
  "hsk_level": 1,
  "compliance": "考纲内",
  "title": "爱",
  "text": "【词汇】爱（ài），词性：动。考纲：考纲内。例句：爱生活；她很爱你。掌握目标：听L3/读L3/说L3/写L2。",
  "metadata": {
    "pinyin": "ài",
    "pos": "动",
    "proficiency_target": { "listening": "L3", "reading": "L3", "speaking": "L3", "writing": "L2" },
    "ontology_class": "hsk1:Word"
  }
}
```

**`text` 是检索与喂给模型的主字段；`metadata` 供过滤与调试。**

### 4.4 构建规则（要点）

- 空 `definition` / `example` 时仍输出块，但 `text` 只写有值字段  
- 例句过长：截断到合理长度（如 120～200 字），避免一块过大  
- 重复节点 id（如历史 `word-字`）：构建时按 id 去重，与图谱侧一致  
- 每次构建写 `chunks.meta.json`：`built_at`、`source_hashes`、各 type 计数

---

## 5. 检索 API 设计

### 5.1 服务

- 进程：独立小服务（建议 **Node (Express/Fastify)** 或 **Python (FastAPI)**，与团队习惯二选一；实现计划里定）  
- 默认本地：`http://127.0.0.1:8787`  
- CORS：开发期允许本地门户/试玩页调用

### 5.2 `POST /retrieve`

**请求：**

```json
{
  "query": "我想请朋友吃饭，怎么说？",
  "top_k": 8,
  "filters": {
    "chunk_types": ["word", "grammar", "topic", "task"],
    "compliance": ["考纲内", "考纲外补充"],
    "hsk_level": [1]
  },
  "mode": "keyword"
}
```

- `mode`：一期 `"keyword"`；二期增加 `"hybrid"` / `"vector"`  
- `filters` 均可选；陪练默认偏 `考纲内`，但允许包含「考纲外补充」以便课程用词

**响应：**

```json
{
  "query": "我想请朋友吃饭，怎么说？",
  "took_ms": 12,
  "hits": [
    {
      "id": "chunk:topic:topic-饮食",
      "score": 0.82,
      "chunk_type": "topic",
      "source_id": "topic-5",
      "title": "饮食",
      "text": "……",
      "metadata": {}
    }
  ]
}
```

### 5.3 其他端点（一期建议有）

| 方法 | 路径 | 作用 |
|------|------|------|
| GET | `/health` | 探活 |
| GET | `/stats` | chunk 数量、构建时间 |
| POST | `/retrieve` | 主检索 |

### 5.4 检索逻辑（一期 keyword）

1. 规范化 `query`（去空白）  
2. 按 `filters` 缩小候选集  
3. 对 `title` + `text` 做简单打分：精确包含标题加分、字符/词重叠、拼音命中（若 query 含拼音）  
4. 取 Top-K；同分时优先 `考纲内`、优先 `topic/task`（陪练场景更吃场景块）——**可配置权重**

二期：同一接口用向量分数与关键词分数做加权融合（如 RRF）。

---

## 6. 大模型对接契约（场景 B + 深度 D）

### 6.0 主路径：火山 RealtimeAPI（外部 RAG）

见 **§1A**。客户端链路：

`用户话 → /retrieve → formatHitsForChatRAGText → ChatRAGText → ChatResponse`

### 6.1 通用路径（非 Realtime / 方舟 Chat Completions 兜底）

```
学生发言
   → POST /retrieve { query: 学生发言 或 发言+当前话题 }
   → 得到 hits[].text
   → 拼进 system / user prompt
   → 调用大模型生成回复
   → 返回给学生
```

### 6.2 System prompt 模板（通用兜底示例）

```text
你是 HSK1 中文陪练老师。请用简单、口语化的中文与学生对话。

下面是从「HSK1 知识库」检索到的参考知识点（可能不完整，仅供参考）。
请尽量优先使用这些词、语法和话题来说话；若必须用到参考之外的表达，请保持简单，并仍贴近 HSK1 难度。
本阶段不要求逐字核验是否超纲，但不要故意使用明显超纲的书面语或生僻词。

【检索到的知识点】
{把 hits 按序拼接，每块一行或一个小节，带上 title / chunk_type}
```

> Realtime 场景下，同类内容通过 `ChatRAGText` 注入，system 人设仍可在会话配置里写死「HSK1 陪练老师」。

### 6.3 深度 D 的产品含义（再次对齐）

| 做 | 不做（本阶段） |
|----|----------------|
| 把相关知识点送进上下文 / `ChatRAGText` | 自动删除模型回复中的超纲词 |
| 引导模型「多用」HSK1 素材 | 语法点强制对齐打分 |
| 可记录检索日志便于评测 | 完整 Realtime 语音陪练 App（可二期） |

后续若要从 D 升级到更强约束，可在生成后增加「用词校验」步骤（对照 Word 表），那是下一份方案。

---

## 7. 与现有门户 / 本体的关系

| 资产 | 在知识库中的角色 |
|------|------------------|
| `kg_data.json` | 主实例源 → 生成 word/char/grammar/topic/task chunks |
| `teacher_data.json` | 补充分类、话题词表、语法分组 → 丰富 `text` |
| `ontology.jsonld` | 为 chunk 标注 `ontology_class`；可选生成类说明块 |
| `docs/ontology/` | 人读模版；**不**作为检索语料主来源（避免说明文档噪声） |
| 教师门户 GraphView 侧栏 | 人读本体检视；与机器检索并行，不互相替代 |

---

## 8. 实施分期

### 一期（本方案落地范围）

1. `scripts/build-chunks`：从 public 数据生成 `kb/chunks.jsonl`  
2. `kb-service`：`/health` `/stats` `/retrieve`（keyword）  
3. `docs/kb/retrieve-for-llm.md`：对接说明 + **Realtime `ChatRAGText` 适配** + 通用 prompt 模板 + curl 示例  
4. `formatHitsForChatRAGText`（或等价工具函数）：`hits` → 外部 RAG 文本  
5. （可选）门户加一个极简「检索试玩」输入框，方便老师看召回结果  

### 二期

1. Embedding 构建与持久化；`mode=hybrid`  
2. Realtime 客户端联调（ASR → 检索 → ChatTTSText 安抚 → ChatRAGText → ChatResponse）  
3. 对话会话级缓存（同一话题少重复检索）  
4. 简单评测集（20 条陪练问法 + 期望命中类型）

### 三期（可选增强）

1. 生成后用词校验（从 D 走向更强约束）  
2. 按当前 Mission/话题过滤检索  
3. 多级别（HSK2+）多库路由（复用 `docs/ontology` 模版思路）

---

## 9. 风险与对策

| 风险 | 对策 |
|------|------|
| 口语 query 关键词召回差 | 一期接受；二期向量补；query 侧可加「当前话题」字段 |
| 块太多噪声 | Top-K 默认 6～8；陪练优先 topic/task/grammar |
| 源数据更新后索引过期 | 构建脚本校验 hash；`/stats` 暴露 `built_at` |
| 重复节点 id | 构建去重，与门户图谱一致 |
| 把整份 json 塞进 prompt | **禁止**；只塞 Top-K 的 `text` |

---

## 10. 验收清单（一期）

- [ ] `npm run build:chunks`（或等价命令）生成 jsonl，数量与类型统计合理  
- [ ] `POST /retrieve` 对「点餐」「自我介绍」「明天星期几」等返回可见相关块  
- [ ] 文档中的 curl + prompt 模板可被同事按说明接上任意 LLM  
- [ ] README 增加「知识库 / 检索服务」小节入口  
- [ ] 教师门户原功能无回归  

---

## 11. 待你确认的点（实现前）

请确认本方案整体是否按此推进。默认实现选项：

1. **语言栈：** 构建脚本与 kb-service 使用 **Node.js**（与现有 Vite 工程同生态）  
2. **一期检索：** keyword 打分（非必须立刻上向量库）  
3. **产物路径：** `hsk-portal/kb/` + `hsk-portal/kb-service/`  
4. **火山对接：** 一期交付 `/retrieve` + `ChatRAGText` 文本适配；**不**在一期做完整 Realtime WebSocket 客户端  
5. **触发策略：** 陪练每轮用户话后检索（可配置）；安抚话术由 Realtime 客户端按需发送  

若你希望服务用 Python、一期就必须上向量、或一期就要联调完整语音链路，请注明，我会改方案后再写实现计划。
