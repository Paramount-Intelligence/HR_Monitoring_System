import { create } from 'zustand';
import {
  acceptCall,
  declineCall,
  endCall,
  getCallSignals,
  getIncomingCall,
  sendCallSignal,
  startCall,
} from '../api/calls.api';
import { getErrorMessage } from '../api/client';
import type { CallPhase, CallSessionResponse, CallStatus, CallType, RecordingStatus, RecordingType } from '../types/calls';
import type { RealtimeEvent } from '../realtime/realtime-events';
import { CALL_EVENT_TYPES } from './call-events';
import { buildIceServers } from './ice-utils';
import {
  requestCallMediaPermissions,
  showPermissionDeniedAlert,
  confirmAudioOnlyFallback,
} from './media-permissions';
import {
  captureLocalMedia,
  getStreamUrl,
  getWebRtcUnavailableMessage,
  isWebRtcNativeAvailable,
} from './media-stream-utils';
import {
  webrtcClient,
  type CallSignalPayload,
} from './webrtc-client';
import {
  isMobileRecordingSupported,
  mobileCallRecorder,
} from './mobile-call-recorder';
import {
  getUploadFailureMessage,
  hasUploadedRecording,
  uploadMobileRecording,
} from './recording-upload';
import { logRecording } from './recording-utils';
import { queueRecordingUpload, shouldQueueOnError } from '../offline/offline-sync';
import type { MobileRecordingStopResult } from './mobile-call-recorder';
import { secureLog } from '../utils/secure-log';
import { logCallDebug } from './call-debug';
import {
  shouldDeferSignalWhileRinging,
  shouldFireIncomingRingTimeout,
  shouldHandleCallAcceptedEvent,
  shouldProcessCalleeWebRtcSignal,
} from './call-guards';

const END_BRIEF_MS = 2500;
const INCOMING_POLL_MS = 3000;
const SIGNAL_POLL_MS = 500;
const CONNECT_TIMEOUT_MS = 45000;
const MISSED_CALL_TIMEOUT_MS = 45000;
const VOICE_RECORDING_DELAY_MS = 300;
const VIDEO_RECORDING_DELAY_MS = 1200;
const UPLOAD_STATUS_CLEAR_MS = 5000;

let recordingFinalizeStarted = false;

interface CallStoreState {
  phase: CallPhase;
  session: CallSessionResponse | null;
  participantName: string;
  callerName: string;
  remoteUserId: string | null;
  isCaller: boolean;
  userAcceptedIncoming: boolean;
  connectionStatus: CallStatus;
  statusMessage: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  durationSec: number;
  connectedAt: number | null;
  isBusy: boolean;
  errorMessage: string | null;
  mediaWarning: string | null;
  hasLocalAudio: boolean;
  hasLocalVideo: boolean;
  localStreamUrl: string | null;
  remoteStreamUrl: string | null;
  iceConnectionState: string;
  endTimer: ReturnType<typeof setTimeout> | null;
  incomingPollTimer: ReturnType<typeof setInterval> | null;
  signalPollTimer: ReturnType<typeof setInterval> | null;
  missedCallTimer: ReturnType<typeof setTimeout> | null;
  incomingMissedTimer: ReturnType<typeof setTimeout> | null;
  connectTimeoutTimer: ReturnType<typeof setTimeout> | null;
  recordingStatus: RecordingStatus;
  recordingSupported: boolean;
  recordingType: RecordingType | null;
  recordingStartedAt: string | null;
  recordingEndedAt: string | null;
  recordingDurationSeconds: number;
  recordingLocalUri: string | null;
  recordingMimeType: string | null;
  recordingFileSizeBytes: number;
  recordingUploadError: string | null;
  recordingId: string | null;
  recordingStartTimer: ReturnType<typeof setTimeout> | null;
  uploadStatusTimer: ReturnType<typeof setTimeout> | null;

  tryStartRecording: () => Promise<void>;
  finalizeRecordingAndUpload: () => Promise<void>;
  clearRecordingState: () => void;

