/*
 * bindings.c - libmypaint WASM binding layer
 *
 * Compiled as a single translation unit that includes all of libmypaint.
 * This grants access to internal structs (MyPaintFixedTiledSurface) needed
 * for pixel export without modifying the upstream sources.
 *
 * Build with:
 *   emcc bindings.c -I../libmypaint -I./  ...flags...
 */

#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>

/* --- Our JSON shim (must come before libmypaint includes json.h) --- */
#include "json_impl.c"

/* --- All of libmypaint as a single compilation unit --- */
/* The amalgamation file uses -I../libmypaint to resolve internal includes */
#include "../../libmypaint/helpers.c"
#include "../../libmypaint/brushmodes.c"
#include "../../libmypaint/fifo.c"
#include "../../libmypaint/operationqueue.c"
#include "../../libmypaint/rng-double.c"
#include "../../libmypaint/tilemap.c"
#include "../../libmypaint/mypaint.c"
#include "../../libmypaint/mypaint-brush.c"
#include "../../libmypaint/mypaint-brush-settings.c"
#include "../../libmypaint/mypaint-fixed-tiled-surface.c"
#include "../../libmypaint/mypaint-matrix.c"
#include "../../libmypaint/mypaint-symmetry.c"
#include "../../libmypaint/mypaint-surface.c"
#include "../../libmypaint/mypaint-tiled-surface.c"
#include "../../libmypaint/mypaint-rectangle.c"
#include "../../libmypaint/mypaint-mapping.c"

/*
 * After the above includes, the full definition of MyPaintFixedTiledSurface
 * is in scope (from mypaint-fixed-tiled-surface.c):
 *
 *   struct MyPaintFixedTiledSurface {
 *       MyPaintTiledSurface parent;
 *       size_t   tile_size;      // bytes per tile
 *       uint16_t *tile_buffer;   // linear tile store, 15-bit premul RGBA
 *       uint16_t *null_tile;
 *       int tiles_width;
 *       int tiles_height;
 *       int width;
 *       int height;
 *   };
 */

#ifdef __EMSCRIPTEN__
#  include <emscripten.h>
#  define WASM_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#  define WASM_EXPORT
#endif

/* ================================================================== */
/* Pixel format conversion helpers                                     */
/*                                                                     */
/* MyPaint stores 15-bit premultiplied RGBA (uint16, 0-32768).         */
/* Canvas ImageData expects 8-bit straight-alpha RGBA (uint8, 0-255).  */
/* ================================================================== */

static inline void convert_pixel(const uint16_t *src, uint8_t *dst) {
    /* MyPaint range is 0-32768; initial memset(0xFF) gives 65535 = "white".
     * Clamp to 32768 before conversion to avoid uint8 overflow.            */
    uint32_t r = src[0] > 32768u ? 32768u : src[0];
    uint32_t g = src[1] > 32768u ? 32768u : src[1];
    uint32_t b = src[2] > 32768u ? 32768u : src[2];
    uint32_t a = src[3] > 32768u ? 32768u : src[3];

    dst[3] = (uint8_t)((a * 255u) >> 15); /* 32768*255>>15 = 255 */
    if (a > 0u) {
        /* un-premultiply then scale to 8-bit: R8 = R_premul * 255 / a */
        dst[0] = (uint8_t)((r * 255u + a / 2u) / a);
        dst[1] = (uint8_t)((g * 255u + a / 2u) / a);
        dst[2] = (uint8_t)((b * 255u + a / 2u) / a);
    } else {
        dst[0] = dst[1] = dst[2] = 0;
    }
}

/* ================================================================== */
/* wasm_surface_to_rgba8                                               */
/* Converts the entire surface to an RGBA8888 buffer at `dst`.        */
/* ================================================================== */
WASM_EXPORT
void wasm_surface_to_rgba8(MyPaintFixedTiledSurface *surf, uint8_t *dst) {
    const int TS = MYPAINT_TILE_SIZE; /* 64 */
    const int tile_px = TS * TS;
    const int W = surf->width;
    const int H = surf->height;
    const int TW = surf->tiles_width;

    for (int ty = 0; ty < surf->tiles_height; ty++) {
        const int base_y = ty * TS;
        const int row_end = base_y + TS < H ? TS : H - base_y;

        for (int tx = 0; tx < TW; tx++) {
            const int base_x = tx * TS;
            const int col_end = base_x + TS < W ? TS : W - base_x;

            const uint16_t *tile = surf->tile_buffer + (size_t)(ty * TW + tx) * tile_px * 4;

            for (int ly = 0; ly < row_end; ly++) {
                int py = base_y + ly;
                for (int lx = 0; lx < col_end; lx++) {
                    int px = base_x + lx;
                    const uint16_t *src = tile + (ly * TS + lx) * 4;
                    uint8_t *d = dst + (py * W + px) * 4;
                    convert_pixel(src, d);
                }
            }
        }
    }
}

