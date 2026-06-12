/** Acquire local media for voice/video calls with graceful degradation. */

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

async function tryGetUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    return null;
  }
}

function permissionDeniedMessage(callType: 'voice' | 'video'): string {
  return callType === 'video'
    ? 'Camera/microphone permission was denied. Please allow access from browser site settings.'
    : 'Microphone permission was denied. Please allow microphone access from browser site settings.';
}

function bothUnavailableMessage(): string {
  return 'No camera or microphone access available. Please connect a device or allow browser permissions.';
}

/** @deprecated use getCallMedia */
export async function acquireCallMedia(callType: 'voice' | 'video'): Promise<MediaStream> {
  const result = await getCallMedia(callType);
  return result.stream;
}

export async function getCallMedia(callType: 'voice' | 'video'): Promise<CallMediaResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not support audio/video calls.');
  }

  if (callType === 'voice') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const flags = trackFlags(stream);
      if (!flags.hasLocalAudio) {
        throw new Error('No microphone found. Connect a microphone to place calls.');
      }
      return {
        stream,
        hasLocalAudio: true,
        hasLocalVideo: false,
        localCameraUnavailable: true,
        localMicrophoneUnavailable: false,
      };
    } catch (err) {
      const domErr = err as DOMException;
      if (domErr.name === 'NotAllowedError') {
        throw new Error(permissionDeniedMessage('voice'));
      }
      if (err instanceof Error && err.message.includes('microphone')) throw err;
      throw new Error('No microphone found. Connect a microphone to place calls.');
    }
  }

  // Video call — try full A/V first
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
    const domErr = firstErr as DOMException;
    if (domErr.name === 'NotAllowedError') {
      throw new Error(permissionDeniedMessage('video'));
    }
  }

  // Camera missing/busy — try audio-only (still a video call for remote)
  const audioOnly = await tryGetUserMedia({ audio: true, video: false });
  if (audioOnly) {
    return {
      stream: audioOnly,
      hasLocalAudio: true,
      hasLocalVideo: false,
      localCameraUnavailable: true,
      localMicrophoneUnavailable: false,
      warning: 'Camera not found. Continuing with audio only.',
    };
  }

  // Microphone missing — try video-only
  const videoOnly = await tryGetUserMedia({ audio: false, video: true });
  if (videoOnly) {
    return {
      stream: videoOnly,
      hasLocalAudio: false,
      hasLocalVideo: true,
      localCameraUnavailable: false,
      localMicrophoneUnavailable: true,
      warning: 'Microphone not found. Continuing without audio.',
    };
  }

  // Camera in use but mic may work
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
  } catch (lastErr) {
    const domErr = lastErr as DOMException;
    if (domErr.name === 'NotReadableError') {
      const audioFallback = await tryGetUserMedia({ audio: true, video: false });
      if (audioFallback) {
        return {
          stream: audioFallback,
          hasLocalAudio: true,
          hasLocalVideo: false,
          localCameraUnavailable: true,
          localMicrophoneUnavailable: false,
          warning:
            'Camera is already in use by another application. Continuing with audio only if microphone is available.',
        };
      }
    }
    if (domErr.name === 'NotAllowedError') {
      throw new Error(permissionDeniedMessage('video'));
    }
    throw new Error(bothUnavailableMessage());
  }
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
