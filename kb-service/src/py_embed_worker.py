#!/usr/bin/env python3
"""
Long-lived stdin/stdout JSON worker for query embeddings.
Protocol (one JSON object per line):
  {"op":"embed_query","text":"..."} -> {"ok":true,"vector":[...],"dim":N,"model":"..."}
  {"op":"ping"} -> {"ok":true,"pong":true}
"""
from __future__ import annotations

import json
import sys

MODEL = "BAAI/bge-small-zh-v1.5"


def main() -> int:
    from fastembed import TextEmbedding

    model = TextEmbedding(model_name=MODEL)
    # Signal ready
    sys.stdout.write(json.dumps({"ok": True, "ready": True, "model": MODEL}) + "\n")
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            op = req.get("op")
            if op == "ping":
                sys.stdout.write(json.dumps({"ok": True, "pong": True}) + "\n")
            elif op == "embed_query":
                text = req.get("text") or ""
                vec = next(model.query_embed(text))
                out = {
                    "ok": True,
                    "vector": [float(x) for x in vec],
                    "dim": len(vec),
                    "model": MODEL,
                }
                sys.stdout.write(json.dumps(out) + "\n")
            else:
                sys.stdout.write(json.dumps({"ok": False, "error": f"unknown op: {op}"}) + "\n")
        except Exception as e:
            sys.stdout.write(json.dumps({"ok": False, "error": str(e)}) + "\n")
        sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
