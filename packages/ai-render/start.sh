#!/bin/bash
set -e
cd "$(dirname "$0")"

# 4090 有 24GB 显存，关闭 CPU offload 可减少约 2s 推理延迟
# 若显存 <16GB 请改为 export AI_RENDER_CPU_OFFLOAD=1
export AI_RENDER_CPU_OFFLOAD=${AI_RENDER_CPU_OFFLOAD:-0}
export HF_ENDPOINT=${HF_ENDPOINT:-https://hf-mirror.com}
export HF_HOME=${HF_HOME:-/root/autodl-tmp/hf_cache}
export HF_HUB_DISABLE_SYMLINKS_WARNING=1

echo "AI_RENDER_CPU_OFFLOAD = $AI_RENDER_CPU_OFFLOAD"
echo "AI_RENDER_SIZE        = ${AI_RENDER_SIZE:-512}"
echo "HF_ENDPOINT           = $HF_ENDPOINT"
echo "监听端口               : 8765"
echo ""

.venv/bin/python server.py
