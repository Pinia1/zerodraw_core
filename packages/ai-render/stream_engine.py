"""
Z-Image-Turbo 草图渲染引擎

SD-Turbo img2img 画质上限低，草图场景改用 Tongyi-MAI/Z-Image-Turbo（ZImageImg2ImgPipeline）。
8GB 显存默认 512² + CPU offload。
"""
from __future__ import annotations

import logging
import os
import threading
import time
from typing import Optional

os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

import numpy as np
import torch
from diffusers import ZImageImg2ImgPipeline
from PIL import Image, ImageEnhance

logger = logging.getLogger(__name__)

MODEL_ID = "Tongyi-MAI/Z-Image-Turbo"
RENDER_SIZE = int(os.environ.get("AI_RENDER_SIZE", "512"))
NUM_INFERENCE_STEPS = 9
GUIDANCE_SCALE = 0.0

torch.set_grad_enabled(False)
if torch.cuda.is_available():
    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.allow_tf32 = True


def _pick_dtype(device: str) -> torch.dtype:
    if device != "cuda":
        return torch.float32
    if torch.cuda.is_bf16_supported():
        return torch.bfloat16
    return torch.float16


def preprocess_sketch(image: Image.Image) -> Image.Image:
    """增强线稿对比，便于 img2img 保留结构。"""
    img = image.convert("RGB").resize((RENDER_SIZE, RENDER_SIZE), Image.Resampling.LANCZOS)
    arr = np.asarray(img, dtype=np.float32)
    lum = arr.mean(axis=-1)
    stroke = lum < 245
    arr[stroke] = np.clip(arr[stroke] * 0.15, 0, 255)
    bg = ~stroke
    arr[bg] = np.clip(arr[bg] * 0.92 + 16, 232, 255)
    out = Image.fromarray(arr.astype(np.uint8))
    return ImageEnhance.Contrast(out).enhance(1.4)


def normalize_inference_params(strength: float, steps: int) -> tuple[float, int]:
    """Z-Image-Turbo img2img：strength 控制改动幅度，steps 固定 9（8 NFE）。"""
    strength = max(0.35, min(0.75, float(strength)))
    steps = NUM_INFERENCE_STEPS
    return strength, steps


class SketchRenderEngine:
    def __init__(self, device: str, dtype: torch.dtype, use_cpu_offload: bool = True) -> None:
        self.device = device
        self.dtype = dtype
        self.use_cpu_offload = use_cpu_offload and device == "cuda"
        self._lock = threading.Lock()
        self._pipe: Optional[ZImageImg2ImgPipeline] = None

    def _ensure_pipe(self) -> ZImageImg2ImgPipeline:
        if self._pipe is not None:
            return self._pipe

        logger.info("加载 Z-Image-Turbo %s，设备: %s，尺寸: %s", MODEL_ID, self.device, RENDER_SIZE)
        start = time.time()

        pipe = ZImageImg2ImgPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=self.dtype,
            low_cpu_mem_usage=True,
        )

        if self.use_cpu_offload:
            pipe.enable_model_cpu_offload()
            logger.info("已启用 model CPU offload（适配 8GB 显存）")
        else:
            pipe.to(self.device)

        pipe.set_progress_bar_config(disable=True)
        self._pipe = pipe
        logger.info("Z-Image 加载完成，耗时 %.1fs", time.time() - start)
        return pipe

    def render(
        self,
        image: Image.Image,
        prompt: str,
        strength: float,
        steps: int,
    ) -> Image.Image:
        strength, steps = normalize_inference_params(strength, steps)
        image = preprocess_sketch(image)

        with self._lock:
            pipe = self._ensure_pipe()
            gen_device = "cuda" if self.device == "cuda" else "cpu"
            generator = torch.Generator(device=gen_device).manual_seed(int(time.time() * 1000) % 2_147_483_647)

            result = pipe(
                prompt=prompt,
                image=image,
                strength=strength,
                height=RENDER_SIZE,
                width=RENDER_SIZE,
                num_inference_steps=steps,
                guidance_scale=GUIDANCE_SCALE,
                generator=generator,
            )
        return result.images[0]


def create_engine() -> SketchRenderEngine:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = _pick_dtype(device)
    use_cpu_offload = os.environ.get("AI_RENDER_CPU_OFFLOAD", "1") != "0"
    return SketchRenderEngine(device=device, dtype=dtype, use_cpu_offload=use_cpu_offload)


StreamRenderEngine = SketchRenderEngine
