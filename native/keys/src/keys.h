// The addon's whole surface, one file per platform behind it.
#ifndef STOOP_KEYS_H
#define STOOP_KEYS_H

#include <node_api.h>
#include <stdbool.h>

typedef enum { KEY_BACKQUOTE, KEY_CONTROL } Key;

typedef enum { ACCESS_GRANTED, ACCESS_DENIED, ACCESS_UNKNOWN, ACCESS_UNSUPPORTED } Access;

bool key_down(Key key);
Access key_access(void);
// Shows the system's prompt where there is one; true once granted.
bool request_key_access(void);

#endif
