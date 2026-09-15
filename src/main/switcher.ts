import { join } from "node:path";
import { type BrowserWindow, WebContentsView } from "electron";
import { IPC, type Palette, type SwitcherView } from "../shared/bridge";

// The panel the strip button opens: one more view in the window, over the
// server in front, transparent everywhere the panel is not. A view rather
// than a window so it needs no display maths, keeps focus in this window,
// and paints in the theme like every other page the shell draws.

const shellPreload = join(__dirname, "../preload/shell.js");

// Also the voice popover (T = ChromeVoice): the same kind of panel, fed
// on its own channel.
export class Switcher<T = SwitcherView> {
  private view: WebContentsView | null = null;
  private loaded = false;
  private pending: T | null = null;
  open = false;

  constructor(
    private win: BrowserWindow,
    private stripHeight: number,
    // Loads the panel's page into a view, the way every shell page is.
    private load: (view: WebContentsView) => void,
    // Where the keyboard goes when the panel closes.
    private onClose: () => void,
    // Where the panel's page hears what to draw.
    private channel: string = IPC.switcherRows,
  ) {}

  // The strip button's left edge, so the panel lines up under it.
  show(view: T) {
    const panel = this.ensure();
    this.open = true;
    panel.setVisible(true);
    // Above the server view, whichever was added last.
    this.win.contentView.addChildView(panel);
    this.layout();
    this.draw(view);
    panel.webContents.focus();
  }

  // Closing because the window lost focus hands the keyboard to nobody:
  // whoever took it has it, and asking for it back would be a fight.
  hide(refocus = true) {
    if (!this.open) return;
    this.open = false;
    this.view?.setVisible(false);
    if (refocus) this.onClose();
  }

  // A newer list while the panel is up: repaint it in place.
  update(view: T) {
    if (this.open) this.draw(view);
  }

  // The palette follows the server in front, open or not, so the panel
  // is in the right colours the moment it next appears. Before the page
  // has loaded it asks for the palette itself.
  theme(palette: Palette) {
    if (this.loaded) this.view?.webContents.send(IPC.theme, palette);
  }

  // The panel is opened the moment its view is made, before the page is
  // there to hear anything; the first list waits for the load.
  private draw(view: T) {
    if (this.loaded) this.view?.webContents.send(this.channel, view);
    else this.pending = view;
  }

  layout() {
    if (!this.view || this.win.isDestroyed()) return;
    const [w, h] = this.win.getContentSize();
    this.view.setBounds({
      x: 0,
      y: this.stripHeight,
      width: w,
      height: h - this.stripHeight,
    });
  }

  // Runs once the window has closed, which is after it is destroyed: a
  // destroyed window has taken its views with it, and touching it throws.
  destroy() {
    const view = this.view;
    if (!view) return;
    this.view = null;
    this.loaded = false;
    this.pending = null;
    this.open = false;
    if (!this.win.isDestroyed()) this.win.contentView.removeChildView(view);
    if (!view.webContents.isDestroyed()) view.webContents.close();
  }

  private ensure(): WebContentsView {
    if (this.view) return this.view;
    const view = new WebContentsView({
      webPreferences: {
        preload: shellPreload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        transparent: true,
      },
    });
    view.setBackgroundColor("#00000000");
    view.setVisible(false);
    this.win.contentView.addChildView(view);
    this.load(view);
    view.webContents.once("did-finish-load", () => {
      this.loaded = true;
      if (this.pending) {
        view.webContents.send(this.channel, this.pending);
        this.pending = null;
      }
    });
    this.view = view;
    return view;
  }
}
