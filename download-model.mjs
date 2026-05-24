/**
 * 用国内镜像下载 Z-Image-Turbo 模型（约 12GB+，首次较慢）
 * 用法：node download-model.mjs
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === 'win32';
const PYTHON = path.join(
  __dirname,
  'packages/ai-render/.venv',
  isWin ? 'Scripts/python.exe' : 'bin/python',
);

const script = `
import os
os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'

import torch
from diffusers import ZImageImg2ImgPipeline

print('开始下载 Z-Image-Turbo（Tongyi-MAI/Z-Image-Turbo）...')
print('模型较大，请耐心等待\\n')

dtype = torch.bfloat16 if torch.cuda.is_available() and torch.cuda.is_bf16_supported() else torch.float16

pipe = ZImageImg2ImgPipeline.from_pretrained(
    'Tongyi-MAI/Z-Image-Turbo',
    torch_dtype=dtype,
    low_cpu_mem_usage=True,
)

print('\\n模型下载完成！')
print('启动：cd packages/ai-render && .venv/Scripts/python.exe server.py')
`;

const proc = spawn(PYTHON, ['-c', script], {
  stdio: 'inherit',
  env: {
    ...process.env,
    HF_ENDPOINT: 'https://hf-mirror.com',
    HF_HUB_DISABLE_SYMLINKS_WARNING: '1',
  },
});

proc.on('exit', (code) => {
  process.exit(code ?? 0);
});
