#!/bin/bash
set -e
cd "$(dirname "$0")"

export HF_ENDPOINT=${HF_ENDPOINT:-https://hf-mirror.com}
export HF_HUB_DISABLE_SYMLINKS_WARNING=1

echo "开始下载 Z-Image-Turbo（Tongyi-MAI/Z-Image-Turbo）..."
echo "模型约 12GB+，请耐心等待"
echo "HF_ENDPOINT = $HF_ENDPOINT"
echo ""

.venv/bin/python - <<'EOF'
import torch
from diffusers import ZImageImg2ImgPipeline

dtype = torch.bfloat16 if torch.cuda.is_available() and torch.cuda.is_bf16_supported() else torch.float16
print(f"使用 dtype: {dtype}, CUDA: {torch.cuda.is_available()}")

ZImageImg2ImgPipeline.from_pretrained(
    "Tongyi-MAI/Z-Image-Turbo",
    torch_dtype=dtype,
    low_cpu_mem_usage=True,
)
print("\n模型下载完成！可以启动服务了：bash start.sh")
EOF
