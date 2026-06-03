/* config.h - Emscripten/WASM build stub (replaces autoconf-generated config.h) */
#ifndef CONFIG_H
#define CONFIG_H

/* Disable GLib dependency - we use mypaint-glib-compat.h stubs instead */
#define MYPAINT_CONFIG_USE_GLIB 0

/* Signal that we provide json_object_object_get_ex */
#define HAVE_JSON_OBJECT_OBJECT_GET_EX 1

#define VERSION "2.0.0-beta"
#define PACKAGE "libmypaint"
#define PACKAGE_VERSION VERSION

#endif /* CONFIG_H */
