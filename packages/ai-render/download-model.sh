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

print("下载 ControlNet Scribble SDXL（约 2.5GB）...")
snapshot_download("xinsir/controlnet-scribble-sdxl-1.0")

print("\n下载 SDXL base（约 6.5GB）...")
snapshot_download("stabilityai/stable-diffusion-xl-base-1.0")

print("\n模型下载完成！可以启动服务了：bash start.sh")
EOF
