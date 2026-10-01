Stoop Desktop 0.2.1 fixes "Restart to update" on macOS. The app is
otherwise 0.2.0, and still a beta: anything may change between minor
versions.

**"Restart to update" restarts the app on macOS.** In 0.1.0 and 0.2.0
the button hid the window and left the app running on the old version.
From this release it quits into the update and the app comes back on
the new one. Windows and Linux were not affected.

**Taking this update on macOS.** The app being updated still has the
bug, so the button hides the window one more time. Press it, then quit
Stoop (Cmd+Q, or Quit Stoop in the menu bar icon's menu): the update
installs and the app reopens on 0.2.1.

**Needs a server running Stoop 0.1.0 or newer.** An older one gets a
page that says so.

**Known issues:** the fix was checked against Electron's updater and
not yet on an installed app, because an app can only show it on the
update after this one. What turns up goes in
[GitHub issues](https://github.com/getstoop/desktop/issues); security
problems go through
[private reporting](https://github.com/getstoop/desktop/security/advisories/new).

The list below is every change merged since 0.2.0.
