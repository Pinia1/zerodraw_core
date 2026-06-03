/* json_impl.c - Minimal json-c implementation for libmypaint WASM build */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <stdint.h>
#include <ctype.h>
#include <math.h>

#include "json.h"

/* ================================================================== */
/* Internal alloc helpers                                              */
/* ================================================================== */

static json_object *jalloc(json_type t) {
    json_object *o = (json_object *)calloc(1, sizeof(json_object));
    if (!o) return NULL;
    o->_type     = t;
    o->_refcount = 1;
    return o;
}

static void jfree_inner(json_object *o) {
    if (!o) return;
    switch (o->_type) {
        case json_type_string:
            free(o->_u._s);
            break;
        case json_type_object:
            for (int i = 0; i < o->_n; i++) {
                free(o->_u._e[i].key);
                json_object_put(o->_u._e[i].val);
            }
            free(o->_u._e);
            break;
        case json_type_array:
            for (int i = 0; i < o->_n; i++)
                json_object_put(o->_u._a[i]);
            free(o->_u._a);
            break;
        default:
            break;
    }
}

/* ================================================================== */
/* Lifecycle                                                           */
/* ================================================================== */

json_object *json_object_get(json_object *o) {
    if (o) o->_refcount++;
    return o;
}

void json_object_put(json_object *o) {
    if (!o) return;
    if (--o->_refcount <= 0) {
        jfree_inner(o);
        free(o);
    }
}

json_object *json_object_new_object(void) { return jalloc(json_type_object); }
json_object *json_object_new_array (void) { return jalloc(json_type_array);  }

json_object *json_object_new_string(const char *s) {
    json_object *o = jalloc(json_type_string);
    if (!o) return NULL;
    o->_u._s = s ? strdup(s) : strdup("");
    return o;
}

json_object *json_object_new_int(int v) {
    json_object *o = jalloc(json_type_int);
    if (o) o->_u._i = v;
    return o;
}

json_object *json_object_new_double(double v) {
    json_object *o = jalloc(json_type_double);
    if (o) o->_u._d = v;
    return o;
}

/* ================================================================== */
/* Type queries                                                        */
/* ================================================================== */

json_type json_object_get_type(const json_object *o) {
    return o ? o->_type : json_type_null;
}

int json_object_is_type(const json_object *o, json_type t) {
    if (!o) return t == json_type_null;
    return o->_type == t;
}

/* ================================================================== */
/* Value getters                                                       */
/* ================================================================== */

int json_object_get_int(json_object *o) {
    if (!o) return 0;
    switch (o->_type) {
        case json_type_int:     return (int)o->_u._i;
        case json_type_double:  return (int)o->_u._d;
        case json_type_boolean: return o->_u._b;
        case json_type_string:  return o->_u._s ? atoi(o->_u._s) : 0;
        default: return 0;
    }
}

double json_object_get_double(json_object *o) {
    if (!o) return 0.0;
    switch (o->_type) {
        case json_type_double:  return o->_u._d;
        case json_type_int:     return (double)o->_u._i;
        case json_type_boolean: return (double)o->_u._b;
        case json_type_string:  return o->_u._s ? atof(o->_u._s) : 0.0;
        default: return 0.0;
    }
}

const char *json_object_get_string(json_object *o) {
    if (!o || o->_type != json_type_string) return NULL;
    return o->_u._s;
}

int json_object_get_boolean(json_object *o) {
    if (!o) return 0;
    return o->_u._b;
}

/* ================================================================== */
/* Object operations                                                   */
/* ================================================================== */

void json_object_object_add(json_object *o, const char *key, json_object *val) {
    if (!o || o->_type != json_type_object || !key) return;

    /* Update existing key */
    for (int i = 0; i < o->_n; i++) {
        if (strcmp(o->_u._e[i].key, key) == 0) {
            json_object_put(o->_u._e[i].val);
            o->_u._e[i].val = val;
            return;
        }
    }

    /* Grow capacity */
    if (o->_n >= o->_cap) {
        int nc = o->_cap ? o->_cap * 2 : 8;
        _jkv *ne = (_jkv *)realloc(o->_u._e, (size_t)nc * sizeof(_jkv));
        if (!ne) return;
        o->_u._e = ne;
        o->_cap  = nc;
    }
    o->_u._e[o->_n].key = strdup(key);
    o->_u._e[o->_n].val = val;
    o->_n++;
}

