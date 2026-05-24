#!/bin/bash
set -e

echo "=== zeroDraw AI Render 环境安装（Linux） ==="

# 检测 CUDA 版本，决定 PyTorch wheel 索引
detect_cuda() {
    # 优先用 nvidia-smi（AutoDL 总有）
    if command -v nvidia-smi &>/dev/null; then
        nvidia-smi | grep -oP 'CUDA Version: \K[0-9]+\.[0-9]+' | head -1
    elif command -v nvcc &>/dev/null; then
        nvcc --version | grep -oP 'release \K[0-9]+\.[0-9]+'
    else
        echo "12.1"
    fi
}

CUDA_VER=$(detect_cuda)
CUDA_MAJOR=$(echo "$CUDA_VER" | cut -d. -f1)
CUDA_MINOR=$(echo "$CUDA_VER" | cut -d. -f2)
echo "检测到 CUDA: $CUDA_VER"

if   [ "$CUDA_MAJOR" -ge 13 ];                             then CU_TAG="cu128"
elif [ "$CUDA_MAJOR" -ge 12 ] && [ "$CUDA_MINOR" -ge 8 ]; then CU_TAG="cu128"
elif [ "$CUDA_MAJOR" -ge 12 ] && [ "$CUDA_MINOR" -ge 4 ]; then CU_TAG="cu124"
elif [ "$CUDA_MAJOR" -ge 12 ];                             then CU_TAG="cu121"
else                                                            CU_TAG="cu118"
fi
TORCH_INDEX="https://download.pytorch.org/whl/${CU_TAG}"
echo "使用 PyTorch 索引: $TORCH_INDEX"

echo ""
echo "[1/3] 创建虚拟环境 .venv ..."
python3 -m venv .venv

echo "[2/3] 升级 pip ..."
.venv/bin/pip install --upgrade pip -q

echo "[3/3] 安装依赖 ..."
.venv/bin/pip install --extra-index-url "$TORCH_INDEX" -r requirements.txt

echo ""
echo "=== 安装完成 ==="
echo ""
echo "下载模型（约 12GB+，首次必须）："
echo "  bash download-model.sh"
echo ""
echo "启动服务："
echo "  bash start.sh"
echo ""
echo "可选环境变量："
echo "  AI_RENDER_CPU_OFFLOAD=0   # 4090 默认已关闭，若<16GB显存改为1"
echo "  AI_RENDER_SIZE=768        # 更大尺寸（需更多显存）"
