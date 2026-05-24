#!/bin/bash
set -e
cd "$(dirname "$0")"

export HF_HOME=${HF_HOME:-/root/autodl-tmp/hf_cache}
export HF_HUB_DISABLE_SYMLINKS_WARNING=1

echo "=== 下载 FLUX.1-dev + ControlNet Lineart ==="
echo "HF_HOME = $HF_HOME"
echo ""

.venv/bin/python - <<'EOF'
from huggingface_hub import snapshot_download
import os

token = os.environ.get("HF_TOKEN")
if not token:
    print("警告：未设置 HF_TOKEN，FLUX.1-dev 下载可能失败（门控模型）")
    print("请先执行：export HF_TOKEN=你的token\n")

# XLabs ControlNet 不在 hf-mirror，直连 huggingface.co
print("下载 ControlNet Lineart（约 1.5GB）...")
snapshot_download(
    "XLabs-AI/flux-controlnet-lineart-v3",
    token=token,
    endpoint="https://huggingface.co",
)

# FLUX.1-dev 用 hf-mirror 加速（国内快）
print("\n下载 FLUX.1-dev（约 24GB，需要较长时间）...")
snapshot_download(
    "black-forest-labs/FLUX.1-dev",
    token=token,
    endpoint="https://hf-mirror.com",
)

print("\n模型下载完成！可以启动服务了：bash start.sh")
EOF
