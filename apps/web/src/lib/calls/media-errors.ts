import { logCallDebug } from '@/lib/calls/call-debug';

export type CallMediaType = 'voice' | 'video';

export interface MediaDiagnostics {
  hasMediaDevices: boolean;
  isSecureContext: boolean;
  hasFocus: boolean;
  protocol: string;
  audioInputCount: number;
  videoInputCount: number;
}

function errorName(error: unknown): string {
  if (error instanceof DOMException || error instanceof Error) return error.name;
  return 'UnknownError';
}

/** Map getUserMedia DOMException names to user-facing messages. */
export function mapMediaError(error: unknown, callType: CallMediaType): string {
  const name = errorName(error);
  const isVideo = callType === 'video';

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return isVideo
        ? 'Camera/microphone permission was denied. Allow it from browser site settings.'
        : 'Microphone permission was denied. Allow it from browser site settings.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return isVideo
        ? 'No microphone/camera device was found.'
        : 'No microphone device was found.';
    case 'NotReadableError':
    case 'TrackStartError':
      return isVideo
        ? 'Microphone/camera is already in use by another app or blocked by the operating system.'
        : 'Microphone is already in use by another app or blocked by the operating system.';
    case 'OverconstrainedError':
      return 'The selected audio/video device does not support the requested settings.';
    case 'SecurityError':
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        return 'Site must be opened over HTTPS to use audio/video calling.';
      }
      return 'Media access is blocked by browser security settings.';
    case 'TypeError':
      return 'Your browser does not support audio/video calling.';
    case 'AbortError':
      return 'Media access was interrupted. Please try again.';
    default:
      if (error instanceof Error && error.message.trim()) {
        return error.message;
      }
      return isVideo
        ? 'Could not access camera or microphone.'
        : 'Could not access microphone.';
  }
}

export function isSecureMediaContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

/** Dev-safe environment snapshot when media acquisition fails (no device labels). */
export async function diagnoseMediaEnvironment(callType: CallMediaType): Promise<MediaDiagnostics> {
  const hasMediaDevices = Boolean(
    typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia
  );
  const isSecureContext = isSecureMediaContext();
  const hasFocus = typeof document !== 'undefined' ? document.hasFocus() : true;
  const protocol = typeof location !== 'undefined' ? location.protocol : 'unknown';

  let audioInputCount = 0;
  let videoInputCount = 0;

  if (hasMediaDevices && navigator.mediaDevices.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      audioInputCount = devices.filter((d) => d.kind === 'audioinput').length;
      videoInputCount = devices.filter((d) => d.kind === 'videoinput').length;
    } catch {
      /* enumeration may fail before permission grant */
    }
  }

  void callType;
  return {
    hasMediaDevices,
    isSecureContext,
    hasFocus,
    protocol,
    audioInputCount,
    videoInputCount,
  };
}

/** Refine mapped error using non-sensitive diagnostics. */
export function refineMediaErrorMessage(
  mapped: string,
  diagnostics: MediaDiagnostics,
  callType: CallMediaType
): string {
  if (!diagnostics.isSecureContext) {
    return 'Site must be opened over HTTPS to use audio/video calling.';
  }
  if (!diagnostics.hasMediaDevices) {
    return 'Your browser does not support audio/video calling.';
  }
  if (callType === 'voice' && diagnostics.audioInputCount === 0) {
    return 'No microphone found.';
  }
  if (callType === 'video' && diagnostics.videoInputCount === 0 && diagnostics.audioInputCount === 0) {
    return 'No microphone or camera device was found.';
  }
  if (callType === 'video' && diagnostics.videoInputCount === 0) {
    return 'Camera unavailable.';
  }
  return mapped;
}

export async function resolveMediaError(
  error: unknown,
  callType: CallMediaType
): Promise<string> {
  logMediaError(error, callType);
  const mapped = mapMediaError(error, callType);
  const diagnostics = await diagnoseMediaEnvironment(callType);
  logCallDebug('media diagnostics', {
    callType,
    ...diagnostics,
  });
  return refineMediaErrorMessage(mapped, diagnostics, callType);
}

export function logMediaError(error: unknown, callType: CallMediaType): void {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_CALL_DEBUG !== 'true') {
    return;
  }
  const name = errorName(error);
  const message = error instanceof Error ? error.message : String(error);
  logCallDebug('getUserMedia failed', { errorName: name, errorMessage: message, callType });
}
