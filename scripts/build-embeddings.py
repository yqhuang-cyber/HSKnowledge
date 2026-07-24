#!/usr/bin/env python3
"""Build kb/embeddings.f32 + embeddings.meta.json from chunks.jsonl via fastembed."""
from __future__ import annotations

import hashlib
import json
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path

MODEL = "BAAI/bge-small-zh-v1.5"
BATCH = 32

ROOT = Path(__file__).resolve().parent.parent
KB = ROOT / "kb"


def main() -> int:
    try:
        from fastembed import TextEmbedding
    except ImportError:
        print(
            "Missing fastembed. Install:\n"
            "  pip3 install --user -i https://pypi.tuna.tsinghua.edu.cn/simple "
            '"numpy<2" fastembed',
            file=sys.stderr,
        )
        return 1

    chunks_path = KB / "chunks.jsonl"
    if not chunks_path.exists():
        print(f"Missing {chunks_path}; run: npm run build:chunks", file=sys.stderr)
        return 1

    lines = [ln.strip() for ln in chunks_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    chunks = [json.loads(ln) for ln in lines]
    chunk_ids = [c["id"] for c in chunks]
    texts = [(c.get("text") or c.get("title") or "") for c in chunks]
    print(f"Embedding {len(chunks)} chunks with {MODEL} …")

    model = TextEmbedding(model_name=MODEL)
    vectors: list[list[float]] = []
    for i in range(0, len(texts), BATCH):
        batch = texts[i : i + BATCH]
        for vec in model.embed(batch):
            vectors.append(list(map(float, vec)))
        print(f"  {min(i + BATCH, len(texts))} / {len(texts)}")

    dim = len(vectors[0])
    n = len(vectors)
    buf = bytearray()
    for row in vectors:
        if len(row) != dim:
            raise RuntimeError(f"dim mismatch: {len(row)} != {dim}")
        buf.extend(struct.pack(f"<{dim}f", *row))

    KB.mkdir(parents=True, exist_ok=True)
    (KB / "embeddings.f32").write_bytes(buf)

    raw = chunks_path.read_bytes()
    meta = {
        "built_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "model": MODEL,
        "dim": dim,
        "metric": "cosine",
        "count": n,
        "chunk_ids": chunk_ids,
        "chunks_sha256": hashlib.sha256(raw).hexdigest()[:16],
        "embedder": "fastembed",
    }
    (KB / "embeddings.meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    mb = len(buf) / (1024 * 1024)
    print(f"Wrote kb/embeddings.f32 ({mb:.2f} MB), dim={dim}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