  startOutgoingCall: (
    conversationId: string,
    callType: CallType,
    participantName: string,
    remoteUserId: string
  ) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => Promise<void>;
  cancelOutgoingCall: () => Promise<void>;
  endActiveCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  markCallConnected: () => void;
  setDurationSec: (sec: number) => void;
  clearCall: () => void;
  handleCallRealtimeEvent: (event: RealtimeEvent, currentUserId?: string) => void;
  processCallSignalEvent: (payload: Record<string, unknown>) => Promise<void>;
  syncIncomingFromPoll: (
    currentUserId?: string,
    resolveCallerName?: (session: CallSessionResponse) => string
  ) => Promise<void>;
  startIncomingPoll: (
    currentUserId?: string,
    resolveCallerName?: (session: CallSessionResponse) => string
  ) => void;
  stopIncomingPoll: () => void;
  startSignalPoll: () => void;
  stopSignalPoll: () => void;
  hydrateIncomingCallFromPush: (
    payload: {
      call_id?: string;
      conversation_id?: string;
      caller_id?: string;
      call_type?: CallType;
      caller_name?: string;
    },
    currentUserId?: string
  ) => Promise<void>;
}

function logCall(message: string): void {
  secureLog('CALL_MOBILE', message);
}

function clearIncomingMissedTimer(
  get: () => CallStoreState,
  set: (partial: Partial<CallStoreState>) => void
): void {
  const timer = get().incomingMissedTimer;
  if (timer) clearTimeout(timer);
  set({ incomingMissedTimer: null });
}

function startIncomingMissedTimer(
  get: () => CallStoreState,
  set: (partial: Partial<CallStoreState>) => void,
  sessionId: string
): void {
  clearIncomingMissedTimer(get, set);
  const timer = setTimeout(() => {
    const state = get();
    if (
      shouldFireIncomingRingTimeout({
        phase: state.phase,
        sessionId: state.session?.id,
        expectedSessionId: sessionId,
      })
    ) {
      logCall(`incoming_timeout call_id=${sessionId}`);
      logCallDebug('incoming ring timeout', { callId: sessionId });
      void get().declineIncomingCall();
    }
  }, MISSED_CALL_TIMEOUT_MS);
  set({ incomingMissedTimer: timer });
}

function showIncomingCallState(
  get: () => CallStoreState,
  set: (partial: Partial<CallStoreState>) => void,
  params: {
    session: CallSessionResponse;
    callerName: string;
    remoteUserId: string;
  }
): void {
  if (get().phase !== 'idle') return;

  logCallDebug('incoming UI shown', {
    callId: params.session.id,
    type: params.session.call_type,
  });

  set({
    phase: 'incoming',
    connectionStatus: 'incoming',
    session: params.session,
    callerName: params.callerName,
    participantName: params.callerName,
    isCaller: false,
    userAcceptedIncoming: false,
    remoteUserId: params.remoteUserId,
    isCameraOff: params.session.call_type === 'voice',
    isBusy: false,
    errorMessage: null,
  });
  startIncomingMissedTimer(get, set, params.session.id);
}

function scheduleEndBrief(
  get: () => CallStoreState,
  set: (partial: Partial<CallStoreState>) => void,
  message: string
): void {
  const existing = get().endTimer;
  if (existing) clearTimeout(existing);

  set({
    phase: 'ended',
    connectionStatus: 'ended',
    statusMessage: message,
    isBusy: false,
  });

  const timer = setTimeout(() => {
    get().clearCall();
  }, END_BRIEF_MS);
  set({ endTimer: timer });
}

function refreshStreamUrls(set: (partial: Partial<CallStoreState>) => void): void {
  set({
    localStreamUrl: getStreamUrl(webrtcClient.localStream),
    remoteStreamUrl: getStreamUrl(webrtcClient.remoteStream),
  });
}

