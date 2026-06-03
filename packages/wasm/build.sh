#!/usr/bin/env bash
# =============================================================================
# build.sh — 将 libmypaint 编译为 WebAssembly
#
# 用法:
#   bash build.sh          # release 构建 (-O2)
#   bash build.sh debug    # debug 构建 (-O0 -g)
#   bash build.sh install  # 安装 emsdk 后再构建 (首次使用)
#
# 依赖: Python3, git, emcc (Emscripten)
# 在以下环境测试通过:
#   - WSL / Linux
#   - macOS
#   - Windows Git Bash (需要先 source emsdk_env.bat)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LIBMYPAINT_DIR="${REPO_ROOT}/packages/libmypaint"
SRC_DIR="${SCRIPT_DIR}/src"
DIST_DIR="${SCRIPT_DIR}/dist"
EMSDK_DIR="${REPO_ROOT}/.emsdk"

MODE="${1:-release}"

# ── 颜色输出 ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[wasm]${NC} $*"; }
warn() { echo -e "${YELLOW}[wasm]${NC} $*"; }
err()  { echo -e "${RED}[wasm]${NC} $*" >&2; exit 1; }

# ── emsdk 安装 ───────────────────────────────────────────────────────────────
install_emsdk() {
    log "Installing emsdk to ${EMSDK_DIR} ..."
    git clone https://github.com/emscripten-core/emsdk.git "${EMSDK_DIR}"
    cd "${EMSDK_DIR}"
    ./emsdk install latest
    ./emsdk activate latest
    cd - >/dev/null
    log "emsdk installed. Re-run: bash build.sh"
    exit 0
}

# ── 激活 emsdk (若在 .emsdk 目录下) ─────────────────────────────────────────
activate_local_emsdk() {
    if [ -f "${EMSDK_DIR}/emsdk_env.sh" ]; then
        # shellcheck disable=SC1090
        source "${EMSDK_DIR}/emsdk_env.sh" >/dev/null 2>&1 || true
    fi
}

# ── 检查 emcc ────────────────────────────────────────────────────────────────
activate_local_emsdk
if ! command -v emcc >/dev/null 2>&1; then
    if [ "${MODE}" = "install" ]; then
        install_emsdk
    fi
    warn "emcc not found."
    warn "Options:"
    warn "  1. Run:  bash build.sh install   # auto-installs emsdk"
    warn "  2. Use Docker: docker build -t mypaint-wasm . && docker run --rm -v \"\$(pwd)/dist:/app/dist\" mypaint-wasm"
    warn "  3. Install emsdk manually: https://emscripten.org/docs/getting_started/downloads.html"
    err "Cannot continue without emcc."
fi

log "Using emcc: $(emcc --version 2>&1 | head -1)"

# ── 生成 libmypaint 自动生成头文件 ───────────────────────────────────────────
GEN_H="${LIBMYPAINT_DIR}/mypaint-brush-settings-gen.h"
GEN_H_INTERNAL="${LIBMYPAINT_DIR}/mypaint-brush-settings-gen-internal.h"
if [ ! -f "${GEN_H}" ]; then
    log "Generating brush settings headers ..."
    python3 "${LIBMYPAINT_DIR}/generate.py" "${GEN_H}" "${GEN_H_INTERNAL}" \
        || err "generate.py failed. Ensure Python3 is installed."
fi

# ── 创建输出目录 ─────────────────────────────────────────────────────────────
mkdir -p "${DIST_DIR}"

# ── 编译标志 ─────────────────────────────────────────────────────────────────
if [ "${MODE}" = "debug" ]; then
    OPT_FLAGS="-O0 -g -s ASSERTIONS=2 -s SAFE_HEAP=1"
    log "Building in DEBUG mode ..."
else
    OPT_FLAGS="-O2"
    log "Building in RELEASE mode ..."
fi

# 导出的 C 函数列表（TypeScript 层通过 cwrap 调用）
EXPORTED_FUNCTIONS='[
  "_mypaint_init",
  "_mypaint_brush_new",
  "_mypaint_brush_unref",
  "_mypaint_brush_from_defaults",
  "_mypaint_brush_reset",
  "_mypaint_brush_new_stroke",
  "_mypaint_brush_set_base_value",
  "_mypaint_brush_get_base_value",
  "_mypaint_brush_from_string",
  "_mypaint_brush_set_mapping_n",
  "_mypaint_brush_set_mapping_point",
  "_mypaint_brush_stroke_to",
  "_mypaint_fixed_tiled_surface_new",
  "_mypaint_fixed_tiled_surface_interface",
  "_mypaint_surface_begin_atomic",
  "_wasm_end_atomic_get_roi",
  "_wasm_surface_to_rgba8",
  "_wasm_surface_to_rgba8_roi",
  "_wasm_surface_clear",
  "_wasm_alloc_string",
  "_wasm_free_string",
  "_malloc",
  "_free"
]'

EXPORTED_RUNTIME='["cwrap","HEAPU8","HEAPU16","HEAP32"]'

# ── 执行编译 ─────────────────────────────────────────────────────────────────
log "Compiling bindings.c → dist/libmypaint.js + dist/libmypaint.wasm ..."

emcc \
    "${SRC_DIR}/bindings.c" \
    -I"${LIBMYPAINT_DIR}" \
    -I"${SRC_DIR}" \
    ${OPT_FLAGS} \
    -s MODULARIZE=1 \
    -s "EXPORT_NAME=LibMyPaint" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=33554432 \
    -s MAXIMUM_MEMORY=536870912 \
    -s "EXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS}" \
    -s "EXPORTED_RUNTIME_METHODS=${EXPORTED_RUNTIME}" \
    -s ENVIRONMENT=web,worker \
    -s NO_EXIT_RUNTIME=1 \
    -lm \
    -o "${DIST_DIR}/libmypaint.js"

log "✓ Build complete:"
ls -lh "${DIST_DIR}/libmypaint.js" "${DIST_DIR}/libmypaint.wasm"
