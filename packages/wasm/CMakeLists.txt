cmake_minimum_required(VERSION 3.16)
project(libmypaint_wasm C)

# ── 要求 Emscripten 工具链 ───────────────────────────────────────────────────
if(NOT EMSCRIPTEN)
    message(FATAL_ERROR
        "This CMakeLists.txt must be invoked with the Emscripten toolchain.\n"
        "Run:  emcmake cmake ..  (instead of plain cmake ..)")
endif()

set(LIBMYPAINT_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../libmypaint")
set(SRC_DIR        "${CMAKE_CURRENT_SOURCE_DIR}/src")

# ── 生成 brush settings 头文件 ───────────────────────────────────────────────
set(GEN_H          "${LIBMYPAINT_DIR}/mypaint-brush-settings-gen.h")
set(GEN_H_INTERNAL "${LIBMYPAINT_DIR}/mypaint-brush-settings-gen-internal.h")

if(NOT EXISTS "${GEN_H}")
    message(STATUS "Generating brush settings headers ...")
    execute_process(
        COMMAND python3 "${LIBMYPAINT_DIR}/generate.py" "${GEN_H}" "${GEN_H_INTERNAL}"
        RESULT_VARIABLE _ret
    )
    if(NOT _ret EQUAL 0)
        message(FATAL_ERROR "generate.py failed — is Python3 installed?")
    endif()
endif()

# ── 导出函数列表 ─────────────────────────────────────────────────────────────
set(EXPORTED_FUNCTIONS
    "_mypaint_init"
    "_mypaint_brush_new"
    "_mypaint_brush_unref"
    "_mypaint_brush_from_defaults"
    "_mypaint_brush_reset"
    "_mypaint_brush_new_stroke"
    "_mypaint_brush_set_base_value"
    "_mypaint_brush_get_base_value"
    "_mypaint_brush_from_string"
    "_mypaint_brush_set_mapping_n"
    "_mypaint_brush_set_mapping_point"
    "_mypaint_brush_stroke_to"
    "_mypaint_fixed_tiled_surface_new"
    "_mypaint_fixed_tiled_surface_interface"
    "_mypaint_surface_begin_atomic"
    "_wasm_end_atomic_get_roi"
    "_wasm_surface_to_rgba8"
    "_wasm_surface_to_rgba8_roi"
    "_wasm_surface_clear"
    "_wasm_alloc_string"
    "_wasm_free_string"
    "_malloc"
    "_free"
)

string(JOIN "," EXPORTED_FUNCTIONS_STR ${EXPORTED_FUNCTIONS})
set(EXPORTED_FUNCTIONS_JSON "[${EXPORTED_FUNCTIONS_STR}]")

# ── 目标：单文件编译（bindings.c 内联了全部 libmypaint 源码）─────────────────
add_executable(libmypaint "${SRC_DIR}/bindings.c")

target_include_directories(libmypaint PRIVATE
    "${LIBMYPAINT_DIR}"
    "${SRC_DIR}"
)

set_target_properties(libmypaint PROPERTIES
    SUFFIX ".js"
    OUTPUT_NAME "libmypaint"
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/dist"
)

target_link_options(libmypaint PRIVATE
    "-sNO_EXIT_RUNTIME=1"
    "-sMODULARIZE=1"
    "-sEXPORT_NAME=LibMyPaint"
    "-sALLOW_MEMORY_GROWTH=1"
    "-sINITIAL_MEMORY=33554432"
    "-sMAXIMUM_MEMORY=536870912"
    "-sEXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS_JSON}"
    "-sEXPORTED_RUNTIME_METHODS=[\"cwrap\",\"HEAPU8\",\"HEAPU16\",\"HEAP32\",\"_malloc\",\"_free\"]"
    "-sENVIRONMENT=web,worker"
    "-lm"
)

target_compile_options(libmypaint PRIVATE -O2)

message(STATUS "Output → ${CMAKE_CURRENT_SOURCE_DIR}/dist/libmypaint.js + .wasm")
