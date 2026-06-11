export type RecordingStatus =
  | 'idle'
  | 'preparing'
  | 'recording'
  | 'stopping'
  | 'uploading'
  | 'uploaded'
  | 'failed';

const VIDEO_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

const AUDIO_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

function pickMimeType(candidates: string[], fallback: string): string {
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return fallback;
}

function countTracks(stream: MediaStream | null, kind: 'audio' | 'video'): number {
  if (!stream) return 0;
  return kind === 'audio' ? stream.getAudioTracks().length : stream.getVideoTracks().length;
}

function hasLiveTrack(stream: MediaStream | null, kind: 'audio' | 'video'): boolean {
  if (!stream) return false;
  const tracks = kind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks();
  return tracks.some((t) => t.readyState === 'live');
}

function logTracks(prefix: string, localStream: MediaStream, remoteStream: MediaStream) {
  console.log(
    `[VIDEO_RECORDING] ${prefix} localVideoTracks=${countTracks(localStream, 'video')} remoteVideoTracks=${countTracks(remoteStream, 'video')} localAudioTracks=${countTracks(localStream, 'audio')} remoteAudioTracks=${countTracks(remoteStream, 'audio')}`
  );
}

export interface CallRecorderOptions {
  callId: string;
  callType: 'voice' | 'video';
  localStream: MediaStream;
  remoteStream: MediaStream;
}

export interface CallRecorderResult {
  blob: Blob;
  mimeType: string;
  recordingType: 'audio' | 'video';
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
}

export class CallRecorder {
  private audioContext: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private startedAt: Date | null = null;
  private mimeType = 'audio/webm';
  private recordingType: 'audio' | 'video' = 'audio';
  private canvas: HTMLCanvasElement | null = null;
  private animationFrame: number | null = null;
  private localVideoEl: HTMLVideoElement | null = null;
  private remoteVideoEl: HTMLVideoElement | null = null;
  private composedStream: MediaStream | null = null;
  private callId = '';

  start(options: CallRecorderOptions): void {
    const { callId, callType, localStream, remoteStream } = options;
    this.callId = callId;
    this.cleanupInternal(false);

    console.log(`[VIDEO_RECORDING] starting call_id=${callId}`);
    logTracks('tracks', localStream, remoteStream);

    const hasAnyAudio = hasLiveTrack(localStream, 'audio') || hasLiveTrack(remoteStream, 'audio');
    const hasAnyVideo =
      callType === 'video' &&
      (hasLiveTrack(localStream, 'video') ||
        hasLiveTrack(remoteStream, 'video') ||
        countTracks(localStream, 'video') > 0 ||
        countTracks(remoteStream, 'video') > 0);

    if (!hasAnyAudio && !hasAnyVideo) {
      throw new Error('No audio or video tracks available for recording.');
    }

    this.setupAudioMixing(localStream, remoteStream);

    if (callType === 'video') {
      try {
        this.startVideoRecording(localStream, remoteStream);
        return;
      } catch (err) {
        console.warn('[VIDEO_RECORDING] video recording failed, falling back to audio:', err);
      }
    }

    if (!hasAnyAudio && !this.destination?.stream.getAudioTracks().length) {
      throw new Error('No audio tracks available for audio fallback recording.');
    }

    this.startAudioRecording();
  }

  private setupAudioMixing(localStream: MediaStream, remoteStream: MediaStream): void {
    try {
      this.audioContext = new AudioContext();
      this.destination = this.audioContext.createMediaStreamDestination();

      const connectAudio = (stream: MediaStream) => {
        stream.getAudioTracks().forEach((track) => {
          if (track.readyState !== 'live') return;
          const source = this.audioContext!.createMediaStreamSource(new MediaStream([track]));
          source.connect(this.destination!);
        });
      };

      connectAudio(localStream);
      connectAudio(remoteStream);
    } catch (err) {
      console.warn('[VIDEO_RECORDING] audio mixing failed, continuing without mixed audio:', err);
      this.audioContext = null;
      this.destination = null;
    }
  }

  private startVideoRecording(localStream: MediaStream, remoteStream: MediaStream): void {
    this.recordingType = 'video';
    const recordStream = this.buildVideoCompositionStream(localStream, remoteStream);
    this.mimeType = pickMimeType(VIDEO_MIME_CANDIDATES, 'video/webm');
    console.log(`[VIDEO_RECORDING] mimeType=${this.mimeType}`);

    try {
      this.mediaRecorder = new MediaRecorder(recordStream, { mimeType: this.mimeType });
    } catch {
      this.mimeType = pickMimeType(['video/webm'], 'video/webm');
      console.log(`[VIDEO_RECORDING] mimeType=${this.mimeType} (fallback)`);
      this.mediaRecorder = new MediaRecorder(recordStream, { mimeType: this.mimeType });
    }

    this.attachRecorderHandlers();
    this.mediaRecorder.start(1000);
  }

