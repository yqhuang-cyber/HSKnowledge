<script>
export default {
  name: 'OntClassNode',
  props: {
    cls: { type: Object, required: true },
    classNodes: { type: Array, default: () => [] },
  },
  methods: {
    getOntLayerClass(id) {
      if (
        id.includes('Phoneme') ||
        id.includes('Initial') ||
        id.includes('Final') ||
        id.includes('Tone') ||
        id.includes('Radical') ||
        id.includes('Stroke')
      )
        return 'foundation'
      if (id.includes('Character')) return 'character'
      if (id === 'hsk1:HSKKnowledgePoint') return 'root'
      if (
        id.includes('Word') ||
        [
          'hsk1:Noun',
          'hsk1:Verb',
          'hsk1:Adjective',
          'hsk1:Pronoun',
          'hsk1:Numeral',
          'hsk1:MeasureWord',
          'hsk1:Adverb',
          'hsk1:Preposition',
          'hsk1:Conjunction',
          'hsk1:Auxiliary',
          'hsk1:Interjection',
          'hsk1:Phrase',
        ].includes(id)
      )
        return 'word'
      if (
        id.includes('Grammar') ||
        [
          'hsk1:Morpheme',
          'hsk1:Particle',
          'hsk1:PhraseStructure',
          'hsk1:SentenceComponent',
          'hsk1:SentencePattern',
          'hsk1:SentenceType',
          'hsk1:SpecialPattern',
          'hsk1:CompoundSentence',
          'hsk1:Aspect',
          'hsk1:SpecialExpression',
        ].includes(id)
      )
        return 'grammar'
      if (
        id.includes('Topic') ||
        id.includes('SubTopic') ||
        id.includes('Task') ||
        id.includes('Scenario')
      )
        return 'app'
      if (
        id.includes('Skill') ||
        id.includes('Listening') ||
        id.includes('Speaking') ||
        id.includes('Reading') ||
        id.includes('Writing')
      )
        return 'skill'
      return 'foundation'
    },
    childrenOf(cls) {
      return this.classNodes.filter((c) => {
        const sub = c.subClassOf
        if (!sub) return false
        const parentId = typeof sub === 'string' ? sub : sub['@id']
        return parentId === cls['@id']
      })
    },
  },
  computed: {
    displayName() {
      const id = this.cls['@id'].replace('hsk1:', '')
      return this.cls.name_zh || id
    },
    layerClass() {
      return this.getOntLayerClass(this.cls['@id'])
    },
    children() {
      return this.childrenOf(this.cls)
    },
  },
}
</script>

<template>
  <div style="margin: 4px 0">
    <div class="ont-class" :class="layerClass">{{ displayName }}</div>
    <span v-if="cls.comment_zh" class="ont-comment">// {{ cls.comment_zh }}</span>
    <br />
    <div v-if="children.length" class="ont-sub">
      <OntClassNode
        v-for="child in children"
        :key="child['@id']"
        :cls="child"
        :class-nodes="classNodes"
      />
    </div>
  </div>
</template>
