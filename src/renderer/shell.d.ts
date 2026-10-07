// window.shell, as preload/shell.ts exposes it to the app's own pages.
import type {
  ChromeState,
  ChromeVoice,
  Palette,
  PickerSource,
  Probe,
  SettingsView,
  SwitcherView,
  UpdateState,
  VoiceAction,
} from "../shared/bridge";
import type { ThemePreference } from "../shared/themes";

declare global {
  interface Window {
    shell: {
      probe(url: string): Promise<Probe>;
      addServer(url: string): Promise<Probe>;
      removeServer(id: string): void;
      retryServer(id: string): void;
      openSwitcher(): void;
      updateApp(): void;
      getSettings(): Promise<SettingsView>;
      setSettings(patch: {
        keepRunning?: boolean;
        launchAtLogin?: boolean;
        theme?: ThemePreference;
        dnd?: boolean;
        dndUntil?: number | null;
        notifications?: boolean;
        voiceCues?: boolean;
        pushToTalk?: boolean;
      }): Promise<SettingsView>;
      showPage(page: "add" | "settings" | "back"): void;
      testNotification(): void;
      // Resolves once the check has answered; a download it starts goes
      // on, reported through onUpdateState.
      checkForUpdates(): Promise<UpdateState>;
      installUpdate(): void;
      onUpdateState(handler: (state: UpdateState) => void): void;
      onPickerSources(
        handler: (payload: { sources: PickerSource[]; audio: boolean }) => void,
      ): void;
      pickerChoose(choice: { id: string; audio: boolean } | null): void;
      openExternal(url: string): void;
      // System Settings → Privacy & Security → Input Monitoring (macOS).
      openKeyAccess(): void;
      windowAction(action: "minimize" | "maximize" | "close"): void;
      getTheme(): Promise<Palette>;
      onSwitcherRows(handler: (view: SwitcherView) => void): void;
      chooseServer(id: string): void;
      closeSwitcher(): void;
      onTheme(handler: (palette: Palette) => void): void;
      onChromeState(handler: (state: ChromeState) => void): void;
      voiceAction(action: "open" | "stop-screen"): void;
      onVoicePanel(handler: (view: ChromeVoice) => void): void;
      voicePanelAction(action: VoiceAction): void;
      closeVoicePanel(): void;
    };
  }
}
