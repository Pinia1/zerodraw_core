# 一键安装脚本 (PowerShell)
# 使用 Python 3.11 创建虚拟环境并安装依赖

$ErrorActionPreference = "Stop"
$PY = "py -3.11"

Write-Host "=== zeroDraw AI Render 环境安装 ===" -ForegroundColor Cyan

Write-Host "`n[1/3] 创建虚拟环境 .venv ..." -ForegroundColor Yellow
Invoke-Expression "$PY -m venv .venv"

Write-Host "[2/3] 激活虚拟环境..." -ForegroundColor Yellow
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip

Write-Host "[3/3] 安装依赖（Z-Image-Turbo，需 diffusers>=0.33，CUDA 12.8 索引）..." -ForegroundColor Yellow
pip install --extra-index-url https://download.pytorch.org/whl/cu128 -r requirements.txt

Write-Host "`n下载模型（约 12GB+，首次必须）：" -ForegroundColor Cyan
Write-Host "  cd ..\.. && node download-model.mjs" -ForegroundColor White

Write-Host "`n可选环境变量：" -ForegroundColor Cyan
Write-Host "  `$env:AI_RENDER_CPU_OFFLOAD='0'  # 16GB+ 显存可关闭 offload 加速" -ForegroundColor White
Write-Host "  `$env:AI_RENDER_SIZE='768'       # 更大尺寸（需更多显存）" -ForegroundColor White

Write-Host "`n=== 安装完成 ===" -ForegroundColor Green
Write-Host "  .\.venv\Scripts\python.exe server.py" -ForegroundColor White
