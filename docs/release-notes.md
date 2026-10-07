Stoop Desktop 0.3.0 adds push to talk that works from any app. It is
still a beta: anything may change between minor versions.

**Push to talk.** Turn it on under App settings → Voice, a new section
that also holds Voice room sounds (moved from Notifications). Then,
while you are muted in a call on any server, hold **Ctrl+`** (the key
above Tab, with Ctrl on every platform) from any app to talk; letting
go mutes you again 50 ms later. While you are unmuted the key does
nothing. It is off until you turn it on.

- **macOS** asks for Input Monitoring when you turn it on: Stoop needs
  it to see the key while another app is in front, and uses it for
  nothing else. Grant it in System Settings, then quit and reopen
  Stoop. If macOS has been asked before, turning push to talk on opens
  the right pane of System Settings instead, and App settings → Voice
  says when Stoop is not listening yet.
- **Windows** needs no permission.
- **Linux** needs an X11 session. Under Wayland, App settings → Voice
  says push to talk is not available.

It mutes and unmutes through the same voice actions as the Voice menu,
so it works with the server you already run. A server on Stoop 0.6.0
or newer leaves the key to the app; an older one never listened for it.

**Needs a server running Stoop 0.1.0 or newer**, unchanged.

**Updates.** An app on 0.2.x finds this release on its own, within
hours of it being published or at once from App settings → About →
Check now, and offers a restart in the title strip, the tray and About.

**Known issues.**

- If another app already holds Ctrl+` as a global shortcut, push to
  talk does nothing and App settings does not say why.
- The key cannot be changed yet.

What turns up goes in
[GitHub issues](https://github.com/getstoop/desktop/issues); security
problems go through
[private reporting](https://github.com/getstoop/desktop/security/advisories/new).

The list below is every change merged since 0.2.2.

Changes since 0.2.2:

- Release: the draft is made once every installer has built (a94b37e)
- Push to talk: hold Ctrl+` from any app (STOOP-126) (b12c9bf)
- Push to talk: a press inside the release tail unmutes a call gone quiet (ed46d71)
- Push to talk: a press on an open call is remembered until release (3c4ada1)
