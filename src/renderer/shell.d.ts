// window.shell, as preload/shell.ts exposes it to the app's own pages.
import type { ChromeState, Probe } from "../shared/bridge";

declare global {
  interface Window {
    shell: {
      probe(url: string): Promise<Probe>;
      addServer(url: string): Promise<Probe>;
      removeServer(id: string): void;
      retryServer(id: string): void;
      openMenu(): void;
      openExternal(url: string): void;
      windowAction(action: "minimize" | "maximize" | "close"): void;
      onChromeState(handler: (state: ChromeState) => void): void;
    };
  }
}
