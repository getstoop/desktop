Stoop Desktop 0.4.0 holds the call's volume keys from any app, and
speaks bridge 6.

**Volume keys.** Stoop 0.17.0 gave a call a volume slider, 0 to 200%,
for when a game drowns the voices out. In 0.4.0, Ctrl+Shift+↑ and
Ctrl+Shift+↓ step that volume from any app while a server here is in a
call, the way Ctrl+` talks. The switch is App settings → Voice → Volume
keys, on by default; it is also a checkbox in the Voice menu, beside
Join and leave sounds, and the menu lists the two keys as items, greyed
out of voice. While the switch is on and a call is up the two keys are
the app's everywhere, so an editor's own Ctrl+Shift+↑ does not reach it
until the call ends; off, they are yours again and work only while
Stoop is in front. Against a server older than 0.17.0 the keys have
nothing to act on and do nothing.

**Bridge 6.** The two voice actions the keys send, `volume-up` and
`volume-down`, are what the level adds. A server page too old for them
ignores them.

**Needs a server running Stoop 0.1.0 or newer**, unchanged.

**Updates.** An app on 0.2.x or 0.3.x finds this release on its own,
within hours of it being published or at once from App settings →
About → Check now, and offers a restart in the title strip, the tray
and About.

**Known issues.** As in 0.3.1: if another app already holds Ctrl+` as a
global shortcut, push to talk does nothing and App settings does not
say why; the same holds for the volume keys, and neither key can be
changed yet. What turns up goes in
[GitHub issues](https://github.com/getstoop/desktop/issues); security
problems go through
[private reporting](https://github.com/getstoop/desktop/security/advisories/new).

The list below is every change merged since 0.3.1.

Changes since 0.3.1:

- Volume keys from any app, and bridge 6 (0558fff)
