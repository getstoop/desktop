Stoop Desktop 0.5.0 keeps one zoom for the whole app, and moves to
Electron 45.

**One zoom.** Zoom used to be per server: the View menu zoomed
whichever page was in front, so each server held its own size and
switching servers changed it. In 0.5.0 there is one zoom, and it is the
app's. View → Zoom In, Zoom Out and Actual Size keep their usual keys,
Ctrl or Cmd with +, - and 0, and Ctrl or Cmd with = now zooms in too,
without Shift. Each step is about 10%, from about 58% to 173%, and the
menu says where the zoom stands, as in "Zoom: 110%". It applies to
every server and to the app's own pages (App settings, add a server,
the page for a server that needs updating), and it is kept across
restarts. The title strip stays at its own size.

**Your old zooms are not carried over.** The first launch of 0.5.0
shows every server at 100%, whatever each was zoomed to before. Set the
zoom once and it holds everywhere.

**App settings stays put.** While a server could not be reached, its
"Could not reach" page could take the place of App settings or the add
page, sometimes the moment the gear was clicked, and a server coming
back could pull the window out of App settings. Both now leave those
pages alone: the page for a server that cannot be shown goes up only
when that server is the one in front.

**Electron 45.** The app moves from Electron 44 to 45, with the other
dependency updates in the list below.

**Needs a server running Stoop 0.1.0 or newer**, unchanged. The bridge
stays at 6.

**Updates.** An app on 0.2.x or newer finds this release on its own,
within hours of it being published or at once from App settings →
About → Check now, and offers a restart in the title strip, the tray
and About.

**Known issues.** If the old View menu ever zoomed the server switcher
or the live-call panel, that panel keeps the size it was left at. As in
0.4.0: if another app already holds Ctrl+` or the volume keys as a
global shortcut, they do nothing here and App settings does not say
why, and neither can be changed yet. What turns up goes in
[GitHub issues](https://github.com/getstoop/desktop/issues); security
problems go through
[private reporting](https://github.com/getstoop/desktop/security/advisories/new).

The list below is every change merged since 0.4.0.

Changes since 0.4.0:

- Bump the app group with 4 updates (e1d3cc8)
- Bump the actions group across 1 directory with 4 updates (3ef6407)
- One zoom for the whole app (ad424d6)
- The View menu says what the zoom is (18e776f)
- The window hands off its menu, its calls and its server views (d84690c)
- Bump electron-vite from 5.0.0 to 6.0.0 (4ae5dcb)
- Bump electron from 44.4.5 to 45.2.3 (740bff7)
- Fetch the Electron binary before make dev (836c434)
- A server's gate page leaves App settings alone (085e018)
