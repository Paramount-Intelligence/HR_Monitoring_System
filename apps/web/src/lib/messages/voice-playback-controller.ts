/** Ensures only one voice message plays at a time in the web chat. */

let activePause: (() => void) | null = null;

export function stopActiveVoicePlayback(): void {
  activePause?.();
  activePause = null;
}

export function setActiveVoicePlayback(pause: () => void): void {
  if (activePause && activePause !== pause) {
    activePause();
  }
  activePause = pause;
}

export function clearActiveVoicePlayback(pause: () => void): void {
  if (activePause === pause) {
    activePause = null;
  }
}
