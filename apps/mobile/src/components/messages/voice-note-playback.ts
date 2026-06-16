import type { AudioPlayer } from 'expo-audio/build/AudioModule.types';

let activePlayer: AudioPlayer | null = null;
let activeMessageId: string | null = null;

export function getActiveVoiceMessageId(): string | null {
  return activeMessageId;
}

export function stopActiveVoicePlayback(): void {
  const player = activePlayer;
  activePlayer = null;
  activeMessageId = null;
  if (!player) return;
  try {
    player.pause();
    player.remove();
  } catch {
    // ignore cleanup errors
  }
}

export function registerActiveVoicePlayback(messageId: string, player: AudioPlayer): void {
  if (activeMessageId && activeMessageId !== messageId) {
    stopActiveVoicePlayback();
  }
  activePlayer = player;
  activeMessageId = messageId;
}

export function clearActiveVoicePlayback(messageId: string): void {
  if (activeMessageId !== messageId) return;
  activePlayer = null;
  activeMessageId = null;
}
