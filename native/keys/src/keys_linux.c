// Linux. X11 tells any client which keys are down. Without an X display
// (Wayland with no XWayland) there is no way to ask, and push to talk
// says so rather than guess.
#include <X11/Xlib.h>
#include <X11/keysym.h>
#include "napi.h"

// The evdev code for the key above Tab, as X numbers it (KEY_GRAVE + 8).
#define KEYCODE_GRAVE 49

static Display *display(void) {
  static Display *open = NULL;
  static bool tried = false;
  if (!tried) {
    tried = true;
    open = XOpenDisplay(NULL);
  }
  return open;
}

static bool held(const char keys[32], int code) {
  return code > 0 && (keys[code / 8] & (1 << (code % 8))) != 0;
}

bool key_down(Key key) {
  Display *dpy = display();
  if (!dpy) return false;
  char keys[32];
  XQueryKeymap(dpy, keys);
  switch (key) {
    case KEY_BACKQUOTE:
      return held(keys, KEYCODE_GRAVE);
    case KEY_CONTROL:
      return held(keys, XKeysymToKeycode(dpy, XK_Control_L)) ||
             held(keys, XKeysymToKeycode(dpy, XK_Control_R));
  }
  return false;
}

Access key_access(void) {
  return display() ? ACCESS_GRANTED : ACCESS_UNSUPPORTED;
}

bool request_key_access(void) {
  return display() != NULL;
}
