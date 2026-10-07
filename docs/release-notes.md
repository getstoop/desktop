Stoop Desktop 0.3.1 signs the push to talk addon on Windows. Nothing
else changes from 0.3.0.

**Windows.** 0.3.0 shipped the small addon push to talk reads the keys
with (`keys.node`) unsigned. It loaded anyway on most machines, but
Windows 11 with Smart App Control on can refuse an unsigned file, and
push to talk then shows as not available in App settings → Voice. In
0.3.1 the addon is signed by getstoop LLC like the rest of the app.
macOS and Linux are unchanged.

**Needs a server running Stoop 0.1.0 or newer**, unchanged.

**Updates.** An app on 0.2.x or 0.3.0 finds this release on its own,
within hours of it being published or at once from App settings →
About → Check now, and offers a restart in the title strip, the tray
and About.

**Known issues.** As in 0.3.0: if another app already holds Ctrl+` as a
global shortcut, push to talk does nothing and App settings does not
say why; the key cannot be changed yet. What turns up goes in
[GitHub issues](https://github.com/getstoop/desktop/issues); security
problems go through
[private reporting](https://github.com/getstoop/desktop/security/advisories/new).

The list below is every change merged since 0.3.0.

Changes since 0.3.0:

- Push to talk: ship the addon where Windows signing finds it (da9f4e7)
