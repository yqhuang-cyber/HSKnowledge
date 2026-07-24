# HSK1 知识图谱本体模型 (Ontology Model)

> 标准本体说明文档 · v1.0 · 2026-07-23

---

## 1. 元数据 (Ontology Metadata)

| 字段 | 值 |
|------|-----|
| **命名空间 (Namespace)** | `http://hsk1.org/ontology#` |
| **缩写前缀 (Prefix)** | `hsk1:` |
| **版本 (Version)** | 1.0 |
| **创建日期** | 2026-07-23 |
| **创建者** | Mavis Agent Team |
| **依赖标准** | OWL 2 / RDF / RDFS / SKOS / Dublin Core |
| **依据标准** | HSK 考试大纲 2026-07 实施版 |
| **数据源** | 国家中外语言交流合作中心 (汉办) |
| **本体内引用前缀** | `owl: rdf: rdfs: xsd: skos: dcterms:` |

**本体声明：**
```turtle
<http://hsk1.org/ontology> rdf:type owl:Ontology ;
    dcterms:title "HSK1 知识图谱本体"@zh , "HSK1 Knowledge Graph Ontology"@en ;
    dcterms:creator "Mavis Agent Team" ;
    owl:versionInfo "1.0" ;
    dcterms:description "HSK1 级中文学习知识图谱的形式化本体模型"@zh .
```

---

## 2. 核心类 (Core Classes) — 共 41 个

### 2.1 抽象基类 (1 个)

| 类名 | 中文 | 说明 |
|------|------|------|
| `hsk1:HSKKnowledgePoint` | HSK知识点 | HSK 知识图谱中所有知识点的抽象基类，subClassOf owl:Thing |

### 2.2 中层类 (10 个) — HSKKnowledgePoint 的直接子类

| 类名 | 中文 | 说明 | 叶子类数 |
|------|------|------|---------|
| `hsk1:Phoneme` | 音素 | 语音的最小单位（声母、韵母、声调）| 3 |
| `hsk1:Character` | 汉字 | 中文字符，约 250 个 HSK1 字符 | 0 |
| `hsk1:Radical` | 部首 | 汉字的部首（偏旁）| 0 |
| `hsk1:Stroke` | 笔画 | 汉字的笔画类型 | 0 |
| `hsk1:Word` | 词 | HSK1 词汇表，约 297 个词 | 11 |
| `hsk1:GrammarPoint` | 语法点 | HSK1 语法点 | 10 |
| `hsk1:Topic` | 话题 | HSK1 话题 | 1 |
| `hsk1:Task` | 任务 | HSK 教学中的具体执行场景 | 0 |
| `hsk1:Scenario` | 场景 | 实际应用场景 | 0 |
| `hsk1:Skill` | 语言能力 | 听/说/读/写能力 | 4 |

### 2.3 叶子类 (30 个)

#### 2.3.1 词汇层 (Word 的子类) — 11 个

| 类名 | 中文 | 备注 |
|------|------|------|
| `hsk1:Noun` | 名词 | |
| `hsk1:Verb` | 动词 | |
| `hsk1:Adjective` | 形容词 | |
| `hsk1:Pronoun` | 代词 | |
| `hsk1:Numeral` | 数词 | |
| `hsk1:MeasureWord` | 量词 | |
| `hsk1:Adverb` | 副词 | |
| `hsk1:Preposition` | 介词 | |
| `hsk1:Conjunction` | 连词 | |
| `hsk1:Auxiliary` | 助词 | |
| `hsk1:Interjection` | 叹词 | |
| `hsk1:Phrase` | 短语 | |

#### 2.3.2 语法层 (GrammarPoint 的子类) — 10 个

| 类名 | 中文 | 备注 |
|------|------|------|
| `hsk1:Morpheme` | 语素 | |
| `hsk1:Particle` | 助词类 | |
| `hsk1:PhraseStructure` | 短语结构 | |
| `hsk1:SentenceComponent` | 句子成分 | |
| `hsk1:SentencePattern` | 句型 | |
| `hsk1:SentenceType` | 句类 | |
| `hsk1:SpecialPattern` | 特殊句型 | 把字句、被字句等 |
| `hsk1:CompoundSentence` | 复句 | |
| `hsk1:Aspect` | 动作的态 | 了/着/过 |
| `hsk1:SpecialExpression` | 特殊表达法 | 是...的 等 |

