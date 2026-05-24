#!/bin/bash
set -e
cd "$(dirname "$0")"

export HF_ENDPOINT=${HF_ENDPOINT:-https://hf-mirror.com}
export HF_HOME=${HF_HOME:-/root/autodl-tmp/hf_cache}
export HF_HUB_DISABLE_SYMLINKS_WARNING=1

echo "开始下载 Z-Image-Turbo（Tongyi-MAI/Z-Image-Turbo）..."
echo "模型约 12GB+，请耐心等待"
echo "HF_ENDPOINT = $HF_ENDPOINT"
echo ""

.venv/bin/python - <<'EOF'
from huggingface_hub import snapshot_download
import os

token = os.environ.get("HF_TOKEN")

print("下载 ControlNet Lineart（约 1.5GB）...")
snapshot_download("Xlabs-AI/flux-controlnet-lineart-v3", token=token)

print("\n下载 FLUX.1-dev（约 24GB，需要较长时间）...")
snapshot_download("black-forest-labs/FLUX.1-dev", token=token)

print("\n模型下载完成！可以启动服务了：bash start.sh")
EOF
