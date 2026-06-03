# zeroDraw libmypaint WebAssembly - Analysis Report

## Summary

**libmypaint** is a full git submodule (not pre-compiled) of the MyPaint brush engine library.
Uses GNU Autotools (configure.ac, Makefile.am).
Empty `packages/wasm/` directory ready for WASM build infrastructure.
No existing Emscripten configuration found.

---

## File Listing

### Core Files in packages/libmypaint/

**Headers (15 .h files):**
- mypaint.h (89 bytes - minimal init)
- mypaint-brush.h (3.7K) **CRITICAL**
- mypaint-brush-settings.h (2.4K)
- mypaint-surface.h (4.5K) **CRITICAL**
- mypaint-fixed-tiled-surface.h
- mypaint-tiled-surface.h
- mypaint-rectangle.h, mypaint-matrix.h, mypaint-symmetry.h
- mypaint-mapping.h, mypaint-config.h, brushmodes.h, helpers.h
- operationqueue.h

**Implementation (16 .c files - ~5,419 LOC):**
- brushmodes.c (23.7K) - Blend modes
- helpers.c (16K) - Utilities
- mypaint-brush.c, mypaint-surface.c, mypaint-fixed-tiled-surface.c
- mypaint-tiled-surface.c, mypaint-brush-settings.c
- mypaint-rectangle.c, mypaint-matrix.c, mypaint-symmetry.c
- mypaint-mapping.c, fifo.c, tilemap.c, operationqueue.c, rng-double.c

**Build Configuration:**
- configure.ac (9.8K) - Autoconf script
- Makefile.am (4.5K) - Automake rules
- autogen.sh (8.6K) - Bootstrap
- libmypaint.pc.in - pkg-config

**Data:**
- brushsettings.json (37.4K) - Brush parameters definition
- generate.py (11.5K) - JSON to header generator

**Subdirectories:**
- examples/ - minimal.c, libmypaint.c, write_ppm.c, gegl.py
- tests/ - Unit test suite
- doc/ - Doxygen + Sphinx docs
- fastapprox/ - Fast math approximations (fastpow, fastexp, etc.)
- gegl/ - GEGL integration (optional)
- glib/ - GLib bindings (optional)
- po/ - i18n translations
- m4macros/ - Autotools macros

---

## Build System: GNU Autotools

**Version:** libmypaint 2.0.0-beta
**Requires:** autoconf >= 2.62, libtool >= 2.2
**Compiler:** C99 standard

**Output:** Shared library (libmypaint-2.0.so/dll/dylib)

**Build Options:**
- --enable-openmp (parallelization, default: no)
- --enable-gegl (optional, default: no)
- --with-glib (force GLib)
- --disable-introspection (skip GObject introspection)
- --disable-i18n (skip internationalization)
- --enable-docs (build docs)

---

## Main Public API

### Entry: mypaint.h
```c
void mypaint_init(void);
```

### Core: mypaint-brush.h
- MyPaintBrush *mypaint_brush_new(void)
- int mypaint_brush_stroke_to(brush, surface, x, y, pressure, tilt, time, zoom, rotation, ...)
  ^ Main rendering function
- void mypaint_brush_set_base_value(id, value) - ~50 brush settings
- int mypaint_brush_get_inputs_used_n() - input mapping
- void mypaint_brush_set_mapping_point() - pressure/tilt curves

### Canvas: mypaint-surface.h (Callback Interface)
- int mypaint_surface_draw_dab(x, y, radius, color, hardness, opacity, ...)
  ^ Plugin draws brush stamps
- void mypaint_surface_get_color(x, y, radius) - color sampling for smudging
- void mypaint_surface_save_png(path, x, y, width, height)

### Reference: mypaint-fixed-tiled-surface.h
- MyPaintFixedTiledSurface *mypaint_fixed_tiled_surface_new(width, height)
- uint8_t *mypaint_fixed_tiled_surface_get_pixels() - RGBA8888, 64px tiles

### Config: mypaint-config.h
- #define MYPAINT_TILE_SIZE 64
- #define MYPAINT_MAX_THREADS 16

