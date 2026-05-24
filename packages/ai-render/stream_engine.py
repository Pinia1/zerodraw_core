"""
SDXL + ControlNet Scribble 草图渲染引擎
高质量草图转插画，4090 约 3-8s/张
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
from diffusers import ControlNetModel, StableDiffusionXLControlNetPipeline
from PIL import Image

logger = logging.getLogger(__name__)

BASE_MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"
CONTROLNET_ID = "xinsir/controlnet-scribble-sdxl-1.0"
MODEL_ID = "SDXL + ControlNet Scribble"

RENDER_SIZE = int(os.environ.get("AI_RENDER_SIZE", "1024"))
NUM_INFERENCE_STEPS = int(os.environ.get("AI_RENDER_STEPS", "20"))
GUIDANCE_SCALE = float(os.environ.get("AI_RENDER_GUIDANCE", "7.5"))

torch.set_grad_enabled(False)
if torch.cuda.is_available():
    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.allow_tf32 = True


def _pick_dtype(device: str) -> torch.dtype:
    if device != "cuda":
        return torch.float32
    return torch.float16


def _calc_sdxl_size(w: int, h: int, target: int = 1024) -> tuple[int, int]:
    """保持宽高比，长边对齐 target，结果为 8 的倍数。"""
    if w >= h:
        out_w = target
        out_h = max(64, round(target * h / w / 8) * 8)
    else:
        out_h = target
        out_w = max(64, round(target * w / h / 8) * 8)
    return out_w, out_h


def preprocess_sketch(image: Image.Image, width: int, height: int) -> Image.Image:
    """草图预处理：深色线条白底 → 白色线条黑底（ControlNet Scribble 格式）"""
    img = image.convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
    gray = np.array(img.convert("L"), dtype=np.float32)
    inverted = 255.0 - gray
    enhanced = np.clip(inverted * 1.8, 0, 255)
    return Image.fromarray(enhanced.astype(np.uint8)).convert("RGB")


def normalize_inference_params(strength: float, steps: int) -> tuple[float, int]:
    """strength 映射为 ControlNet conditioning scale（0.3–1.0），steps 固定。"""
    cn_scale = max(0.3, min(1.0, float(strength)))
    return cn_scale, NUM_INFERENCE_STEPS


class SketchRenderEngine:
    def __init__(self, device: str, dtype: torch.dtype, use_cpu_offload: bool = False) -> None:
        self.device = device
        self.dtype = dtype
        self.use_cpu_offload = use_cpu_offload and device == "cuda"
        self._lock = threading.Lock()
        self._pipe: Optional[StableDiffusionXLControlNetPipeline] = None

    def _ensure_pipe(self) -> StableDiffusionXLControlNetPipeline:
        if self._pipe is not None:
            return self._pipe

        logger.info("加载 ControlNet: %s", CONTROLNET_ID)
        start = time.time()
        controlnet = ControlNetModel.from_pretrained(CONTROLNET_ID, torch_dtype=self.dtype)

        logger.info("加载 SDXL base: %s", BASE_MODEL_ID)
        pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
            BASE_MODEL_ID,
            controlnet=controlnet,
            torch_dtype=self.dtype,
            low_cpu_mem_usage=True,
        )

        if self.use_cpu_offload:
            pipe.enable_model_cpu_offload()
            logger.info("已启用 CPU offload")
        else:
            pipe.to(self.device)

        pipe.set_progress_bar_config(disable=True)
        self._pipe = pipe
        logger.info("模型加载完成，耗时 %.1fs", time.time() - start)
        return pipe

    def render(self, image: Image.Image, prompt: str, strength: float, steps: int) -> Image.Image:
        cn_scale, steps = normalize_inference_params(strength, steps)
        out_w, out_h = _calc_sdxl_size(image.width, image.height, RENDER_SIZE)
        control_image = preprocess_sketch(image, out_w, out_h)

        with self._lock:
            pipe = self._ensure_pipe()
            generator = torch.Generator(device="cuda" if self.device == "cuda" else "cpu")
            generator.manual_seed(int(time.time() * 1000) % 2_147_483_647)

            result = pipe(
                prompt=prompt,
                image=control_image,
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
    dtype = _pick_dtype(device)
    use_cpu_offload = os.environ.get("AI_RENDER_CPU_OFFLOAD", "0") != "0"
    return SketchRenderEngine(device=device, dtype=dtype, use_cpu_offload=use_cpu_offload)


StreamRenderEngine = SketchRenderEngine
