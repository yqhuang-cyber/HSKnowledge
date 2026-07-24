# 本体模版与说明（Ontology）

本目录存放 **HSK1 知识点本体** 的说明文档与机读模版。  
门户运行时实际加载的是 `public/ontology.jsonld`（与此处 JSON-LD 模版内容一致）。

## 文件一览

| 文件 | 用途 |
|------|------|
| [ONTOLOGY.md](./ONTOLOGY.md) | 给人看的本体说明（类、属性、命名空间等） |
| [hsk1-ontology.jsonld](./hsk1-ontology.jsonld) | JSON-LD 模版（Web / 本门户） |
| [hsk1-ontology.owl](./hsk1-ontology.owl) | OWL/Turtle 模版（Protégé 等建模工具） |

## 新领域怎么用这份模版？

适用于 HSK2、HSK3、商务汉语等新领域时，建议：

1. **复制**本目录，改名为例如 `docs/ontology-hsk2/` 或新项目下的 `docs/ontology/`。
2. 打开 **ONTOLOGY.md**：
   - 改第 1 节的 **namespace / 前缀 / 标题 / 版本**；
   - 按新大纲替换第 2 节及之后的 **类与属性**。
3. 同步修改 `.jsonld` 与 `.owl`（保持与说明文档一致）。
4. 若新门户要加载该本体：把 JSON-LD 拷到对应项目的 `public/ontology.jsonld`（或约定好的路径）。

改完后，人读文档与机读文件应描述同一套模型。
