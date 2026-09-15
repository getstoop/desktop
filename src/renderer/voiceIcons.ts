// The web app's VoiceIcons strokes, for the strip pill and the voice
// popover.

export const svg = (paths: string, size = 13, off = false) =>
  `<svg class="${off ? "off" : ""}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const MIC =
  '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>';
export const SLASH = '<path d="M4 4l16 16"/>';
export const CAMERA =
  '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10l5-3v10l-5-3"/>';
export const SCREEN =
  '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>';
export const ALERT =
  '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>';
export const ARROW = '<path d="M5 12h14M13 6l6 6-6 6"/>';
