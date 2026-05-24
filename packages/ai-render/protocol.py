"""AI Render WebSocket / HTTP 协议常量（与 @zeroDraw/api-contract/src/aiRender.ts 保持一致）"""

AI_RENDER_WS_PATH = "/render"
AI_RENDER_DEFAULT_PORT = 8765
AI_RENDER_PROTOCOL_VERSION = 1

# Client → Server
MSG_RENDER = "render"
MSG_PING = "ping"

# Server → Client
MSG_READY = "ready"
MSG_RENDER_RESULT = "render.result"
MSG_PONG = "pong"
MSG_ERROR = "error"

# Error codes
ERR_INVALID_MESSAGE = "invalid_message"
ERR_MISSING_IMAGE = "missing_image"
ERR_RENDER_FAILED = "render_failed"
