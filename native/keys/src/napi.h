// The N-API glue every platform shares: isKeyDown(name), keyAccess(),
// requestKeyAccess(). Included once, by the platform's source file.
#include <string.h>
#include "keys.h"

static napi_value is_key_down(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  char name[16] = "";
  size_t len = 0;
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  if (argc > 0)
    napi_get_value_string_utf8(env, argv[0], name, sizeof name, &len);
  bool down = false;
  if (strcmp(name, "backquote") == 0) down = key_down(KEY_BACKQUOTE);
  else if (strcmp(name, "control") == 0) down = key_down(KEY_CONTROL);
  napi_value result;
  napi_get_boolean(env, down, &result);
  return result;
}

static const char *ACCESS_NAMES[] = {"granted", "denied", "unknown", "unsupported"};

static napi_value access_value(napi_env env) {
  napi_value result;
  napi_create_string_utf8(env, ACCESS_NAMES[key_access()], NAPI_AUTO_LENGTH, &result);
  return result;
}

static napi_value get_key_access(napi_env env, napi_callback_info info) {
  (void)info;
  return access_value(env);
}

static napi_value ask_key_access(napi_env env, napi_callback_info info) {
  (void)info;
  napi_value result;
  napi_get_boolean(env, request_key_access(), &result);
  return result;
}

static void export_fn(napi_env env, napi_value exports, const char *name, napi_callback cb) {
  napi_value fn;
  napi_create_function(env, name, NAPI_AUTO_LENGTH, cb, NULL, &fn);
  napi_set_named_property(env, exports, name, fn);
}

static napi_value init(napi_env env, napi_value exports) {
  export_fn(env, exports, "isKeyDown", is_key_down);
  export_fn(env, exports, "keyAccess", get_key_access);
  export_fn(env, exports, "requestKeyAccess", ask_key_access);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
