'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { CallConnectionStatus } from '@/hooks/useCallManager';
import type { RecordingStatus } from '@/hooks/useCallRecording';
import { CallModalOverlay } from './CallModalOverlay';
import { CallStatusBadge } from './CallStatusBadge';
import { RecordingIndicator } from './RecordingIndicator';
import { CallControlBar } from './CallControlBar';
import { VideoPlaceholder } from './VideoPlaceholder';
import { formatCallTimer, getCallStatusLabel } from './call-ui-utils';

interface ActiveVideoCallModalProps {
  participantName: string;
  selfInitial: string;
  remoteInitial: string;
  connectionStatus: CallConnectionStatus;
  iceConnectionState: string;
  callDurationSec: number;
  recordingStatus: RecordingStatus;
  isRecordingActive: boolean;
  mediaWarning: string | null;
  showLocalVideo: boolean;
  showRemoteVideo: boolean;
  localCameraUnavailable: boolean;
  localMuted: boolean;
  localVideoDisabled: boolean;
  hasLocalAudio: boolean;
  hasLocalVideo: boolean;
  bindLocalVideoRef: (node: HTMLVideoElement | null) => void;
  bindRemoteVideoRef: (node: HTMLVideoElement | null) => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

export function ActiveVideoCallModal({
  participantName,
  selfInitial,
  remoteInitial,
  connectionStatus,
  iceConnectionState,
  callDurationSec,
  recordingStatus,
  isRecordingActive,
  mediaWarning,
  showLocalVideo,
  showRemoteVideo,
  localCameraUnavailable,
  localMuted,
  localVideoDisabled,
  hasLocalAudio,
  hasLocalVideo,
  bindLocalVideoRef,
  bindRemoteVideoRef,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: ActiveVideoCallModalProps) {
  const localPreviewRef = useRef<HTMLVideoElement | null>(null);
  const remoteMainRef = useRef<HTMLVideoElement | null>(null);

  const attachLocalPreviewRef = useCallback(
    (node: HTMLVideoElement | null) => {
      localPreviewRef.current = node;
      bindLocalVideoRef(node);
    },
    [bindLocalVideoRef]
  );

  const attachRemoteMainRef = useCallback(
    (node: HTMLVideoElement | null) => {
      remoteMainRef.current = node;
      bindRemoteVideoRef(node);
    },
    [bindRemoteVideoRef]
  );

  useEffect(() => {
    if (!showLocalVideo && localPreviewRef.current) {
      console.log('[CALL_UI] camera_off_placeholder shown side=local');
    }
  }, [showLocalVideo]);

  useEffect(() => {
    if (!showRemoteVideo) {
      console.log('[CALL_UI] camera_off_placeholder shown side=remote');
    }
  }, [showRemoteVideo]);

  const statusLine =
    connectionStatus === 'connected'
      ? formatCallTimer(callDurationSec)
      : getCallStatusLabel(connectionStatus, callDurationSec, iceConnectionState);

  return (
    <CallModalOverlay fullScreen className="max-w-none">
      <div className="flex flex-1 flex-col min-h-0 bg-black text-white overflow-hidden">
        {/* Video stage — full area on mobile */}
        <div className="relative flex-1 min-h-0 w-full">
          <video
            ref={attachRemoteMainRef}
            autoPlay
            playsInline
            className={cn('absolute inset-0 h-full w-full object-cover bg-slate-950', !showRemoteVideo && 'opacity-0')}
            aria-label={`${participantName} video`}
          />
          {!showRemoteVideo && (
            <VideoPlaceholder label="Camera off" initial={remoteInitial} />
          )}

          {/* Top overlay */}
          <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent px-4 sm:px-6 pt-4 sm:pt-6 pb-12 space-y-2">
            <RecordingIndicator
              status={recordingStatus}
              isRecordingActive={isRecordingActive}
              variant="banner"
            />
            {mediaWarning && (
              <p className="text-center text-xs font-semibold text-amber-300">{mediaWarning}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <RecordingIndicator status={recordingStatus} isRecordingActive={isRecordingActive} />
              <CallStatusBadge
                status={connectionStatus}
                durationSec={callDurationSec}
                iceConnectionState={iceConnectionState}
              />
            </div>
          </div>

          {/* Participant label */}
          <div className="absolute top-20 sm:top-24 left-4 sm:left-6 z-20 rounded-xl bg-black/70 backdrop-blur-sm border border-white/10 px-3 py-2">
            <p className="text-sm font-bold text-white">{participantName}</p>
            <p className="text-xs text-slate-300 font-mono tabular-nums">{statusLine}</p>
          </div>

          {/* Local PiP */}
          <div className="absolute bottom-28 sm:bottom-32 right-4 sm:right-6 z-30 w-28 h-36 sm:w-44 sm:h-32 rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl shadow-black/60 bg-slate-900">
            <video
              ref={attachLocalPreviewRef}
              autoPlay
              playsInline
              muted
              className={cn(
                'absolute inset-0 h-full w-full object-cover scale-x-[-1] bg-slate-900',
                !showLocalVideo && 'opacity-0'
              )}
              aria-label="Your camera preview"
            />
            {!showLocalVideo && (
              <VideoPlaceholder
                label={localCameraUnavailable ? 'No camera' : 'Camera off'}
                initial={selfInitial}
                compact
              />
            )}
            <div className="absolute bottom-1.5 left-1.5 z-40 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">
              You
            </div>
          </div>
        </div>

        {/* Control dock */}
        <div className="shrink-0 z-40 bg-gradient-to-t from-black via-black/95 to-transparent px-4 sm:px-8 pb-6 sm:pb-8 pt-4">
          <CallControlBar
            callType="video"
            localMuted={localMuted}
            localVideoDisabled={localVideoDisabled}
            hasLocalAudio={hasLocalAudio}
            hasLocalVideo={hasLocalVideo}
            localCameraUnavailable={localCameraUnavailable}
            onToggleMute={onToggleMute}
            onToggleVideo={onToggleVideo}
            onEndCall={onEndCall}
          />
        </div>
      </div>
    </CallModalOverlay>
  );
}