#### 2.3.3 语音层 (Phoneme 的子类) — 3 个

| 类名 | 中文 | 实例数 |
|------|------|-------|
| `hsk1:Initial` | 声母 | 21 (b p m f d t n l g k h j q x zh ch sh r z c s y w) |
| `hsk1:Final` | 韵母 | 39 (单韵母、复韵母、鼻韵母、特殊韵母) |
| `hsk1:Tone` | 声调 | 4 + 变调规则 |

#### 2.3.4 技能层 (Skill 的子类) — 4 个

| 类名 | 中文 |
|------|------|
| `hsk1:Listening` | 听 |
| `hsk1:Speaking` | 说 |
| `hsk1:Reading` | 读 |
| `hsk1:Writing` | 写 |

#### 2.3.5 话题层 (Topic 的子类) — 1 个

| 类名 | 中文 | 备注 |
|------|------|------|
| `hsk1:SubTopic` | 子话题 | 父话题的下位分类 |

---

## 3. 对象属性 (Object Properties) — 9 个

对象属性定义类与类之间的关系。

| # | 属性名 | 中文 | domain | range | 特性 |
|---|--------|------|--------|-------|------|
| 1 | `hsk1:requires` | 前置依赖 | HSKKnowledgePoint | HSKKnowledgePoint | **Transitive** |
| 2 | `hsk1:composedOf` | 由...组成 | Word | Character | — |
| 3 | `hsk1:enables` | 使能 | Topic | Task | **Transitive** |
| 4 | `hsk1:relatesTo` | 相关 | HSKKnowledgePoint | HSKKnowledgePoint | **Symmetric** |
| 5 | `hsk1:hasSubTopic` | 包含子话题 | Topic | SubTopic | — |
| 6 | `hsk1:partOf` | 属于 | SubTopic | Topic | **inverseOf** `hasSubTopic` |
| 7 | `hsk1:hasSkillTarget` | 技能目标 | HSKKnowledgePoint | Skill | — |
| 8 | `hsk1:targetedBy` | 被任务针对 | HSKKnowledgePoint | Task | **inverseOf** `hasSkillTarget` |
| 9 | `hsk1:introducedIn` | 在...中引入 | HSKKnowledgePoint | Task | — |

### 关系矩阵 (domain × range)

| domain \ range | Word | Character | GrammarPoint | Topic | SubTopic | Task | Skill | HSKKnowledgePoint |
|----------------|------|-----------|--------------|-------|----------|------|-------|-------------------|
| **Word** | — | composedOf | — | — | — | — | — | — |
| **Topic** | — | — | — | — | hasSubTopic | enables | — | — |
| **SubTopic** | — | — | — | partOf | — | — | — | — |
| **HSKKnowledgePoint** | — | — | — | — | — | targetedBy<br>introducedIn | hasSkillTarget | requires<br>relatesTo |

### 反关系对 (Inverse Pairs)

| 正向 | 反向 |
|------|------|
| `hasSubTopic` | `partOf` |
| `hasSkillTarget` | `targetedBy` |

---

## 4. 数据属性 (Datatype Properties) — 13 个

数据属性定义类的内部属性（值是基本类型）。

