/**
 * Format retrieve hits for Volcengine RealtimeAPI ChatRAGText (external RAG).
 */
export function formatHitsForChatRAGText(hits) {
  if (!hits?.length) return '【HSK1 知识库参考】（无命中）'
  const body = hits
    .map((h, i) => `${i + 1}. [${h.chunk_type}] ${h.title}：${h.text}`)
    .join('\n')
  return `【HSK1 知识库参考】\n${body}`
}