/* ================================================================== */
/* wasm_surface_to_rgba8_roi                                           */
/* Converts a rectangular region to `dst` (packed, no stride gap).   */
/* ================================================================== */
WASM_EXPORT
void wasm_surface_to_rgba8_roi(MyPaintFixedTiledSurface *surf, uint8_t *dst,
                                int rx, int ry, int rw, int rh)
{
    const int TS = MYPAINT_TILE_SIZE;
    const int W  = surf->width;
    const int H  = surf->height;
    const int TW = surf->tiles_width;

    /* Clamp region to surface bounds */
    if (rx < 0) { rw += rx; rx = 0; }
    if (ry < 0) { rh += ry; ry = 0; }
    if (rx + rw > W) rw = W - rx;
    if (ry + rh > H) rh = H - ry;
    if (rw <= 0 || rh <= 0) return;

    /* Iterate tile by tile — avoids per-pixel division/modulo and is cache-friendly */
    int tx0 = rx / TS, ty0 = ry / TS;
    int tx1 = (rx + rw - 1) / TS, ty1 = (ry + rh - 1) / TS;

    for (int ty = ty0; ty <= ty1; ty++) {
        for (int tx = tx0; tx <= tx1; tx++) {
            const uint16_t *tile = surf->tile_buffer +
                                   (size_t)(ty * TW + tx) * TS * TS * 4;

            /* pixel range within this tile that overlaps the ROI */
            int lx0 = (tx == tx0) ? (rx - tx * TS) : 0;
            int ly0 = (ty == ty0) ? (ry - ty * TS) : 0;
            int lx1 = (tx == tx1) ? (rx + rw - 1 - tx * TS) : (TS - 1);
            int ly1 = (ty == ty1) ? (ry + rh - 1 - ty * TS) : (TS - 1);

            for (int ly = ly0; ly <= ly1; ly++) {
                int py = ty * TS + ly;
                for (int lx = lx0; lx <= lx1; lx++) {
                    int px = tx * TS + lx;
                    const uint16_t *src = tile + (ly * TS + lx) * 4;
                    uint8_t *d = dst + ((py - ry) * rw + (px - rx)) * 4;
                    convert_pixel(src, d);
                }
            }
        }
    }
}

/* ================================================================== */
/* wasm_surface_clear                                                  */
/* Resets all pixels to opaque white (matches mypaint_fixed_tiled_    */
/* surface_new initialisation: memset 0xFF = 65535 per channel).       */
/* ================================================================== */
WASM_EXPORT
void wasm_surface_clear(MyPaintFixedTiledSurface *surf) {
    /* 0 = fully transparent; contrast with the constructor which inits to 0xFF (white) */
    size_t total = (size_t)surf->tiles_width * surf->tiles_height * surf->tile_size;
    memset(surf->tile_buffer, 0, total);
}

WASM_EXPORT
void wasm_surface_clear_white(MyPaintFixedTiledSurface *surf) {
    size_t total = (size_t)surf->tiles_width * surf->tiles_height * surf->tile_size;
    memset(surf->tile_buffer, 0xFF, total);
}

/* ================================================================== */
/* wasm_end_atomic_get_roi                                             */
/* Ends an atomic painting operation and returns the bounding rect of */
/* the dirty region via output pointers (x, y, w, h).                 */
/* ================================================================== */
WASM_EXPORT
void wasm_end_atomic_get_roi(MyPaintSurface *surf,
                              int *out_x, int *out_y,
                              int *out_w, int *out_h)
{
    MyPaintRectangle bbox = { 0, 0, 0, 0 };
    MyPaintRectangles rois;
    rois.num_rectangles = 1;
    rois.rectangles     = &bbox;

    mypaint_surface_end_atomic(surf, &rois);

    *out_x = bbox.x;
    *out_y = bbox.y;
    *out_w = bbox.width;
    *out_h = bbox.height;
}

/* ================================================================== */
/* String memory helpers (for passing JS strings into WASM heap)      */
/* ================================================================== */
WASM_EXPORT char *wasm_alloc_string(int len) { return (char *)malloc((size_t)(len + 1)); }
WASM_EXPORT void  wasm_free_string (char *p) { free(p); }