| # | 属性名 | 中文 | domain | range | 说明 |
|---|--------|------|--------|-------|------|
| 1 | `hsk1:hasName` | 中文名 | HSKKnowledgePoint | xsd:string | 知识点本身的中文名称 |
| 2 | `hsk1:hasPinyin` | 拼音 | HSKKnowledgePoint | xsd:string | 汉语拼音标注 |
| 3 | `hsk1:hasDefinition` | 释义 | HSKKnowledgePoint | xsd:string | 知识点中文释义 |
| 4 | `hsk1:hasEnglishDefinition` | 英文释义 | HSKKnowledgePoint | xsd:string | 英文翻译 |
| 5 | `hsk1:hasExample` | 例句 | HSKKnowledgePoint | xsd:string | 用法示例 |
| 6 | `hsk1:hasHSKLevel` | HSK 等级 | HSKKnowledgePoint | xsd:integer | 1-6，HSK1 全部为 1 |
| 7 | `hsk1:hasDifficulty` | 难度 | HSKKnowledgePoint | xsd:integer | 1-5 难度评分 |
| 8 | `hsk1:hasProficiencyLevel` | 掌握度等级 | HSKKnowledgePoint | xsd:string | L0=未接触, L1=识别, L2=理解, L3=运用, L4=流利 |
| 9 | `hsk1:isInSyllabus` | 是否在考纲内 | HSKKnowledgePoint | xsd:boolean | true=考纲内, false=课程补充 |
| 10 | `hsk1:hasRadical` | 部首 | Character | xsd:string | 汉字部首 |
| 11 | `hsk1:hasStrokeCount` | 笔画数 | Character | xsd:integer | 汉字笔画数 |
| 12 | `hsk1:hasPartOfSpeech` | 词性 | Word | xsd:string | 名词/动词/形容词/... |
| 13 | `hsk1:hasSubTopics` | 子话题列表 | Topic | xsd:string | 父话题包含的子话题列表 |

### 属性分布矩阵

| 属性 | 适用类 |
|------|--------|
| hasName, hasPinyin, hasDefinition, hasEnglishDefinition, hasExample, hasHSKLevel, hasDifficulty, hasProficiencyLevel, isInSyllabus | 所有 HSKKnowledgePoint（通用 9 个）|
| hasRadical, hasStrokeCount | 仅 Character（专用 2 个）|
| hasPartOfSpeech | 仅 Word（专用 1 个）|
| hasSubTopics | 仅 Topic（专用 1 个）|

---

## 5. 词汇与术语 (Vocabulary)

每个类和属性都提供 **双语标签**（@zh / @en），便于跨语言使用。

| 中文术语 | 英文术语 | 含义 |
|----------|----------|------|
| 知识点 | KnowledgePoint | 抽象的知识单元 |
| 音素 | Phoneme | 语音最小单位 |
| 汉字 | Character | 中文书写单位 |
| 词 | Word | 词汇单位 |
| 语法点 | GrammarPoint | 语法规则单元 |
| 话题 | Topic | 内容主题 |
| 任务 | Task | 执行场景 |
| 场景 | Scenario | 实际应用情境 |
| 语言能力 | Skill | 听/说/读/写能力 |
| 前置依赖 | Prerequisite | 学习先后顺序 |
| 组成 | ComposedOf | 整体-部分关系 |
| 使能 | Enables | 因果使能关系 |
| 相关 | RelatesTo | 关联关系（对称）|
| 子话题 | SubTopic | 父话题的子分类 |
| 技能目标 | SkillTarget | 知识点对应的能力目标 |

---

## 6. 实例统计 (Individuals / Instances)

### 6.1 节点实例（718 个）

| 类型 | 数量 | 占比 |
|------|------|------|
| **Word** (词) | 312 | 43.5% |
| **Character** (汉字) | 256 | 35.7% |
| **GrammarPoint** (语法点) | 119 | 16.6% |
| **Topic** (话题) | 16 | 2.2% |
| **Task** (任务) | 15 | 2.1% |
| **合计** | **718** | 100% |

### 6.2 关系实例（941 条边）

| 关系类型 | 边数 | 占比 | 说明 |
|----------|------|------|------|
| **composes** | 576 | 61.2% | 词 → 汉字（"我"词由"我"字组成）|
| **relatesTo** | 321 | 34.1% | 词 ↔ 词（同话题相关）|
| **requires** | 28 | 3.0% | 语法点 → 词（学习"了"需要"是"）|
| **enables** | 16 | 1.7% | 话题 → 任务（掌握话题能完成任务）|
| **合计** | **941** | 100% | |