export const useCallStore = create<CallStoreState>((set, get) => {
  const clearUploadStatusLater = () => {
    const existing = get().uploadStatusTimer;
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      set({
        recordingStatus: 'idle',
        recordingUploadError: null,
        uploadStatusTimer: null,
      });
    }, UPLOAD_STATUS_CLEAR_MS);
    set({ uploadStatusTimer: timer });
  };

  const clearRecordingTimers = () => {
    const { recordingStartTimer, uploadStatusTimer } = get();
    if (recordingStartTimer) clearTimeout(recordingStartTimer);
    if (uploadStatusTimer) clearTimeout(uploadStatusTimer);
    set({ recordingStartTimer: null, uploadStatusTimer: null });
  };

  const teardownWebRTC = (callId?: string) => {
    get().stopSignalPoll();
    clearConnectTimeout();
    clearIncomingMissedTimer(get, set);
    const missed = get().missedCallTimer;
    if (missed) clearTimeout(missed);
    webrtcClient.cleanup(callId);
    set({
      localStreamUrl: null,
      remoteStreamUrl: null,
      hasLocalAudio: false,
      hasLocalVideo: false,
      iceConnectionState: 'new',
      missedCallTimer: null,
    });
  };

  const clearConnectTimeout = () => {
    const timer = get().connectTimeoutTimer;
    if (timer) clearTimeout(timer);
    set({ connectTimeoutTimer: null });
  };

  const startConnectTimeout = () => {
    clearConnectTimeout();
    const sessionId = get().session?.id;
    const timer = setTimeout(() => {
      const state = get();
      if (
        state.session?.id === sessionId &&
        state.phase === 'active' &&
        state.connectionStatus === 'connecting'
      ) {
        set({ errorMessage: 'Unable to connect call. Please try again.' });
        void get().endActiveCall();
      }
    }, CONNECT_TIMEOUT_MS);
    set({ connectTimeoutTimer: timer });
  };

  const fetchAndProcessSignals = async () => {
    const { session, isCaller } = get();
    if (!session || !get().remoteUserId) return;
    try {
      const signals = await getCallSignals(session.id);
      for (const sig of signals) {
        await get().processCallSignalEvent({
          signal_id: sig.id,
          signal_type: sig.signal_type,
          payload: sig.payload,
          sender_id: sig.sender_id,
        });
      }
    } catch {
      /* silent poll */
    }
  };

  const wireWebRTC = (callId: string, recipientId: string) => {
    webrtcClient.setCallId(callId);

    webrtcClient.onIceCandidate = (candidate) => {
      void sendCallSignal(callId, recipientId, 'ice_candidate', candidate);
      secureLog('WEBRTC_MOBILE', `ice_candidate_sent call_id=${callId}`);
    };

    webrtcClient.onIceStateChange = (state) => {
      set({ iceConnectionState: state });
      if (state === 'connected' || state === 'completed') {
        get().markCallConnected();
      } else if (state === 'failed') {
        set({ errorMessage: 'Connection lost. Reconnecting…' });
      }
    };

    webrtcClient.onRemoteStream = () => {
      refreshStreamUrls(set);
      get().markCallConnected();
    };
  };

  const prepareMedia = async (callType: CallType) => {
    if (!isWebRtcNativeAvailable()) {
      throw new Error(getWebRtcUnavailableMessage());
    }

    const permission = await requestCallMediaPermissions(callType);
    if (!permission.granted) {
      showPermissionDeniedAlert(
        permission.message ?? 'Microphone permission is required for calls.'
      );
      throw new Error(permission.message ?? 'Microphone permission is required.');
    }

    let useAudioOnlyFallback = true;
    if (callType === 'video' && permission.microphone && !permission.camera) {
      useAudioOnlyFallback = await confirmAudioOnlyFallback();
      if (!useAudioOnlyFallback) {
        throw new Error('Camera permission is required for video calls.');
      }
    }

    const media = await captureLocalMedia(callType, {
      allowAudioOnlyFallback: callType === 'video' ? useAudioOnlyFallback : false,
    });
    secureLog(
      'WEBRTC_MOBILE',
      `local_stream_ready audio=${media.hasAudio} video=${media.hasVideo}`
    );

    set({
      hasLocalAudio: media.hasAudio,
      hasLocalVideo: media.hasVideo,
      mediaWarning: media.warning ?? null,
      isCameraOff: !media.hasVideo,
      isMuted: false,
      localStreamUrl: getStreamUrl(media.stream),
    });

    return media;
  };

  const finalizeRecordingAndUpload = async () => {
    if (recordingFinalizeStarted) return;
    const { session, recordingStatus } = get();
    if (!session) return;
    if (recordingStatus === 'idle' || recordingStatus === 'unsupported') return;
    if (hasUploadedRecording(session.id)) return;

    recordingFinalizeStarted = true;
    const callType = session.call_type;

    set({ recordingStatus: 'stopping' });
    clearRecordingTimers();

    let recordingResult: MobileRecordingStopResult | null = null;

    try {
      const result = await mobileCallRecorder.stop(callType);
      if (!result) {
        set({
          recordingStatus: 'failed',
          recordingUploadError: 'Recording file was empty.',
        });
        clearUploadStatusLater();
        return;
      }

      recordingResult = result;

      set({
        recordingStatus: 'uploading',
        recordingEndedAt: result.endedAt,
        recordingDurationSeconds: result.durationSeconds,
        recordingLocalUri: result.localUri,
        recordingMimeType: result.mimeType,
        recordingFileSizeBytes: result.fileSizeBytes,
        recordingType: result.recordingType,
      });

      const upload = await uploadMobileRecording(session.id, callType, result);
      set({
        recordingStatus: 'uploaded',
        recordingId: upload.recordingId,
        recordingUploadError: null,
      });
      clearUploadStatusLater();
    } catch (error) {
      if (shouldQueueOnError(error) && recordingResult) {
        await queueRecordingUpload(session.id, callType, recordingResult);
        set({
          recordingStatus: 'failed',
          recordingUploadError: 'Recording upload pending. Will sync when connection returns.',
        });
      } else {
        set({
          recordingStatus: 'failed',
          recordingUploadError: getUploadFailureMessage(error),
        });
      }
      clearUploadStatusLater();
    } finally {
      recordingFinalizeStarted = false;
    }
  };

  const teardownCallMedia = async (callId?: string) => {
    await finalizeRecordingAndUpload();
    teardownWebRTC(callId);
  };

  return {
    phase: 'idle',
    session: null,
    participantName: '',
    callerName: '',
    remoteUserId: null,
    isCaller: false,
    userAcceptedIncoming: false,
    connectionStatus: 'idle',
    statusMessage: null,
    isMuted: false,
    isCameraOff: false,
    isSpeakerOn: false,
    durationSec: 0,
    connectedAt: null,
    isBusy: false,
    errorMessage: null,
    mediaWarning: null,
    hasLocalAudio: false,
    hasLocalVideo: false,
    localStreamUrl: null,
    remoteStreamUrl: null,
    iceConnectionState: 'new',
    endTimer: null,
    incomingPollTimer: null,
    signalPollTimer: null,
    missedCallTimer: null,
    incomingMissedTimer: null,
    connectTimeoutTimer: null,
    recordingStatus: 'idle',
    recordingSupported: false,
    recordingType: null,
    recordingStartedAt: null,
    recordingEndedAt: null,
    recordingDurationSeconds: 0,
    recordingLocalUri: null,
    recordingMimeType: null,
    recordingFileSizeBytes: 0,
    recordingUploadError: null,
    recordingId: null,
    recordingStartTimer: null,
    uploadStatusTimer: null,

    clearRecordingState: () => {
      clearRecordingTimers();
      mobileCallRecorder.cleanup();
      recordingFinalizeStarted = false;
      set({
        recordingStatus: 'idle',
        recordingSupported: false,
        recordingType: null,
        recordingStartedAt: null,
        recordingEndedAt: null,
        recordingDurationSeconds: 0,
        recordingLocalUri: null,
        recordingMimeType: null,
        recordingFileSizeBytes: 0,
        recordingUploadError: null,
        recordingId: null,
      });
    },

    tryStartRecording: async () => {
      const { session, connectionStatus, hasLocalAudio, recordingStatus, recordingSupported } =
        get();
      if (!session || connectionStatus !== 'connected') return;
      if (recordingStatus !== 'idle' && recordingStatus !== 'failed') return;
      if (!hasLocalAudio) return;

      const supported = recordingSupported || (await isMobileRecordingSupported());
      if (!supported) {
        logRecording('unsupported reason=native-recorder-unavailable');
        set({ recordingStatus: 'unsupported', recordingSupported: false });
        return;
      }

      const delayMs =
        session.call_type === 'video' ? VIDEO_RECORDING_DELAY_MS : VOICE_RECORDING_DELAY_MS;

      clearRecordingTimers();
      const timer = setTimeout(() => {
        void (async () => {
          const current = get();
          if (current.session?.id !== session.id || current.connectionStatus !== 'connected') {
            return;
          }
          if (current.recordingStatus !== 'idle' && current.recordingStatus !== 'failed') {
            return;
          }

          set({ recordingStatus: 'preparing', recordingSupported: true });
          try {
            await mobileCallRecorder.start(session.id);
            set({
              recordingStatus: 'recording',
              recordingStartedAt: new Date().toISOString(),
              recordingType: 'audio',
              recordingSupported: true,
              recordingUploadError: null,
            });
          } catch (error) {
            logRecording(`unsupported reason=${getErrorMessage(error, 'recorder-failed')}`);
            set({
              recordingStatus: 'failed',
              recordingUploadError: getErrorMessage(error, 'Unable to start recording.'),
            });
          }
        })();
      }, delayMs);
      set({ recordingStartTimer: timer });
    },

    finalizeRecordingAndUpload,

    clearCall: () => {
      const { endTimer, incomingPollTimer, session, recordingStatus } = get();
      if (endTimer) clearTimeout(endTimer);
      if (incomingPollTimer) clearInterval(incomingPollTimer);
      clearRecordingTimers();
      teardownWebRTC(session?.id);

      const preserveUploadStatus =
        recordingStatus === 'uploading' ||
        recordingStatus === 'uploaded' ||
        recordingStatus === 'failed';

      set({
        phase: 'idle',
        session: null,
        participantName: '',
        callerName: '',
        remoteUserId: null,
        isCaller: false,
        userAcceptedIncoming: false,
        connectionStatus: 'idle',
        statusMessage: null,
        isMuted: false,
        isCameraOff: false,
        isSpeakerOn: false,
        durationSec: 0,
        connectedAt: null,
        isBusy: false,
        errorMessage: null,
        mediaWarning: null,
        endTimer: null,
        incomingPollTimer: null,
        ...(preserveUploadStatus
          ? {}
          : {
              recordingStatus: 'idle' as RecordingStatus,
              recordingSupported: false,
              recordingType: null,
              recordingStartedAt: null,
              recordingEndedAt: null,
              recordingDurationSeconds: 0,
              recordingLocalUri: null,
              recordingMimeType: null,
              recordingFileSizeBytes: 0,
              recordingUploadError: null,
              recordingId: null,
            }),
      });

      if (!preserveUploadStatus) {
        mobileCallRecorder.cleanup();
        recordingFinalizeStarted = false;
      }
    },

    setDurationSec: (sec) => set({ durationSec: sec }),

    markCallConnected: () => {
      clearConnectTimeout();
      set({
        phase: 'active',
        connectionStatus: 'connected',
        connectedAt: Date.now(),
        statusMessage: null,
        isBusy: false,
      });
      refreshStreamUrls(set);
      void get().tryStartRecording();
    },

    toggleMute: () => {
      if (!get().hasLocalAudio) return;
      const muted = webrtcClient.toggleMute();
      set({ isMuted: muted });
    },

    toggleCamera: () => {
      if (!get().hasLocalVideo) return;
      const cameraOff = webrtcClient.toggleCamera();
      set({ isCameraOff: cameraOff });
      refreshStreamUrls(set);
    },

    toggleSpeaker: () => set((s) => ({ isSpeakerOn: !s.isSpeakerOn })),

    startSignalPoll: () => {
      get().stopSignalPoll();
      const timer = setInterval(() => void fetchAndProcessSignals(), SIGNAL_POLL_MS);
      set({ signalPollTimer: timer });
    },

    stopSignalPoll: () => {
      const { signalPollTimer } = get();
      if (signalPollTimer) clearInterval(signalPollTimer);
      set({ signalPollTimer: null });
    },

    startOutgoingCall: async (conversationId, callType, participantName, remoteUserId) => {
      if (get().phase !== 'idle') {
        throw new Error('Already on a call.');
      }

      set({
        isBusy: true,
        errorMessage: null,
        participantName,
        remoteUserId,
        isCaller: true,
        userAcceptedIncoming: false,
        callerName: '',
      });

      try {
        const media = await prepareMedia(callType);
        const session = await startCall(conversationId, callType);
        logCall(`outgoing call_id=${session.id} type=${callType}`);

        wireWebRTC(session.id, remoteUserId);
        await webrtcClient.createPeerConnection(media.stream, buildIceServers());
        const offer = await webrtcClient.createAndSendOffer();
        await sendCallSignal(session.id, remoteUserId, 'offer', offer);

        const missedTimer = setTimeout(() => {
          if (get().session?.id === session.id && get().phase === 'outgoing') {
            void get().cancelOutgoingCall();
          }
        }, MISSED_CALL_TIMEOUT_MS);

        set({
          phase: 'outgoing',
          session,
          connectionStatus: 'calling',
          isBusy: false,
          missedCallTimer: missedTimer,
        });
        get().startSignalPoll();
        startConnectTimeout();
      } catch (error) {
        teardownWebRTC();
        set({ isBusy: false, errorMessage: getErrorMessage(error, 'Unable to start call.') });
        throw error;
      }
    },

    acceptIncomingCall: async () => {
      const { session, remoteUserId } = get();
      if (!session || !remoteUserId) return;
      if (get().phase !== 'incoming') return;

      logCallDebug('accept button pressed', { callId: session.id });
      clearIncomingMissedTimer(get, set);
      set({ isBusy: true, errorMessage: null, connectionStatus: 'connecting' });

      let acceptedOnServer = false;

      try {
        const callType = session.call_type;
        const media = await prepareMedia(callType);
        const updated = await acceptCall(session.id);
        acceptedOnServer = true;
        logCall(`accepted call_id=${session.id}`);
        logCallDebug('accept API success', { callId: session.id });

        wireWebRTC(session.id, remoteUserId);
        await webrtcClient.createPeerConnection(media.stream, buildIceServers());

        set({
          session: updated,
          phase: 'active',
          isCaller: false,
          userAcceptedIncoming: true,
          isBusy: false,
          connectionStatus: 'connecting',
        });

        get().startSignalPoll();
        await fetchAndProcessSignals();
        startConnectTimeout();
      } catch (error) {
        teardownWebRTC();
        const msg = getErrorMessage(error, 'Unable to accept call.');
        logCall(`accept_failed acceptedOnServer=${acceptedOnServer} msg=${msg}`);
        set({
          isBusy: false,
          errorMessage: msg,
          connectionStatus: acceptedOnServer ? 'connecting' : 'incoming',
          phase: acceptedOnServer ? 'active' : 'incoming',
        });
        if (acceptedOnServer) {
          try {
            await endCall(session.id);
          } catch {
            /* ignore */
          }
          await teardownCallMedia(session.id);
          scheduleEndBrief(get, set, 'Call could not connect');
        }
      }
    },

    declineIncomingCall: async () => {
      const { session, remoteUserId } = get();
      logCallDebug('decline button pressed', { callId: session?.id });
      clearIncomingMissedTimer(get, set);
      if (!session) {
        get().clearCall();
        return;
      }

      set({ isBusy: true });
      try {
        if (remoteUserId) {
          await sendCallSignal(session.id, remoteUserId, 'end', {});
        }
        await declineCall(session.id);
        logCall(`declined call_id=${session.id}`);
      } catch (error) {
        set({ errorMessage: getErrorMessage(error, 'Unable to decline call.') });
      } finally {
        teardownWebRTC(session.id);
        get().clearCall();
      }
    },

    cancelOutgoingCall: async () => {
      const { session } = get();
      if (!session) {
        get().clearCall();
        return;
      }

      set({ isBusy: true });
      try {
        const { remoteUserId } = get();
        if (remoteUserId) {
          await sendCallSignal(session.id, remoteUserId, 'end', {});
        }
        await endCall(session.id);
        logCall(`cancelled call_id=${session.id}`);
      } catch (error) {
        set({ errorMessage: getErrorMessage(error, 'Unable to cancel call.') });
      } finally {
        await teardownCallMedia(session.id);
        get().clearCall();
      }
    },

    endActiveCall: async () => {
      const { session, remoteUserId, isCaller } = get();
      if (!session) {
        get().clearCall();
        return;
      }

      set({ isBusy: true });
      try {
        const recipientId = remoteUserId ?? session.started_by_id;
        if (recipientId) {
          await sendCallSignal(session.id, recipientId, 'end', {});
        }
        await endCall(session.id);
        logCall(`ended call_id=${session.id}`);
      } catch (error) {
        set({ errorMessage: getErrorMessage(error, 'Unable to end call.') });
      } finally {
        await teardownCallMedia(session.id);
        scheduleEndBrief(get, set, 'Call ended');
      }
    },

    processCallSignalEvent: async (payload) => {
      const { session, isCaller, remoteUserId, phase, userAcceptedIncoming } = get();
      if (!session) return;
      if (payload.call_session_id && String(payload.call_session_id) !== session.id) return;

      const sig: CallSignalPayload = {
        id: payload.signal_id as string | undefined,
        signal_type: String(payload.signal_type),
        payload: payload.payload,
        sender_id: payload.sender_id as string | undefined,
      };

      if (sig.signal_type === 'end') {
        logCall('ended reason=signal_end');
        await teardownCallMedia(session.id);
        scheduleEndBrief(get, set, 'Call ended');
        return;
      }

      if (shouldDeferSignalWhileRinging({ phase, signalType: sig.signal_type })) {
        logCall(`signal deferred type=${sig.signal_type} phase=${phase}`);
        logCallDebug('signal deferred', { callId: session.id, signalType: sig.signal_type });
        return;
      }

      if (
        !shouldProcessCalleeWebRtcSignal({
          isCaller,
          userAcceptedIncoming,
          signalType: sig.signal_type,
        })
      ) {
        logCall(`signal ignored type=${sig.signal_type} reason=not_accepted_yet`);
        return;
      }

      const role = isCaller ? 'caller' : 'callee';
      const recipientId = remoteUserId ?? session.started_by_id;

      try {
        await webrtcClient.processSignal(sig, role, async (answer) => {
          if (!recipientId) return;
          logCall(`answer_sent call_id=${session.id}`);
          logCallDebug('answer sent', { callId: session.id });
          await sendCallSignal(session.id, recipientId, 'answer', answer);
        });
      } catch (error) {
        logCall(`signal_error type=${sig.signal_type} msg=${getErrorMessage(error, 'failed')}`);
        throw error;
      }

      refreshStreamUrls(set);

      if (get().connectionStatus !== 'connected' && (isCaller || userAcceptedIncoming)) {
        set({ connectionStatus: 'connecting', phase: 'active' });
      }
    },

    handleCallRealtimeEvent: (event, currentUserId) => {
      if (event.type === 'call_signal') {
        void get().processCallSignalEvent(event.payload);
        return;
      }

      if (!CALL_EVENT_TYPES.has(event.type)) return;

      const payload = event.payload;
      const callId = String(payload.call_session_id ?? '');
      const conversationId = String(payload.conversation_id ?? '');
      const callType = (payload.call_type as CallType) || 'voice';
      const { session, phase } = get();

      switch (event.type) {
        case 'call_incoming':
        case 'incoming_call': {
          if (phase !== 'idle') return;
          if (event.actor_id && currentUserId && String(event.actor_id) === String(currentUserId)) {
            return;
          }

          const callerName = String(payload.started_by_name || 'Someone');
          logCall(`incoming call_id=${callId} type=${callType}`);
          logCallDebug('incoming call received', { callId, type: callType });

          showIncomingCallState(get, set, {
            session: {
              id: callId,
              conversation_id: conversationId,
              started_by_id: String(event.actor_id || ''),
              call_type: callType,
              status: 'ringing',
              started_at: null,
              accepted_at: null,
              ended_at: null,
              created_at: event.timestamp,
            },
            callerName,
            remoteUserId: event.actor_id ? String(event.actor_id) : '',
          });
          break;
        }

        case 'call_accepted': {
          if (
            !shouldHandleCallAcceptedEvent({
              isCaller: get().isCaller,
              sessionId: session?.id,
              callId,
            })
          ) {
            logCall(`call_accepted ignored call_id=${callId} reason=not_outgoing_caller`);
            break;
          }
          logCall(`call_accepted call_id=${callId}`);
          logCallDebug('call accepted event (caller)', { callId });
          const missed = get().missedCallTimer;
          if (missed) clearTimeout(missed);
          set({
            session: session ? { ...session, status: 'active' } : session,
            connectionStatus: 'connecting',
            phase: 'active',
            missedCallTimer: null,
          });
          void fetchAndProcessSignals();
          startConnectTimeout();
          break;
        }

        case 'call_declined': {
          if (session?.id !== callId) return;
          logCall(`declined call_id=${callId}`);
          void teardownCallMedia(callId).then(() => {
            scheduleEndBrief(get, set, 'Call declined');
          });
          break;
        }

        case 'call_missed': {
          if (session?.id !== callId) return;
          logCall(`missed call_id=${callId}`);
          void teardownCallMedia(callId).then(() => {
            scheduleEndBrief(get, set, 'No answer');
          });
          break;
        }

        case 'call_failed': {
          if (session?.id !== callId) return;
          logCall(`failed reason=${String(payload.status || 'unknown')}`);
          void teardownCallMedia(callId).then(() => {
            scheduleEndBrief(get, set, 'Connection failed');
          });
          break;
        }

        case 'call_ended':
        case 'call_cancelled': {
          if (session?.id !== callId) return;
          logCall(`ended call_id=${callId}`);
          void teardownCallMedia(callId).then(() => {
            scheduleEndBrief(get, set, 'Call ended');
          });
          break;
        }

        default:
          break;
      }
    },

    syncIncomingFromPoll: async (currentUserId, resolveCallerName) => {
      if (get().phase !== 'idle' || !currentUserId) return;

      try {
        const incoming = await getIncomingCall();
        if (!incoming || get().phase !== 'idle') return;
        if (incoming.started_by_id === currentUserId) return;

        const callerName = resolveCallerName?.(incoming) ?? 'Someone';
        logCall(`incoming poll call_id=${incoming.id} type=${incoming.call_type}`);
        logCallDebug('incoming call received (poll)', { callId: incoming.id });

        showIncomingCallState(get, set, {
          session: incoming,
          callerName,
          remoteUserId: incoming.started_by_id,
        });
      } catch {
        /* silent */
      }
    },

    hydrateIncomingCallFromPush: async (payload, currentUserId) => {
      if (get().phase !== 'idle' || !currentUserId) return;
      try {
        const incoming = await getIncomingCall();
        if (!incoming || get().phase !== 'idle') return;
        if (incoming.started_by_id === currentUserId) return;
        if (payload.call_id && incoming.id !== payload.call_id) return;

        const callerName = payload.caller_name ?? 'Someone';
        logCallDebug('incoming call from push', { callId: incoming.id });

        showIncomingCallState(get, set, {
          session: incoming,
          callerName,
          remoteUserId: incoming.started_by_id,
        });
      } catch {
        /* silent */
      }
    },

    startIncomingPoll: (currentUserId, resolveCallerName) => {
      get().stopIncomingPoll();
      void get().syncIncomingFromPoll(currentUserId, resolveCallerName);
      const timer = setInterval(() => {
        void get().syncIncomingFromPoll(currentUserId, resolveCallerName);
      }, INCOMING_POLL_MS);
      set({ incomingPollTimer: timer });
    },

    stopIncomingPoll: () => {
      const { incomingPollTimer } = get();
      if (incomingPollTimer) clearInterval(incomingPollTimer);
      set({ incomingPollTimer: null });
    },
  };
});

export function clearCallStateOnLogout(): void {
  useCallStore.getState().stopIncomingPoll();
  useCallStore.getState().stopSignalPoll();
  void useCallStore.getState().finalizeRecordingAndUpload();
  mobileCallRecorder.cleanup();
  useCallStore.getState().clearCall();
  useCallStore.getState().clearRecordingState();
}
