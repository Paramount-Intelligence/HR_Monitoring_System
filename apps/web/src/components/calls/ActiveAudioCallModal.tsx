'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { CallConnectionStatus } from '@/hooks/useCallManager';
import type { RecordingStatus } from '@/hooks/useCallRecording';
import { CallModalOverlay } from './CallModalOverlay';
import { CallStatusBadge } from './CallStatusBadge';
import { RecordingIndicator } from './RecordingIndicator';
import { CallControlBar } from './CallControlBar';
import { getCallStatusLabel } from './call-ui-utils';

interface ActiveAudioCallModalProps {
  participantName: string;
  connectionStatus: CallConnectionStatus;
  iceConnectionState: string;
  callDurationSec: number;
  recordingStatus: RecordingStatus;
  isRecordingActive: boolean;
  mediaWarning: string | null;
  localMuted: boolean;
  hasLocalAudio: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
}

export function ActiveAudioCallModal({
  participantName,
  connectionStatus,
  iceConnectionState,
  callDurationSec,
  recordingStatus,
  isRecordingActive,
  mediaWarning,
  localMuted,
  hasLocalAudio,
  onToggleMute,
  onEndCall,
}: ActiveAudioCallModalProps) {
  const initial = participantName.charAt(0).toUpperCase();
  const timerOrStatus = getCallStatusLabel(connectionStatus, callDurationSec, iceConnectionState);

  return (
    <CallModalOverlay fullScreen className="max-w-none">
      <div className="flex flex-1 flex-col min-h-0 bg-gradient-to-b from-[#0b1220] via-slate-950 to-black text-white">
        {/* Top bar */}
        <div className="shrink-0 px-4 sm:px-8 pt-6 sm:pt-8 pb-4 space-y-3">
          <RecordingIndicator
            status={recordingStatus}
            isRecordingActive={isRecordingActive}
            variant="banner"
          />
          {mediaWarning && (
            <p className="text-center text-xs font-semibold text-amber-300">{mediaWarning}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <RecordingIndicator status={recordingStatus} isRecordingActive={isRecordingActive} />
            <CallStatusBadge
              status={connectionStatus}
              durationSec={callDurationSec}
              iceConnectionState={iceConnectionState}
            />
          </div>
        </div>

        {/* Center — participant */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 min-h-0">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-blue-500/15 blur-3xl scale-125" aria-hidden />
            <Avatar className="relative h-40 w-40 sm:h-52 sm:w-52 ring-4 ring-white/15 shadow-2xl shadow-black/50">
              <AvatarFallback className="text-6xl sm:text-7xl font-black bg-gradient-to-br from-blue-700 via-slate-800 to-slate-950 text-white">
                {initial}
              </AvatarFallback>
            </Avatar>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white text-center tracking-tight mb-2">
            {participantName}
          </h1>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400 mb-4">Voice Call</p>
          <p className="text-2xl sm:text-3xl font-mono font-bold text-emerald-300 tabular-nums">{timerOrStatus}</p>
        </div>

        {/* Controls */}
        <div className="shrink-0 px-4 sm:px-8 pb-8 sm:pb-10 pt-4">
          <CallControlBar
            callType="voice"
            localMuted={localMuted}
            localVideoDisabled={false}
            hasLocalAudio={hasLocalAudio}
            hasLocalVideo={false}
            localCameraUnavailable={false}
            onToggleMute={onToggleMute}
            onToggleVideo={() => undefined}
            onEndCall={onEndCall}
          />
        </div>
      </div>
    </CallModalOverlay>
  );
}
