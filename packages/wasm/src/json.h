/* json.h - Minimal json-c compatible API for libmypaint WASM build
 *
 * Implements the exact subset used by mypaint-brush.c:
 *   json_tokener_parse, json_object_put, json_object_new_object,
 *   json_object_object_get_ex, json_object_object_get,
 *   json_object_is_type, json_object_get_double, json_object_get_int,
 *   json_object_array_length, json_object_array_get_idx,
 *   json_object_object_foreach (macro)
 */
#ifndef JSON_H
#define JSON_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

typedef enum json_type {
    json_type_null    = 0,
    json_type_boolean = 1,
    json_type_double  = 2,
    json_type_int     = 3,
    json_type_object  = 4,
    json_type_array   = 5,
    json_type_string  = 6
} json_type;

/* Key-value entry (object member) */
typedef struct _jkv {
    char              *key;
    struct json_object *val;
} _jkv;

/* The json_object struct is semi-public so the foreach macro can work
 * without extra function calls per iteration.                         */
typedef struct json_object {
    json_type  _type;
    int        _refcount;
    int        _n;    /* object: entry count;  array: item count  */
    int        _cap;  /* current allocated capacity               */
    union {
        _jkv              *_e;  /* json_type_object: entries        */
        struct json_object **_a;/* json_type_array:  items          */
        char               *_s; /* json_type_string: value          */
        int                 _b; /* json_type_boolean                */
        int64_t             _i; /* json_type_int                    */
        double              _d; /* json_type_double                 */
    } _u;
} json_object;

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

json_object *json_object_new_object(void);
json_object *json_object_new_array(void);
json_object *json_object_new_string(const char *s);
json_object *json_object_new_int(int val);
json_object *json_object_new_double(double val);
json_object *json_object_get(json_object *obj);   /* incref  */
void         json_object_put(json_object *obj);   /* decref / free */

/* ------------------------------------------------------------------ */
/* Type queries                                                        */
/* ------------------------------------------------------------------ */

json_type json_object_get_type   (const json_object *obj);
int       json_object_is_type    (const json_object *obj, json_type t);

/* ------------------------------------------------------------------ */
/* Value getters                                                       */
/* ------------------------------------------------------------------ */

int         json_object_get_int    (json_object *obj);
double      json_object_get_double (json_object *obj);
const char *json_object_get_string (json_object *obj);
int         json_object_get_boolean(json_object *obj);

/* ------------------------------------------------------------------ */
/* Object operations                                                   */
/* ------------------------------------------------------------------ */

void         json_object_object_add    (json_object *obj, const char *key, json_object *val);
int          json_object_object_get_ex (json_object *obj, const char *key, json_object **out);
json_object *json_object_object_get    (json_object *obj, const char *key);

/* ------------------------------------------------------------------ */
/* Array operations                                                    */
/* ------------------------------------------------------------------ */

int          json_object_array_length  (json_object *arr);
json_object *json_object_array_get_idx (json_object *arr, int idx);
int          json_object_array_add     (json_object *arr, json_object *val);

/* ------------------------------------------------------------------ */
/* Parser                                                              */
/* ------------------------------------------------------------------ */

json_object *json_tokener_parse(const char *str);

/* ------------------------------------------------------------------ */
/* Iteration macro                                                     */
/* Declares  char *<key>  and  json_object *<val>  in current scope.  */
/* ------------------------------------------------------------------ */
#define json_object_object_foreach(jobj__, key__, val__)                    \
    char *key__ = NULL; json_object *val__ = NULL;                          \
    for (int _jfi_##key__ = 0;                                              \
         (jobj__) && _jfi_##key__ < (jobj__)->_n &&                         \
         (key__ = (jobj__)->_u._e[_jfi_##key__].key,                        \
          val__ = (jobj__)->_u._e[_jfi_##key__].val, 1);                    \
         ++_jfi_##key__)

#ifdef __cplusplus
}
#endif

#endif /* JSON_H */
