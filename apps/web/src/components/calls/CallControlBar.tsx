'use client';

import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { CallControlButton } from './CallControlButton';

interface CallControlBarProps {
  callType: 'voice' | 'video';
  localMuted: boolean;
  localVideoDisabled: boolean;
  hasLocalAudio: boolean;
  hasLocalVideo: boolean;
  localCameraUnavailable: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

export function CallControlBar({
  callType,
  localMuted,
  localVideoDisabled,
  hasLocalAudio,
  hasLocalVideo,
  localCameraUnavailable,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: CallControlBarProps) {
  return (
    <div
      className="mx-auto flex max-w-md items-center justify-center gap-5 sm:gap-8 rounded-2xl border border-white/15 bg-slate-900/80 backdrop-blur-md px-8 py-5 shadow-2xl shadow-black/40"
      role="toolbar"
      aria-label="Call controls"
    >
      <CallControlButton
        onClick={onToggleMute}
        disabled={!hasLocalAudio}
        active={localMuted}
        label={hasLocalAudio ? (localMuted ? 'Unmute microphone' : 'Mute microphone') : 'Microphone unavailable'}
      >
        {localMuted ? <MicOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <Mic className="h-6 w-6 sm:h-7 sm:w-7" />}
      </CallControlButton>

      {callType === 'video' && (
        <CallControlButton
          onClick={onToggleVideo}
          disabled={!hasLocalVideo && localCameraUnavailable}
          active={localVideoDisabled}
          label={
            !hasLocalVideo
              ? 'Camera unavailable'
              : localVideoDisabled
                ? 'Turn camera on'
                : 'Turn camera off'
          }
        >
          {localVideoDisabled ? (
            <VideoOff className="h-6 w-6 sm:h-7 sm:w-7" />
          ) : (
            <Video className="h-6 w-6 sm:h-7 sm:w-7" />
          )}
        </CallControlButton>
      )}

      <CallControlButton onClick={onEndCall} label="End call" variant="danger">
        <PhoneOff className="h-6 w-6 sm:h-7 sm:w-7" />
      </CallControlButton>
    </div>
  );
}
