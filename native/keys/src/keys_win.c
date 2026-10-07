// Windows. Any app may ask whether a key is down; there is no permission.
#include <windows.h>
#include "napi.h"

// Scan code 0x29 is the key above Tab on every layout; the virtual key it
// maps to is the layout's.
static int backquote_vk(void) {
  return (int)MapVirtualKeyW(0x29, MAPVK_VSC_TO_VK);
}

bool key_down(Key key) {
  switch (key) {
    case KEY_BACKQUOTE:
      return (GetAsyncKeyState(backquote_vk()) & 0x8000) != 0;
    case KEY_CONTROL:
      return (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
  }
  return false;
}

Access key_access(void) {
  return ACCESS_GRANTED;
}

bool request_key_access(void) {
  return true;
}
