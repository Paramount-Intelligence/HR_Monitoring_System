/** Acquire local media for voice/video calls with clear permission errors. */
export async function acquireCallMedia(callType: 'voice' | 'video'): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not support audio/video calls.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });
  } catch (err) {
    const domErr = err as DOMException;
    if (domErr.name === 'NotAllowedError') {
      throw new Error(
        callType === 'video'
          ? 'Microphone or camera permission was denied. Allow access in browser settings, or try a voice call.'
          : 'Microphone permission was denied. Allow microphone access in your browser settings.'
      );
    }
    if (domErr.name === 'NotFoundError') {
      throw new Error(
        callType === 'video'
          ? 'No camera or microphone found. Try a voice call or connect an audio device.'
          : 'No microphone found. Connect a microphone to place calls.'
      );
    }
    if (domErr.name === 'NotReadableError' && callType === 'video') {
      throw new Error('Camera is unavailable (in use or blocked). Try a voice call instead.');
    }
    throw err;
  }
}

export function isWebRtcSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia)
  );
}