  private startAudioRecording(): void {
    this.recordingType = 'audio';
    const audioTracks = this.destination?.stream.getAudioTracks() ?? [];
    if (!audioTracks.length) {
      throw new Error('No mixed audio tracks for audio recording.');
    }

    const recordStream = new MediaStream([...audioTracks]);
    this.mimeType = pickMimeType(AUDIO_MIME_CANDIDATES, 'audio/webm');
    console.log(`[VIDEO_RECORDING] mimeType=${this.mimeType} recording_type=audio`);

    try {
      this.mediaRecorder = new MediaRecorder(recordStream, { mimeType: this.mimeType });
    } catch {
      this.mimeType = 'audio/webm';
      this.mediaRecorder = new MediaRecorder(recordStream);
    }

    this.attachRecorderHandlers();
    this.mediaRecorder.start(1000);
  }

  private attachRecorderHandlers(): void {
    this.chunks = [];
    this.startedAt = new Date();

    this.mediaRecorder!.ondataavailable = (event) => {
      console.log(`[VIDEO_RECORDING] dataavailable size=${event.data.size}`);
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
  }

  private buildVideoCompositionStream(
    localStream: MediaStream,
    remoteStream: MediaStream
  ): MediaStream {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;

    const localHasVideo = hasLiveTrack(localStream, 'video');
    const remoteHasVideo = hasLiveTrack(remoteStream, 'video');

    this.remoteVideoEl = document.createElement('video');
    this.remoteVideoEl.srcObject = remoteStream;
    this.remoteVideoEl.muted = true;
    this.remoteVideoEl.playsInline = true;
    void this.remoteVideoEl.play().catch(() => undefined);

    this.localVideoEl = document.createElement('video');
    this.localVideoEl.srcObject = localStream;
    this.localVideoEl.muted = true;
    this.localVideoEl.playsInline = true;
    void this.localVideoEl.play().catch(() => undefined);

    const ctx = this.canvas.getContext('2d');
    const drawPlaceholder = (
      x: number,
      y: number,
      w: number,
      h: number,
      label: string
    ) => {
      if (!ctx) return;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#888';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2);
    };

    const draw = () => {
      if (!ctx || !this.canvas) return;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      if (remoteHasVideo && this.remoteVideoEl && this.remoteVideoEl.readyState >= 2) {
        ctx.drawImage(this.remoteVideoEl, 0, 0, this.canvas.width, this.canvas.height);
      } else {
        drawPlaceholder(0, 0, this.canvas.width, this.canvas.height, 'Remote camera off');
      }

      const pipW = 240;
      const pipH = 180;
      const pipX = this.canvas.width - pipW - 24;
      const pipY = this.canvas.height - pipH - 24;

      if (localHasVideo && this.localVideoEl && this.localVideoEl.readyState >= 2) {
        ctx.drawImage(this.localVideoEl, pipX, pipY, pipW, pipH);
      } else {
        drawPlaceholder(pipX, pipY, pipW, pipH, 'Your camera off');
      }

      this.animationFrame = requestAnimationFrame(draw);
    };
    draw();

    const canvasStream = this.canvas.captureStream(30);
    this.composedStream = canvasStream;

    const mixedAudio = this.destination?.stream.getAudioTracks() ?? [];
    mixedAudio.forEach((track) => canvasStream.addTrack(track));

    if (!canvasStream.getVideoTracks().length && !canvasStream.getAudioTracks().length) {
      throw new Error('Composed stream has no tracks.');
    }

    return canvasStream;
  }

  async stop(): Promise<CallRecorderResult | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      this.cleanupInternal(true);
      return null;
    }

    const endedAt = new Date();
    const startedAt = this.startedAt ?? endedAt;

    const blob = await new Promise<Blob>((resolve, reject) => {
      const recorder = this.mediaRecorder!;
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: this.mimeType }));
      };
      recorder.onerror = () => reject(new Error('MediaRecorder failed during stop.'));
      try {
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
        recorder.stop();
      } catch (err) {
        reject(err);
      }
    });

    console.log(`[VIDEO_RECORDING] stopped blob_size=${blob.size}`);

    const durationSeconds = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
    const result: CallRecorderResult = {
      blob,
      mimeType: this.mimeType,
      recordingType: this.recordingType,
      startedAt,
      endedAt,
      durationSeconds,
    };

    this.cleanupInternal(true);
    return result;
  }

  private cleanupInternal(closeRecorder: boolean) {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (closeRecorder && this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        /* ignore */
      }
    }
    this.mediaRecorder = null;
    this.chunks = [];

    this.localVideoEl?.pause();
    this.remoteVideoEl?.pause();
    this.localVideoEl = null;
    this.remoteVideoEl = null;
    this.canvas = null;
    this.composedStream?.getTracks().forEach((t) => t.stop());
    this.composedStream = null;

    if (this.audioContext) {
      void this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }
    this.destination = null;
  }
}