### 6.3 考纲合规性

| 标签 | 含义 | 数量 |
|------|------|------|
| 考纲内 | 来自 HSK 2026-07 实施版 | 297 词 |
| 考纲外补充 | 来自 Kai HSK1 30 课 课程 | 15 词（咖啡/空/药/过/没/多少钱/吃药/有空 等）|

### 6.4 话题覆盖度

| 标签 | 数量 | 说明 |
|------|------|------|
| covered | 10 | 课程完全覆盖 |
| shallow | 2 | 课程部分覆盖 |
| uncovered | 4 | 课程未覆盖 |

---

## 7. 关系特征 (Property Characteristics)

OWL 提供 5 种关系特征，HSK1 本体使用了 3 种：

### 7.1 Transitive（传递性）
- `requires` — A→B, B→C ⇒ A→C（学习路径）
- `enables` — 话题1→任务1, 话题1→任务2 ⇒ 掌握话题1可完成所有相关任务

### 7.2 Symmetric（对称性）
- `relatesTo` — A→B ⇔ B→A（知识点关联）

### 7.3 inverseOf（反关系）
- `partOf` 是 `hasSubTopic` 的反关系
- `targetedBy` 是 `hasSkillTarget` 的反关系

### 7.4 未使用的特征
- **Functional**（函数性）：每个主语只有唯一宾语
- **Reflexive**（自反性）：A→A

---

## 8. 命名约定 (Naming Conventions)

| 元素 | 命名规则 | 示例 |
|------|----------|------|
| **类** | PascalCase | `Word`, `GrammarPoint`, `SpecialExpression` |
| **对象属性** | camelCase + 动词 | `requires`, `composedOf`, `relatesTo` |
| **数据属性** | camelCase + has/is | `hasName`, `isInSyllabus` |
| **实例 ID** | `{type}-{slug}` | `word-wo`, `char-我`, `grammar-le`, `topic-1` |

---

## 9. 文件清单 (File Manifest)

| 文件 | 格式 | 大小 | 说明 |
|------|------|------|------|
| `hsk1-ontology.owl` | Turtle/OWL | 20 KB | 完整本体源文件 |
| `hsk1-ontology.jsonld` | JSON-LD | 11 KB | JSON 格式本体 |
| `ontology_hierarchy.png` | PNG | 320 KB | 本体层级图 |
| `ontology_with_instances.png` | PNG | 170 KB | 本体 vs 实例数对照 |
| `ONTOLOGY.md` | Markdown | 本文件 | 本体说明文档 |
| `README.md` | Markdown | 7 KB | 项目说明 |

---

## 10. 使用示例 (Usage Examples)

### 10.1 查询所有 HSK1 词汇（SPARQL）

```sparql
PREFIX hsk1: <http://hsk1.org/ontology#>

SELECT ?word ?pinyin ?definition WHERE {
  ?word a hsk1:Word ;
        hsk1:hasPinyin ?pinyin ;
        hsk1:hasDefinition ?definition .
  ?word hsk1:hasHSKLevel 1 .
} LIMIT 10
```

### 10.2 查询某词的所有组成汉字

```sparql
PREFIX hsk1: <http://hsk1.org/ontology#>

SELECT ?char WHERE {
  hsk1:word-wo hsk1:composedOf ?char .
}
```

### 10.3 查询学习某语法点的前置知识点

```sparql
PREFIX hsk1: <http://hsk1.org/ontology#>

SELECT ?prereq WHERE {
  hsk1:grammar-le hsk1:requires ?prereq .
}
```

---

## 11. 维护说明 (Maintenance)

- **本体内引用**：所有外部本体（FOAF, SKOS, Dublin Core）通过标准前缀引用
- **演进原则**：新增类时优先用现有父类 subClassOf；新增关系时检查是否需要 inverseOf
- **一致性检查**：所有数据实例必须满足 domain/range 约束
- **版本管理**：每次重大修改更新 versionInfo 和 created 字段

---

*本文档是 HSK1 本体模型的标准化描述，可作为团队本体建模的模板参考。*
