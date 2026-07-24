# Graph Node Ontology Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or implement inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-hand ontology inspector panel to GraphView that shows class path, datatype facts, and object-property neighbors when a node is clicked.

**Architecture:** `ontologyMap.js` indexes `ontology.jsonld` and maps node/edge types to ontology terms. `NodeInspector.vue` renders the panel. `GraphView.vue` owns selection, layout grid, and neighbor navigation.

**Tech Stack:** Vue 3, vis-network, existing portal CSS

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-24-graph-node-ontology-inspector-design.md`
- No git commits (no repo) unless user asks
- Keep node id dedupe; do not mutate public JSON
- Depth B only (instance + class definition + ancestor path)

---

### Task 1: `ontologyMap.js`

**Files:** Create `hsk-portal/src/utils/ontologyMap.js`

- [ ] Implement type/edge maps, `indexOntology`, `loadOntology` (cached), `getAncestorPath`, `buildDatatypeFacts`, `TYPE_COLORS`, `TYPE_LABELS`
- [ ] Verify: `node -e` import smoke or build later

### Task 2: `NodeInspector.vue`

**Files:** Create `hsk-portal/src/components/NodeInspector.vue`

- [ ] Props: `node`, `outgoing`, `incoming`, `ontologyIndex`
- [ ] Emit: `close`, `select-neighbor(id)`
- [ ] Sections: header, class+path, datatype facts, relations, other attrs

### Task 3: Wire `GraphView.vue` + CSS

**Files:** Modify `GraphView.vue`, append inspector styles to `main.css`

- [ ] Grid layout; selection events; pass neighbors; focus when visible
- [ ] `npm run build`

---
