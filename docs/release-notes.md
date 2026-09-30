Stoop Desktop 0.2.0 signs the Windows installer. The app is otherwise
0.1.0, and still a beta: anything may change between minor versions.

**The Windows installer is signed** by getstoop LLC through Azure
Artifact Signing, so Windows names the publisher when it asks about
the file. SmartScreen may still say "Windows protected your PC" while
the certificate is new to it: More info → Run anyway, and the publisher
on that dialog is the check. The macOS installer is signed and
notarized as before, and the Linux packages are unsigned; the
[README](https://github.com/getstoop/desktop/blob/v0.2.0/README.md#which-builds-are-signed)
says what to expect on each system.

**Needs a server running Stoop 0.1.0 or newer.** An older one gets a
page that says so.

**Updates.** An app on 0.1.0 finds this release on its own, within
hours of it being published or at once from App settings → About →
Check now, downloads it in the background, and offers a restart in
the title strip, the tray and About. This is the first release an
installed app takes, so it is the one that proves the updater. On
Windows the 0.1.0 app checks the download against its sha512 and no
further; from this release on, the app also holds an update to the
publisher's signature.

**Known issues:** none known at release. What turns up goes in
[GitHub issues](https://github.com/getstoop/desktop/issues); security
problems go through
[private reporting](https://github.com/getstoop/desktop/security/advisories/new).

The list below is every change merged since 0.1.0.
