// macOS. A key's state comes from the HID system; for anything but a
// modifier, macOS answers "up" to an app without Input Monitoring.
#include <ApplicationServices/ApplicationServices.h>
#include <IOKit/hidsystem/IOHIDLib.h>
#include "napi.h"

// kVK_ANSI_Grave, kVK_Control, kVK_RightControl (HIToolbox/Events.h).
#define VK_GRAVE 0x32
#define VK_CONTROL_LEFT 0x3B
#define VK_CONTROL_RIGHT 0x3E

static bool held(CGKeyCode code) {
  return CGEventSourceKeyState(kCGEventSourceStateHIDSystemState, code);
}

bool key_down(Key key) {
  switch (key) {
    case KEY_BACKQUOTE:
      return held(VK_GRAVE);
    case KEY_CONTROL:
      return held(VK_CONTROL_LEFT) || held(VK_CONTROL_RIGHT);
  }
  return false;
}

Access key_access(void) {
  switch (IOHIDCheckAccess(kIOHIDRequestTypeListenEvent)) {
    case kIOHIDAccessTypeGranted:
      return ACCESS_GRANTED;
    case kIOHIDAccessTypeDenied:
      return ACCESS_DENIED;
    default:
      return ACCESS_UNKNOWN;
  }
}

bool request_key_access(void) {
  return IOHIDRequestAccess(kIOHIDRequestTypeListenEvent);
}
