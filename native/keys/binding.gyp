{
  "targets": [
    {
      "target_name": "keys",
      "conditions": [
        ["OS=='mac'", {
          "sources": ["src/keys_mac.c"],
          "link_settings": {
            "libraries": ["-framework ApplicationServices", "-framework IOKit"]
          },
          "xcode_settings": {
            "MACOSX_DEPLOYMENT_TARGET": "12.0",
            "OTHER_CFLAGS": ["-arch x86_64", "-arch arm64"],
            "OTHER_LDFLAGS": ["-arch x86_64", "-arch arm64"]
          }
        }],
        ["OS=='win'", {
          "sources": ["src/keys_win.c"],
          "libraries": ["user32.lib"]
        }],
        ["OS=='linux'", {
          "sources": ["src/keys_linux.c"],
          "libraries": ["-lX11"]
        }]
      ]
    }
  ]
}
