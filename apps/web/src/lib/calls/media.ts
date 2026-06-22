/** Acquire local media for voice/video calls with graceful degradation. */

import { logMediaError, resolveMediaError } from '@/lib/calls/media-errors';

export interface CallMediaResult {
  stream: MediaStream;
  hasLocalAudio: boolean;
  hasLocalVideo: boolean;
  localCameraUnavailable: boolean;
  localMicrophoneUnavailable: boolean;
  warning?: string;
}

function trackFlags(stream: MediaStream) {
  const hasLocalAudio = stream.getAudioTracks().some((t) => t.readyState !== 'ended');
  const hasLocalVideo = stream.getVideoTracks().some((t) => t.readyState !== 'ended');
  return { hasLocalAudio, hasLocalVideo };
}

async function requestUserMedia(
  constraints: MediaStreamConstraints,
  callType: 'voice' | 'video'
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Your browser does not support audio/video calling.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    throw new Error(await resolveMediaError(err, callType));
  }
}

/** @deprecated use getCallMedia */
export async function acquireCallMedia(callType: 'voice' | 'video'): Promise<MediaStream> {
  const result = await getCallMedia(callType);
  return result.stream;
}

export async function getCallMedia(callType: 'voice' | 'video'): Promise<CallMediaResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Your browser does not support audio/video calling.');
  }

  if (callType === 'voice') {
    const stream = await requestUserMedia({ audio: true, video: false }, 'voice');
    const flags = trackFlags(stream);
    if (!flags.hasLocalAudio) {
      throw new Error('No microphone device was found.');
    }
    return {
      stream,
      hasLocalAudio: true,
      hasLocalVideo: false,
      localCameraUnavailable: true,
      localMicrophoneUnavailable: false,
    };
  }

  // Video call — audio + video first
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const flags = trackFlags(stream);
    return {
      stream,
      hasLocalAudio: flags.hasLocalAudio,
      hasLocalVideo: flags.hasLocalVideo,
      localCameraUnavailable: !flags.hasLocalVideo,
      localMicrophoneUnavailable: !flags.hasLocalAudio,
      warning:
        !flags.hasLocalVideo
          ? 'Camera not found. Continuing with audio only.'
          : !flags.hasLocalAudio
            ? 'Microphone not found. Continuing without audio.'
            : undefined,
    };
  } catch (firstErr) {
    logMediaError(firstErr, 'video');
    const firstName = firstErr instanceof DOMException ? firstErr.name : '';
    if (firstName === 'NotAllowedError' || firstName === 'PermissionDeniedError') {
      throw new Error(await resolveMediaError(firstErr, 'video'));
    }
  }

  let lastError: unknown = null;

  // Camera missing/busy — try audio-only (still a video call for remote)
  try {
    const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    return {
      stream: audioOnly,
      hasLocalAudio: true,
      hasLocalVideo: false,
      localCameraUnavailable: true,
      localMicrophoneUnavailable: false,
      warning: 'Camera not found. Continuing with audio only.',
    };
  } catch (err) {
    lastError = err;
    logMediaError(err, 'video');
  }

  // Microphone missing — try video-only
  try {
    const videoOnly = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    return {
      stream: videoOnly,
      hasLocalAudio: false,
      hasLocalVideo: true,
      localCameraUnavailable: false,
      localMicrophoneUnavailable: true,
      warning: 'Microphone not found. Continuing without audio.',
    };
  } catch (err) {
    lastError = err;
    logMediaError(err, 'video');
  }

  // Last attempt — full A/V (e.g. transient NotReadableError)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const flags = trackFlags(stream);
    return {
      stream,
      hasLocalAudio: flags.hasLocalAudio,
      hasLocalVideo: flags.hasLocalVideo,
      localCameraUnavailable: !flags.hasLocalVideo,
      localMicrophoneUnavailable: !flags.hasLocalAudio,
    };
  } catch (err) {
    lastError = err;
    logMediaError(err, 'video');
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      try {
        const audioFallback = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        return {
          stream: audioFallback,
          hasLocalAudio: true,
          hasLocalVideo: false,
          localCameraUnavailable: true,
          localMicrophoneUnavailable: false,
          warning:
            'Camera is already in use by another application. Continuing with audio only if microphone is available.',
        };
      } catch (fallbackErr) {
        lastError = fallbackErr;
        logMediaError(fallbackErr, 'video');
      }
    }
  }

  throw new Error(await resolveMediaError(lastError ?? new Error('Media unavailable'), 'video'));
}

export function isWebRtcSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia)
  );
}

export function streamHasLiveVideo(stream: MediaStream | null): boolean {
  return Boolean(
    stream?.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled)
  );
}

export function streamHasLiveAudio(stream: MediaStream | null): boolean {
  return Boolean(
    stream?.getAudioTracks().some((t) => t.readyState === 'live' && t.enabled)
  );
}

export function streamHasVideoTrack(stream: MediaStream | null): boolean {
  return Boolean(stream?.getVideoTracks().length);
}

export function streamHasAudioTrack(stream: MediaStream | null): boolean {
  return Boolean(stream?.getAudioTracks().length);
}
