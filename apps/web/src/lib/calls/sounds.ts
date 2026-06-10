/** PIMS call & notification sound manager with browser autoplay unlock. */

const SOUND_ENABLED_KEY = 'pims_sound_enabled';
const SOUND_UNLOCKED_KEY = 'pims_sound_unlocked';

/** Static assets in apps/web/public/sounds/ */
export const SOUND_ASSETS = {
  ringtone: '/sounds/ringtone.mp3',
  callEnd: '/sounds/call-end.mp3',
  notification: '/sounds/notification.wav',
} as const;

let audioContext: AudioContext | null = null;
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let outgoingRingInterval: ReturnType<typeof setInterval> | null = null;
let ringtoneAudio: HTMLAudioElement | null = null;
let outgoingRingAudio: HTMLAudioElement | null = null;
const preloaded = new Map<string, HTMLAudioElement>();

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled) stopAllCallSounds();
}

export function isSoundUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SOUND_UNLOCKED_KEY) === 'true';
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioContext) {
      audioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    }
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

/** Preload sound files after user unlocks audio (faster first ring/notification). */
export function preloadSounds(): void {
  if (typeof window === 'undefined') return;
  Object.values(SOUND_ASSETS).forEach((path) => {
    if (preloaded.has(path)) return;
    const audio = new Audio(path);
    audio.preload = 'auto';
    preloaded.set(path, audio);
  });
}

/** Call after first user gesture to satisfy autoplay policies. */
export async function unlockSounds(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    await ctx.resume();
    localStorage.setItem(SOUND_UNLOCKED_KEY, 'true');
    preloadSounds();
    return true;
  } catch {
    return false;
  }
}

function playTone(freq: number, durationMs: number, volume = 0.15): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // ignore autoplay blocks
  }
}

function clonePreloaded(path: string): HTMLAudioElement {
  const cached = preloaded.get(path);
  if (cached) {
    const clone = cached.cloneNode() as HTMLAudioElement;
    clone.preload = 'auto';
    return clone;
  }
  return new Audio(path);
}

async function playSoundFile(
  path: string,
  options: { loop?: boolean; volume?: number } = {}
): Promise<HTMLAudioElement | null> {
  if (!isSoundEnabled() || typeof window === 'undefined') return null;
  try {
    const audio = clonePreloaded(path);
    audio.loop = options.loop ?? false;
    if (options.volume != null) {
      audio.volume = Math.min(1, Math.max(0, options.volume));
    }
    await audio.play();
    return audio;
  } catch {
    return null;
  }
}

function stopAudioElement(audio: HTMLAudioElement | null): void {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
  } catch {
    /* ignore */
  }
}

/** Short notification ping — skips call_* types (ringtone handles incoming calls). */
export function playNotificationSound(notificationType?: string): void {
  if (!isSoundEnabled()) return;
  if (notificationType?.startsWith('call_')) return;

  void playSoundFile(SOUND_ASSETS.notification, { volume: 0.85 }).then((played) => {
    if (!played) {
      playTone(880, 120, 0.12);
      setTimeout(() => playTone(1100, 100, 0.1), 140);
    }
  });
}

/** Loop incoming-call ringtone until stopped. */
export function startRingtone(): void {
  if (!isSoundEnabled()) return;
  stopRingtone();

  void playSoundFile(SOUND_ASSETS.ringtone, { loop: true, volume: 1 }).then((audio) => {
    if (audio) {
      ringtoneAudio = audio;
      return;
    }
    const playRingBurst = () => {
      playTone(440, 400, 0.18);
      setTimeout(() => playTone(480, 400, 0.16), 450);
    };
    playRingBurst();
    ringtoneInterval = setInterval(playRingBurst, 2000);
  });
}

/** Outgoing caller ringing — same asset, slightly quieter, looped. */
export function startOutgoingRing(): void {
  if (!isSoundEnabled()) return;
  stopOutgoingRing();

  void playSoundFile(SOUND_ASSETS.ringtone, { loop: true, volume: 0.65 }).then((audio) => {
    if (audio) {
      outgoingRingAudio = audio;
      return;
    }
    const playBurst = () => {
      playTone(520, 350, 0.14);
      setTimeout(() => playTone(620, 350, 0.12), 400);
    };
    playBurst();
    outgoingRingInterval = setInterval(playBurst, 2500);
  });
}

export function stopOutgoingRing(): void {
  stopAudioElement(outgoingRingAudio);
  outgoingRingAudio = null;
  if (outgoingRingInterval) {
    clearInterval(outgoingRingInterval);
    outgoingRingInterval = null;
  }
}

export function stopRingtone(): void {
  stopAudioElement(ringtoneAudio);
  ringtoneAudio = null;
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

export function playCallEndSound(): void {
  if (!isSoundEnabled()) return;
  void playSoundFile(SOUND_ASSETS.callEnd, { volume: 0.9 }).then((played) => {
    if (!played) playTone(330, 200, 0.12);
  });
}

export function stopAllCallSounds(): void {
  stopRingtone();
  stopOutgoingRing();
}
