export type RecordingStatus =
  | 'idle'
  | 'preparing'
  | 'recording'
  | 'stopping'
  | 'uploading'
  | 'uploaded'
  | 'failed';

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

function pickMimeType(preferVideo: boolean): string {
  const ordered = preferVideo
    ? ['video/webm;codecs=vp8,opus', 'video/webm', 'audio/webm;codecs=opus', 'audio/webm']
    : MIME_CANDIDATES;
  for (const mime of ordered) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return preferVideo ? 'video/webm' : 'audio/webm';
}

function hasAudioTrack(stream: MediaStream | null): boolean {
  return Boolean(stream?.getAudioTracks().length);
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
  private composeInterval: ReturnType<typeof setInterval> | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private animationFrame: number | null = null;
  private localVideoEl: HTMLVideoElement | null = null;
  private remoteVideoEl: HTMLVideoElement | null = null;
  private composedStream: MediaStream | null = null;

  start(options: CallRecorderOptions): void {
    const { callType, localStream, remoteStream } = options;
    this.cleanupInternal(false);

    if (!hasAudioTrack(localStream) && !hasAudioTrack(remoteStream)) {
      throw new Error('No audio tracks available for recording.');
    }

    this.audioContext = new AudioContext();
    this.destination = this.audioContext.createMediaStreamDestination();

    const connectAudio = (stream: MediaStream) => {
      stream.getAudioTracks().forEach((track) => {
        const source = this.audioContext!.createMediaStreamSource(new MediaStream([track]));
        source.connect(this.destination!);
      });
    };

    connectAudio(localStream);
    connectAudio(remoteStream);

    const remoteHasVideo =
      callType === 'video' && remoteStream.getVideoTracks().some((t) => t.readyState === 'live');
    const localHasVideo =
      callType === 'video' && localStream.getVideoTracks().some((t) => t.readyState === 'live');

    let recordStream: MediaStream;

    if (remoteHasVideo) {
      this.recordingType = 'video';
      recordStream = this.buildVideoCompositionStream(localStream, remoteStream, localHasVideo);
    } else {
      this.recordingType = 'audio';
      recordStream = new MediaStream([...this.destination.stream.getAudioTracks()]);
    }

    this.mimeType = pickMimeType(this.recordingType === 'video');
    this.mediaRecorder = new MediaRecorder(recordStream, { mimeType: this.mimeType });
    this.chunks = [];
    this.startedAt = new Date();

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.start(1000);
  }

  private buildVideoCompositionStream(
    localStream: MediaStream,
    remoteStream: MediaStream,
    localHasVideo: boolean
  ): MediaStream {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;

    this.remoteVideoEl = document.createElement('video');
    this.remoteVideoEl.srcObject = remoteStream;
    this.remoteVideoEl.muted = true;
    this.remoteVideoEl.playsInline = true;
    void this.remoteVideoEl.play().catch(() => undefined);

    if (localHasVideo) {
      this.localVideoEl = document.createElement('video');
      this.localVideoEl.srcObject = localStream;
      this.localVideoEl.muted = true;
      this.localVideoEl.playsInline = true;
      void this.localVideoEl.play().catch(() => undefined);
    }

    const ctx = this.canvas.getContext('2d');
    const draw = () => {
      if (!ctx || !this.canvas) return;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      if (this.remoteVideoEl && this.remoteVideoEl.readyState >= 2) {
        ctx.drawImage(this.remoteVideoEl, 0, 0, this.canvas.width, this.canvas.height);
      }

      if (this.localVideoEl && this.localVideoEl.readyState >= 2) {
        const pipW = 240;
        const pipH = 180;
        ctx.drawImage(
          this.localVideoEl,
          this.canvas.width - pipW - 24,
          this.canvas.height - pipH - 24,
          pipW,
          pipH
        );
      }

      this.animationFrame = requestAnimationFrame(draw);
    };
    draw();

    const canvasStream = this.canvas.captureStream(15);
    this.composedStream = canvasStream;
    this.destination!.stream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
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
        recorder.stop();
      } catch (err) {
        reject(err);
      }
    });

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
    if (this.composeInterval) {
      clearInterval(this.composeInterval);
      this.composeInterval = null;
    }
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
