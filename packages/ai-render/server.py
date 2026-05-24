"""
实时草图渲染服务（Z-Image-Turbo img2img）
WebSocket 协议见 packages/api-contract/src/aiRender.ts
"""
import asyncio
import base64
import io
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any, Optional

import torch
import uvicorn
from PIL import Image
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from protocol import (
    AI_RENDER_PROTOCOL_VERSION,
    ERR_INVALID_MESSAGE,
    ERR_MISSING_IMAGE,
    ERR_RENDER_FAILED,
    MSG_ERROR,
    MSG_PING,
    MSG_PONG,
    MSG_READY,
    MSG_RENDER,
    MSG_RENDER_RESULT,
)
from stream_engine import MODEL_ID, RENDER_SIZE, SketchRenderEngine, create_engine

os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

engine: Optional[SketchRenderEngine] = None
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    engine = create_engine()
    logger.info("预加载 Z-Image-Turbo...")
    engine.render(
        Image.new("RGB", (RENDER_SIZE, RENDER_SIZE), (255, 255, 255)),
        prompt="detailed illustration, digital art",
        strength=0.65,
        steps=4,
    )
    logger.info("预加载完成")
    yield
    engine = None
    if DEVICE == "cuda":
        torch.cuda.empty_cache()


app = FastAPI(title="zeroDraw AI Render", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_render_params(strength: float, steps: int) -> tuple[float, int]:
    from stream_engine import normalize_inference_params

    return normalize_inference_params(strength, steps)


def enhance_prompt(prompt: str) -> str:
    p = prompt.strip()
    base = "masterpiece, best quality, highly detailed, vivid colors, professional digital illustration"
    if not p:
        return f"beautiful artwork, {base}"
    # 短 prompt 自动补「草图转插画」语境
    if len(p.split()) <= 6:
        return f"{p}, turn sketch into illustration, {base}"
    return f"{p}, {base}"


def prepare_image(image: Image.Image) -> Image.Image:
    if image.width < 8 or image.height < 8:
        raise ValueError(f"image too small: {image.width}x{image.height}")
    return image.convert("RGB").resize((RENDER_SIZE, RENDER_SIZE), Image.Resampling.LANCZOS)


def render_image(
    image: Image.Image,
    prompt: str,
    strength: float = 0.75,
    steps: int = 2,
) -> Image.Image:
    assert engine is not None
    strength, steps = normalize_render_params(strength, steps)
    image = prepare_image(image)
    return engine.render(image, prompt, strength, steps)


def decode_image(data: str) -> Image.Image:
    if data.startswith("data:"):
        data = data.split(",", 1)[1]
    raw = base64.b64decode(data)
    return Image.open(io.BytesIO(raw)).convert("RGB")


def encode_image(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=False)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"


async def send_error(
    websocket: WebSocket,
    code: str,
    message: str,
    request_id: Optional[str] = None,
) -> None:
    payload: dict[str, Any] = {"type": MSG_ERROR, "code": code, "message": message}
    if request_id:
        payload["requestId"] = request_id
    await websocket.send_json(payload)


async def handle_render(websocket: WebSocket, data: dict[str, Any]) -> None:
    request_id = str(data.get("requestId", ""))
    image_b64 = str(data.get("image", ""))
    prompt = str(data.get("prompt", "detailed digital illustration"))
    strength = float(data.get("strength", 0.65))
    steps = int(data.get("steps", 4))
    strength, steps = normalize_render_params(strength, steps)
    prompt = enhance_prompt(prompt)

    if not request_id:
        await send_error(websocket, ERR_INVALID_MESSAGE, "missing requestId")
        return
    if not image_b64:
        await send_error(websocket, ERR_MISSING_IMAGE, "missing image", request_id)
        return

    t0 = time.perf_counter()
    loop = asyncio.get_event_loop()

    try:
        input_image = decode_image(image_b64)
        output_image = await loop.run_in_executor(
            None,
            lambda: render_image(input_image, prompt, strength, steps),
        )
    except Exception as e:
        logger.error("推理错误 requestId=%s: %s", request_id, e, exc_info=True)
        await send_error(websocket, ERR_RENDER_FAILED, str(e), request_id)
        return

    elapsed_ms = round((time.perf_counter() - t0) * 1000)
    await websocket.send_json(
        {
            "type": MSG_RENDER_RESULT,
            "requestId": request_id,
            "image": encode_image(output_image),
            "elapsed_ms": elapsed_ms,
        }
    )


@app.websocket("/render")
async def render_ws(websocket: WebSocket):
    await websocket.accept()
    client = websocket.client
    logger.info("客户端连接: %s", client)

    await websocket.send_json(
        {
            "type": MSG_READY,
            "protocolVersion": AI_RENDER_PROTOCOL_VERSION,
            "model": f"{MODEL_ID} (Z-Image img2img)",
            "device": DEVICE,
            "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        }
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == MSG_RENDER:
                await handle_render(websocket, data)
            elif msg_type == MSG_PING:
                await websocket.send_json(
                    {
                        "type": MSG_PONG,
                        "requestId": data.get("requestId"),
                    }
                )
            else:
                await send_error(
                    websocket,
                    ERR_INVALID_MESSAGE,
                    f"unknown message type: {msg_type}",
                    data.get("requestId"),
                )

    except WebSocketDisconnect:
        logger.info("客户端断开: %s", client)
    except Exception as e:
        logger.error("WebSocket 错误: %s", e, exc_info=True)
        try:
            await send_error(websocket, ERR_RENDER_FAILED, str(e))
        except Exception:
            pass


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "protocolVersion": AI_RENDER_PROTOCOL_VERSION,
        "device": DEVICE,
        "model": f"{MODEL_ID} (Z-Image img2img)",
        "cuda_available": torch.cuda.is_available(),
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="info")
