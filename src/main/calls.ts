import type { MenuItemConstructorOptions } from "electron";
import type { ChromeVoice, VoiceAction, VoiceReport } from "../shared/bridge";
import { IPC } from "../shared/bridge";
import { PushToTalk } from "./pushToTalk";
import type { Settings } from "./settings";
import type { Slot } from "./slot";
import { parseVoiceReport, trayVoiceItems, voiceLabel } from "./voice";
import { VolumeKeys } from "./volumeKeys";

// The live indicator's bookkeeping: which server's page holds voice, the
// words for it, and the actions that reach it from the strip, the tray,
// the menu and the keys held from any app.

// What the calls read from the window, and what they ask of it.
export interface CallsHost {
  slots(): Iterable<Slot>;
  // The server in front, or null for one of the app's own pages.
  front(): string | null;
  settings(): Settings;
  // A call started, ended or changed: everything that shows it follows.
  changed(): void;
  // A line for the strip about something that happened out of sight.
  notice(text: string): void;
  // Brings the window forward with this server in front.
  show(id: string): void;
}

export class Calls {
  // Ctrl+` held from any app, acting on the call wherever it is.
  private pushToTalk = new PushToTalk(
    () => this.report(),
    (action) => this.act(action),
  );
  // Ctrl+Shift+Up and Down from any app, stepping the call's volume.
  private volumeKeys = new VolumeKeys((action) => this.act(action));

  constructor(private host: CallsHost) {}

  // What a server's page says it captures now.
  set(slot: Slot, raw: unknown) {
    const was = slot.voice;
    slot.voice = parseVoiceReport(raw);
    if (!was && slot.voice) {
      slot.joinedAt = Date.now();
      this.leaveOthers(slot);
    }
    this.changed();
  }

  // A page that reloads, navigates away or crashes has dropped its call
  // without saying so.
  drop(slot: Slot) {
    if (!slot.voice) return;
    slot.voice = null;
    this.changed();
  }

  // The keys follow the call and their settings, then the window repaints.
  changed() {
    this.syncKeys();
    this.host.changed();
  }

  // The keys from any app are held only while there is a call to act on.
  syncKeys() {
    const { pushToTalk, volumeKeys } = this.host.settings();
    const inCall = !!this.slot();
    this.pushToTalk.sync(pushToTalk && inCall);
    this.volumeKeys.sync(volumeKeys && inCall);
  }

  // One call at a time across servers. Every join starts muted, so the new
  // call is silent while the old one goes. A page too old for "leave" still
  // takes the rest, and is quiet even if it stays connected.
  private leaveOthers(joined: Slot) {
    const left: string[] = [];
    for (const other of this.host.slots()) {
      if (other === joined || !other.voice) continue;
      const wc = other.view.webContents;
      if (wc.isDestroyed()) continue;
      for (const action of ["mute", "camera-off", "stop-screen", "leave"])
        wc.send(IPC.voiceAction, action);
      left.push(other.server.name);
    }
    if (left.length) this.host.notice(`Left voice on ${left.join(", ")}`);
  }

  // The server whose page holds voice: the latest to join, because a page
  // too old to leave when asked can still be holding a silenced call.
  private slot(): Slot | undefined {
    let latest: Slot | undefined;
    for (const slot of this.host.slots())
      if (slot.voice && (!latest || slot.joinedAt > latest.joinedAt))
        latest = slot;
    return latest;
  }

  // The call's last report; null outside voice.
  report(): VoiceReport | null {
    return this.slot()?.voice ?? null;
  }

  // In front, the space names the call; behind, the server does, because
  // that is what someone switching back would look for.
  private where(slot: Slot): string {
    const voice = slot.voice;
    if (!voice) return "";
    const place =
      slot.server.id === this.host.front() ? voice.space : slot.server.name;
    return `${voice.channel} · ${place}`;
  }

  // The call as the strip and its popover show it.
  chrome(): ChromeVoice | null {
    const slot = this.slot();
    if (!slot?.voice) return null;
    const { kind, mic, camera, screen, channel } = slot.voice;
    return { kind, mic, camera, screen, channel, where: this.where(slot) };
  }

  // Acts on the call where it is. Only "show" switches servers.
  act(action: VoiceAction) {
    const slot = this.slot();
    if (!slot) return;
    if (action === "show") this.host.show(slot.server.id);
    slot.view.webContents.send(IPC.voiceAction, action);
  }

  trayItems(): MenuItemConstructorOptions[] {
    const slot = this.slot();
    if (!slot?.voice) return [];
    return trayVoiceItems(slot.voice, this.where(slot), (action) =>
      this.act(action),
    );
  }

  tooltip(): string {
    const voice = this.report();
    return voice ? voiceLabel(voice.kind) : "";
  }
}
