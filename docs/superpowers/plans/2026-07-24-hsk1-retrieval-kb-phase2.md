# HSK1 KB Phase 2 (Local Vector + Hybrid) Implementation Plan

> **For agentic workers:** Implement task-by-task. Checkbox tracking.

**Goal:** Add local BGE embeddings, cosine vector search, and hybrid retrieve mode.

**Architecture:** Offline `build-embeddings.mjs` writes `kb/embeddings.f32` + meta using `@xenova/transformers` (`Xenova/bge-small-zh-v1.5`). Online kb-service lazy-loads the same model for query only; hybrid fuses keyword + vector scores.

**Note:** Spec suggested Python offline; using Node for both keeps one embedding space and simpler install on this machine.

**Spec:** `docs/superpowers/specs/2026-07-24-hsk1-retrieval-kb-phase2-vector-design.md`

---

### Task 1: Build embeddings script + npm script
### Task 2: Wire vector/hybrid into kb-service
### Task 3: Docs + smoke tests (点餐 vs keyword)