int json_object_object_get_ex(json_object *o, const char *key, json_object **out) {
    if (out) *out = NULL;
    if (!o || o->_type != json_type_object || !key) return 0;
    for (int i = 0; i < o->_n; i++) {
        if (strcmp(o->_u._e[i].key, key) == 0) {
            if (out) *out = o->_u._e[i].val;
            return 1;
        }
    }
    return 0;
}

json_object *json_object_object_get(json_object *o, const char *key) {
    json_object *v = NULL;
    json_object_object_get_ex(o, key, &v);
    return v;
}

/* ================================================================== */
/* Array operations                                                    */
/* ================================================================== */

int json_object_array_add(json_object *o, json_object *val) {
    if (!o || o->_type != json_type_array) return -1;
    if (o->_n >= o->_cap) {
        int nc = o->_cap ? o->_cap * 2 : 8;
        json_object **na = (json_object **)realloc(o->_u._a, (size_t)nc * sizeof(json_object *));
        if (!na) return -1;
        o->_u._a = na;
        o->_cap  = nc;
    }
    o->_u._a[o->_n++] = val;
    return 0;
}

int json_object_array_length(json_object *o) {
    if (!o || o->_type != json_type_array) return 0;
    return o->_n;
}

json_object *json_object_array_get_idx(json_object *o, int idx) {
    if (!o || o->_type != json_type_array || idx < 0 || idx >= o->_n) return NULL;
    return o->_u._a[idx];
}

/* ================================================================== */
/* Recursive-descent JSON parser                                       */
/* ================================================================== */

typedef struct { const char *src; int pos; int len; } Parser;

static void skip_ws(Parser *p) {
    while (p->pos < p->len && (unsigned char)p->src[p->pos] <= 0x20)
        p->pos++;
}

static json_object *parse_value(Parser *p);

/* Parse a JSON string; p->src[p->pos] must be '"' on entry */
static json_object *parse_string(Parser *p) {
    if (p->pos >= p->len || p->src[p->pos] != '"') return NULL;
    p->pos++; /* skip opening quote */

    int cap = 64;
    char *buf = (char *)malloc((size_t)cap);
    if (!buf) return NULL;
    int n = 0;

    while (p->pos < p->len && p->src[p->pos] != '"') {
        char c = p->src[p->pos++];
        if (c == '\\' && p->pos < p->len) {
            char esc = p->src[p->pos++];
            switch (esc) {
                case '"': case '\\': case '/': c = esc; break;
                case 'n': c = '\n'; break;
                case 'r': c = '\r'; break;
                case 't': c = '\t'; break;
                case 'b': c = '\b'; break;
                case 'f': c = '\f'; break;
                case 'u': {
                    /* decode \uXXXX; only ASCII range handled */
                    char hex[5] = {0};
                    for (int k = 0; k < 4 && p->pos < p->len; k++)
                        hex[k] = p->src[p->pos++];
                    unsigned cp = (unsigned)strtoul(hex, NULL, 16);
                    /* encode as UTF-8 (basic BMP) */
                    if (cp < 0x80) {
                        c = (char)cp;
                    } else {
                        /* grow buf for multi-byte sequence if needed */
                        while (n + 4 >= cap) { cap *= 2; buf = (char *)realloc(buf, (size_t)cap); }
                        if (cp < 0x800) {
                            buf[n++] = (char)(0xC0 | (cp >> 6));
                            buf[n++] = (char)(0x80 | (cp & 0x3F));
                        } else {
                            buf[n++] = (char)(0xE0 | (cp >> 12));
                            buf[n++] = (char)(0x80 | ((cp >> 6) & 0x3F));
                            buf[n++] = (char)(0x80 | (cp & 0x3F));
                        }
                        continue;
                    }
                    break;
                }
                default: c = esc; break;
            }
        }
        if (n + 2 >= cap) { cap *= 2; buf = (char *)realloc(buf, (size_t)cap); }
        buf[n++] = c;
    }
    if (p->pos < p->len) p->pos++; /* skip closing quote */
    buf[n] = '\0';

    json_object *o = json_object_new_string(buf);
    free(buf);
    return o;
}

