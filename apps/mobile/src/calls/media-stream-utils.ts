import type { CallType } from '../types/calls';

export type MediaStreamLike = {
  getTracks: () => Array<{ stop: () => void; enabled: boolean; kind: string }>;
  getAudioTracks: () => Array<{ enabled: boolean; kind: string; readyState?: string }>;
  getVideoTracks: () => Array<{ enabled: boolean; kind: string; readyState?: string }>;
  toURL?: () => string;
};

type WebRtcModule = {
  mediaDevices: {
    getUserMedia: (constraints: {
      audio: boolean;
      video: boolean | { facingMode: string };
    }) => Promise<MediaStreamLike>;
  };
};

let webrtcModule: WebRtcModule | null = null;
let webrtcUnavailable = false;

export function isWebRtcNativeAvailable(): boolean {
  if (webrtcUnavailable) return false;
  if (webrtcModule) return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-webrtc');
    if (!mod?.mediaDevices?.getUserMedia) {
      webrtcUnavailable = true;
      return false;
    }
    webrtcModule = mod;
    return true;
  } catch {
    webrtcUnavailable = true;
    return false;
  }
}

export function getWebRtcUnavailableMessage(): string {
  return 'Calling is not available in this build. Install the latest development or preview build.';
}

function getWebRtcModule(): WebRtcModule {
  if (!isWebRtcNativeAvailable()) {
    throw new Error(getWebRtcUnavailableMessage());
  }
  return webrtcModule!;
}

function trackFlags(stream: MediaStreamLike) {
  const hasLocalAudio = stream
    .getAudioTracks()
    .some((t) => t.readyState !== 'ended');
  const hasLocalVideo = stream
    .getVideoTracks()
    .some((t) => t.readyState !== 'ended');
  return { hasLocalAudio, hasLocalVideo };
}

export interface MediaCaptureResult {
  stream: MediaStreamLike;
  hasAudio: boolean;
  hasVideo: boolean;
  warning?: string;
}

async function tryGetUserMedia(
  audio: boolean,
  video: boolean | { facingMode: string }
): Promise<MediaStreamLike | null> {
  try {
    return await getWebRtcModule().mediaDevices.getUserMedia({ audio, video });
  } catch {
    return null;
  }
}

/** Capture local media with graceful degradation (mirrors web getCallMedia). */
export async function captureLocalMedia(
  callType: CallType,
  options?: { allowAudioOnlyFallback?: boolean }
): Promise<MediaCaptureResult> {
  const allowAudioOnlyFallback = options?.allowAudioOnlyFallback ?? true;

  if (callType === 'voice') {
    const stream = await getWebRtcModule().mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    const flags = trackFlags(stream);
    if (!flags.hasLocalAudio) {
      throw new Error('No microphone found. Connect a microphone to place calls.');
    }
    return { stream, hasAudio: true, hasVideo: false };
  }

  // Video call — try full A/V first
  try {
    const stream = await getWebRtcModule().mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: 'user' },
    });
    const flags = trackFlags(stream);
    return {
      stream,
      hasAudio: flags.hasLocalAudio,
      hasVideo: flags.hasLocalVideo,
      warning: !flags.hasLocalVideo
        ? 'Camera not found. Continuing with audio only.'
        : !flags.hasLocalAudio
          ? 'Microphone not found. Continuing without audio.'
          : undefined,
    };
  } catch {
    /* fall through to degradation ladder */
  }

  if (allowAudioOnlyFallback) {
    const audioOnly = await tryGetUserMedia(true, false);
    if (audioOnly) {
      return {
        stream: audioOnly,
        hasAudio: true,
        hasVideo: false,
        warning: 'Camera unavailable. You can continue with audio.',
      };
    }
  }

  const videoOnly = await tryGetUserMedia(false, { facingMode: 'user' });
  if (videoOnly) {
    return {
      stream: videoOnly,
      hasAudio: false,
      hasVideo: true,
      warning: 'Microphone not found. Continuing without audio.',
    };
  }

  throw new Error('No camera or microphone access available.');
}

export function getStreamUrl(stream: MediaStreamLike | null): string | null {
  if (!stream?.toURL) return null;
  return stream.toURL();
}

export function streamHasLiveAudio(stream: MediaStreamLike | null): boolean {
  return Boolean(
    stream?.getAudioTracks().some((t) => t.readyState !== 'ended' && t.enabled)
  );
}

export function streamHasLiveVideo(stream: MediaStreamLike | null): boolean {
  return Boolean(
    stream?.getVideoTracks().some((t) => t.readyState !== 'ended' && t.enabled)
  );
}

export function stopStreamTracks(stream: MediaStreamLike | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
