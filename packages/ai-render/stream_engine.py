"""
FLUX.1-dev + ControlNet Lineart 草图渲染引擎
高质量草图转插画，4090 约 8-20s/张
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
from diffusers import FluxControlNetModel, FluxControlNetPipeline
from PIL import Image

logger = logging.getLogger(__name__)

BASE_MODEL_ID = "black-forest-labs/FLUX.1-dev"
CONTROLNET_ID = "XLabs-AI/flux-controlnet-lineart-v3"
MODEL_ID = "FLUX.1-dev + ControlNet Lineart"

RENDER_SIZE = int(os.environ.get("AI_RENDER_SIZE", "1024"))
NUM_INFERENCE_STEPS = int(os.environ.get("AI_RENDER_STEPS", "28"))
GUIDANCE_SCALE = float(os.environ.get("AI_RENDER_GUIDANCE", "3.5"))

torch.set_grad_enabled(False)
if torch.cuda.is_available():
    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.allow_tf32 = True


def _calc_output_size(w: int, h: int, target: int = 1024) -> tuple[int, int]:
    """保持宽高比，长边对齐 target，结果为 16 的倍数（FLUX 要求）。"""
    if w >= h:
        out_w = target
        out_h = max(64, round(target * h / w / 16) * 16)
    else:
        out_h = target
        out_w = max(64, round(target * w / h / 16) * 16)
    return out_w, out_h


def preprocess_sketch(image: Image.Image, width: int, height: int) -> Image.Image:
    """草图预处理：深色线条白底 → 白色线条黑底（Lineart ControlNet 格式）"""
    img = image.convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
    gray = np.array(img.convert("L"), dtype=np.float32)
    inverted = 255.0 - gray
    enhanced = np.clip(inverted * 1.8, 0, 255)
    return Image.fromarray(enhanced.astype(np.uint8)).convert("RGB")


def normalize_inference_params(strength: float, steps: int) -> tuple[float, int]:
    """strength 映射为 ControlNet conditioning scale（0.3–1.0）。"""
    cn_scale = max(0.3, min(1.0, float(strength)))
    return cn_scale, NUM_INFERENCE_STEPS


class SketchRenderEngine:
    def __init__(self, device: str, dtype: torch.dtype, use_cpu_offload: bool = True) -> None:
        self.device = device
        self.dtype = dtype
        self.use_cpu_offload = use_cpu_offload
        self._lock = threading.Lock()
        self._pipe: Optional[FluxControlNetPipeline] = None

    def _ensure_pipe(self) -> FluxControlNetPipeline:
        if self._pipe is not None:
            return self._pipe

        logger.info("加载 ControlNet Lineart: %s", CONTROLNET_ID)
        start = time.time()
        controlnet = FluxControlNetModel.from_pretrained(CONTROLNET_ID, torch_dtype=self.dtype)

        logger.info("加载 FLUX.1-dev: %s", BASE_MODEL_ID)
        pipe = FluxControlNetPipeline.from_pretrained(
            BASE_MODEL_ID,
            controlnet=controlnet,
            torch_dtype=self.dtype,
            low_cpu_mem_usage=True,
        )

        # FLUX.1-dev 约 24GB，4090 必须开 offload
        pipe.enable_model_cpu_offload()
        logger.info("已启用 CPU offload")

        pipe.set_progress_bar_config(disable=True)
        self._pipe = pipe
        logger.info("模型加载完成，耗时 %.1fs", time.time() - start)
        return pipe

    def render(self, image: Image.Image, prompt: str, strength: float, steps: int) -> Image.Image:
        cn_scale, steps = normalize_inference_params(strength, steps)
        out_w, out_h = _calc_output_size(image.width, image.height, RENDER_SIZE)
        control_image = preprocess_sketch(image, out_w, out_h)

        with self._lock:
            pipe = self._ensure_pipe()
            generator = torch.Generator(device="cpu")
            generator.manual_seed(int(time.time() * 1000) % 2_147_483_647)

            result = pipe(
                prompt=prompt,
                control_image=control_image,
                num_inference_steps=steps,
                guidance_scale=GUIDANCE_SCALE,
                controlnet_conditioning_scale=cn_scale,
                height=out_h,
                width=out_w,
                generator=generator,
            )
        return result.images[0]


def create_engine() -> SketchRenderEngine:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.bfloat16 if device == "cuda" else torch.float32
    return SketchRenderEngine(device=device, dtype=dtype)


StreamRenderEngine = SketchRenderEngine