---

## Dependencies

**REQUIRED:**
- json-c (>= 0.11) - Brush settings parsing
- C Math functions (floorf, powf, expf, fabsf) - in Emscripten

**OPTIONAL (can disable):**
- GLib 2.0+ - Object system
- GObject-Introspection >= 1.32.0 - Language bindings
- GEGL 0.3/0.4 - Image composition
- gettext - i18n
- OpenMP - Parallelization
- gperftools - Profiling
- Doxygen/Sphinx - Documentation

**For WASM: Recommend disabling all optional dependencies**

---

## Rendering Architecture

Flow:
```
User Input (position, pressure, tilt)
  → MyPaintBrush (state machine)
  → mypaint_brush_stroke_to()
  → Generate brush dabs (stamps)
  → For each dab: surface->draw_dab(x, y, radius, color, hardness, ...)
  → Plugin renders to canvas
  → Optional: surface->get_color() for smudging
```

**Plugin Model:** Uses vtable-style callbacks. User implements MyPaintSurface
interface to render dabs to their canvas backend (pixels, OpenGL, WebGL, etc.)

---

## WASM Infrastructure Status

**Current:**
- packages/libmypaint/ - Full git submodule ✓
- packages/wasm/ - Empty directory
- Root package.json - Turbo monorepo (no WASM)

**Missing:**
- No package.json in libmypaint/ or wasm/
- No CMakeLists.txt or meson.build
- No Emscripten configuration
- No .wasm/.js files
- No JavaScript bindings

---

## Recommended Build Strategy

1. **Create packages/wasm/package.json** - Register as @zeroDraw/wasm
2. **Create build scripts** - autotools + Emscripten integration
3. **Vendor json-c** - Create WASM build or include library
4. **Configure libmypaint:**
   ```
   ./configure --host=emscripten \
     --disable-glib --disable-introspection --disable-i18n \
     --disable-gegl --disable-openmp --disable-docs \
     CFLAGS="-O3"
   ```
5. **Compile:** emconfigure && emmake make
6. **Create JS binding:** Wrap C API for TypeScript
7. **Generate .d.ts** - TypeScript definitions
8. **Integrate with Turbo** - Add to build pipeline
9. **Create demo** - Browser drawing app
10. **Optimize** - LTO, dead code elimination, compression

---

## Key Considerations

**Advantages:**
✓ Fast native rendering (brush algorithms CPU-intensive)
✓ Complex dynamics well-suited for compiled code
✓ Direct pixel access via callbacks
✓ Deterministic rendering
✓ ISC License (permissive)

**Challenges:**
✗ json-c dependency (must vendor)
✗ Build complexity (Autotools + Emscripten)
✗ Floating-point precision differences
✗ Memory constraints (4GB max)
✗ Module size (400-600 KB uncompressed, 150-200 KB gzip)

---

## Code Statistics

- **Total:** ~5,419 lines of C
- **Largest file:** brushmodes.c (23.7K - blend algorithms)
- **Architecture:** Tile-based (64px tiles), callback-based rendering
- **Math:** POSIX math library + fastapprox optimizations available
- **Thread-safe:** Per-brush NOT thread-safe; per-tile possible

---

## Examples & Tests

**Available:**
- examples/minimal.c - Good WASM binding template
- examples/libmypaint.c - Full API usage
- examples/write_ppm.c - Export capability
- tests/ - Unit tests can validate WASM build

---

## Summary

| Aspect | Status |
|--------|--------|
| Build System | GNU Autotools ✓ |
| Source Code | ~5,400 LOC ✓ |
| Public API | Clean C interface ✓ |
| Main Dependency | json-c (vendorable) ⚠ |
| Optional Deps | All disableable ✓ |
| WASM Status | Not prepared ✗ |
| Examples | Available ✓ |
| Tests | Present ✓ |
| License | ISC (permissive) ✓ |
| Module Size | 400-600 KB estimate |

---

**Status:** Ready for WASM implementation planning