/* Parse a number; p->src[p->pos] is '-' or digit on entry */
static json_object *parse_number(Parser *p) {
    int start = p->pos;
    int is_float = 0;

    if (p->pos < p->len && p->src[p->pos] == '-') p->pos++;
    while (p->pos < p->len && isdigit((unsigned char)p->src[p->pos])) p->pos++;
    if (p->pos < p->len && p->src[p->pos] == '.') {
        is_float = 1; p->pos++;
        while (p->pos < p->len && isdigit((unsigned char)p->src[p->pos])) p->pos++;
    }
    if (p->pos < p->len && (p->src[p->pos] == 'e' || p->src[p->pos] == 'E')) {
        is_float = 1; p->pos++;
        if (p->pos < p->len && (p->src[p->pos] == '+' || p->src[p->pos] == '-')) p->pos++;
        while (p->pos < p->len && isdigit((unsigned char)p->src[p->pos])) p->pos++;
    }

    int slen = p->pos - start;
    if (slen <= 0 || slen > 63) return NULL;

    char num[64];
    memcpy(num, p->src + start, (size_t)slen);
    num[slen] = '\0';

    return is_float ? json_object_new_double(atof(num))
                    : json_object_new_int((int)atol(num));
}

/* Parse a JSON object; p->src[p->pos] must be '{' on entry */
static json_object *parse_object(Parser *p) {
    if (p->pos >= p->len || p->src[p->pos] != '{') return NULL;
    p->pos++;
    json_object *o = json_object_new_object();
    if (!o) return NULL;

    skip_ws(p);
    if (p->pos < p->len && p->src[p->pos] == '}') { p->pos++; return o; }

    while (p->pos < p->len) {
        skip_ws(p);
        if (p->pos >= p->len || p->src[p->pos] != '"') break;

        json_object *kobj = parse_string(p);
        if (!kobj) break;
        char *kdup = strdup(json_object_get_string(kobj));
        json_object_put(kobj);

        skip_ws(p);
        if (p->pos >= p->len || p->src[p->pos] != ':') { free(kdup); break; }
        p->pos++;

        json_object *val = parse_value(p);
        json_object_object_add(o, kdup, val);
        free(kdup);

        skip_ws(p);
        if (p->pos >= p->len) break;
        if (p->src[p->pos] == ',') { p->pos++; continue; }
        if (p->src[p->pos] == '}') { p->pos++; break; }
        break;
    }
    return o;
}

/* Parse a JSON array; p->src[p->pos] must be '[' on entry */
static json_object *parse_array(Parser *p) {
    if (p->pos >= p->len || p->src[p->pos] != '[') return NULL;
    p->pos++;
    json_object *arr = json_object_new_array();
    if (!arr) return NULL;

    skip_ws(p);
    if (p->pos < p->len && p->src[p->pos] == ']') { p->pos++; return arr; }

    while (p->pos < p->len) {
        json_object *item = parse_value(p);
        json_object_array_add(arr, item);

        skip_ws(p);
        if (p->pos >= p->len) break;
        if (p->src[p->pos] == ',') { p->pos++; continue; }
        if (p->src[p->pos] == ']') { p->pos++; break; }
        break;
    }
    return arr;
}

static json_object *parse_value(Parser *p) {
    skip_ws(p);
    if (p->pos >= p->len) return NULL;

    char c = p->src[p->pos];
    if (c == '"')  return parse_string(p);
    if (c == '{')  return parse_object(p);
    if (c == '[')  return parse_array(p);
    if (c == '-' || isdigit((unsigned char)c)) return parse_number(p);

    if (p->len - p->pos >= 4 && memcmp(p->src + p->pos, "true", 4) == 0) {
        p->pos += 4;
        json_object *o = jalloc(json_type_boolean);
        if (o) o->_u._b = 1;
        return o;
    }
    if (p->len - p->pos >= 5 && memcmp(p->src + p->pos, "false", 5) == 0) {
        p->pos += 5;
        json_object *o = jalloc(json_type_boolean);
        if (o) o->_u._b = 0;
        return o;
    }
    if (p->len - p->pos >= 4 && memcmp(p->src + p->pos, "null", 4) == 0) {
        p->pos += 4;
        return jalloc(json_type_null);
    }

    return NULL; /* parse error */
}

json_object *json_tokener_parse(const char *str) {
    if (!str) return NULL;
    Parser p;
    p.src = str;
    p.pos = 0;
    p.len = (int)strlen(str);
    return parse_value(&p);
}
