<script setup>
import { computed } from 'vue'

const props = defineProps({
  kgData: { type: Object, default: null },
})

const stats = computed(() => {
  if (!props.kgData) return null
  const nodes = props.kgData.nodes || []
  return {
    nodes: nodes.length,
    words: nodes.filter((n) => n.type === 'Word').length,
    chars: nodes.filter((n) => n.type === 'Character').length,
    grammar: nodes.filter((n) => n.type === 'GrammarPoint').length,
    topics: nodes.filter((n) => n.type === 'Topic').length,
    tasks: nodes.filter((n) => n.type === 'Task').length,
    inSyllabus: nodes.filter((n) => n.compliance === '考纲内').length,
    outSyllabus: nodes.filter((n) => n.compliance === '考纲外补充').length,
    L3: nodes.filter(
      (n) => n.type === 'Word' && n.proficiency_target?.speaking === 'L3'
    ).length,
    L2: nodes.filter(
      (n) => n.type === 'Word' && n.proficiency_target?.speaking === 'L2'
    ).length,
    L1: nodes.filter(
      (n) => n.type === 'Word' && n.proficiency_target?.speaking === 'L1'
    ).length,
  }
})
</script>

<template>
  <div>
    <div v-if="!stats" class="loading">⏳ 正在加载数据...</div>
    <template v-else>
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-num" style="color: #4299e1">{{ stats.nodes }}</div>
          <div class="stat-label">总节点</div>
        </div>
        <div class="stat-card green">
          <div class="stat-num" style="color: #48bb78">{{ stats.words }}</div>
          <div class="stat-label">词汇</div>
        </div>
        <div class="stat-card green">
          <div class="stat-num" style="color: #48bb78">{{ stats.chars }}</div>
          <div class="stat-label">汉字</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-num" style="color: #9f7aea">{{ stats.grammar }}</div>
          <div class="stat-label">语法点</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-num" style="color: #ed8936">{{ stats.topics }}</div>
          <div class="stat-label">话题</div>
        </div>
        <div class="stat-card red">
          <div class="stat-num" style="color: #f56565">{{ stats.tasks }}</div>
          <div class="stat-label">核心任务</div>
        </div>
      </div>

      <div class="two-col">
        <div class="section">
          <h2>合规性</h2>
          <div style="font-size: 14px; line-height: 2">
            <div>
              <span class="tag tag-in">考纲内</span> {{ stats.inSyllabus }} 节点
              (严格遵循 2026 新规)
            </div>
            <div>
              <span class="tag tag-out">考纲外补充</span> {{ stats.outSyllabus }}
              节点 (文化核心词 + 课程用词)
            </div>
          </div>
        </div>
        <div class="section">
          <h2>词汇掌握度分布</h2>
          <div style="font-size: 14px; line-height: 2">
            <div>
              <span class="tag tag-L3">L3 必会产出</span> {{ stats.L3 }} 词
              (主动、即时、准确使用)
            </div>
            <div>
              <span class="tag tag-L2">L2 引导下产出</span> {{ stats.L2 }} 词
              (引导下正确使用)
            </div>
            <div>
              <span class="tag tag-L1">L1 仅识别</span> {{ stats.L1 }} 词
              (听辨和认读即可)
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Kai HSK1 30 Missions 课程覆盖度</h2>
        <div class="two-col">
          <div>
            <h3 style="color: #276749">已覆盖 (10)</h3>
            <p>
              个人信息、事件信息、交往、饮食、交通出行、购物、医疗健康、休闲、校园生活、环境信息
            </p>
          </div>
          <div>
            <h3 style="color: #c05621">浅覆盖 (2)</h3>
            <p>物品信息、学习情况</p>
            <h3 style="color: #c53030; margin-top: 12px">未覆盖 (4)</h3>
            <p>教育情况、职场生活、职业、文化与传统</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
