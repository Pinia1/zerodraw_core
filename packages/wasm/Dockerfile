# Dockerfile — Docker 构建 libmypaint WASM
# 用法:
#   docker build -t mypaint-wasm .
#   docker run --rm -v "%cd%\dist:/app/dist" mypaint-wasm    # Windows CMD
#   docker run --rm -v "$(pwd)/dist:/app/dist" mypaint-wasm  # Linux/Mac

FROM emscripten/emsdk:3.1.56

WORKDIR /app

# 只复制编译所需文件
COPY packages/libmypaint/ ./libmypaint/
COPY packages/wasm/src/   ./wasm/src/

# 生成 brush settings 头文件
RUN python3 libmypaint/generate.py \
        libmypaint/mypaint-brush-settings-gen.h \
        libmypaint/mypaint-brush-settings-gen-internal.h

# 创建输出目录
RUN mkdir -p dist

# 编译
RUN emcc \
    wasm/src/bindings.c \
    -I./libmypaint \
    -I./wasm/src \
    -O2 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME=LibMyPaint \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=33554432 \
    -s MAXIMUM_MEMORY=536870912 \
    -s EXPORTED_FUNCTIONS='["_mypaint_init","_mypaint_brush_new","_mypaint_brush_unref","_mypaint_brush_from_defaults","_mypaint_brush_reset","_mypaint_brush_new_stroke","_mypaint_brush_set_base_value","_mypaint_brush_get_base_value","_mypaint_brush_from_string","_mypaint_brush_set_mapping_n","_mypaint_brush_set_mapping_point","_mypaint_brush_stroke_to","_mypaint_fixed_tiled_surface_new","_mypaint_fixed_tiled_surface_interface","_mypaint_surface_begin_atomic","_wasm_end_atomic_get_roi","_wasm_surface_to_rgba8","_wasm_surface_to_rgba8_roi","_wasm_surface_clear","_wasm_alloc_string","_wasm_free_string","_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["cwrap","HEAPU8","HEAPU16","HEAP32","_malloc","_free"]' \
    -s ENVIRONMENT=web,worker \
    -s NO_EXIT_RUNTIME=1 \
    -lm \
    -o dist/libmypaint.js

CMD ["sh", "-c", "echo 'Build done. Files:' && ls -lh /app/dist/"]
