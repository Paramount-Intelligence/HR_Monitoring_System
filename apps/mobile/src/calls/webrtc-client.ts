import type { MediaStreamLike } from './media-stream-utils';
import { isWebRtcNativeAvailable } from './media-stream-utils';
import { normalizeIceCandidate, parseSignalPayload } from './signal-payload';
import { secureLog } from '../utils/secure-log';

export type SignalType = 'offer' | 'answer' | 'ice_candidate' | 'end';

export interface CallSignalPayload {
  id?: string;
  signal_type: SignalType | string;
  payload: unknown;
  sender_id?: string;
}

type RTCPeerConnectionLike = {
  close: () => void;
  addTrack: (track: unknown, stream: MediaStreamLike) => void;
  createOffer: () => Promise<{ sdp?: string; type?: string }>;
  createAnswer: () => Promise<{ sdp?: string; type?: string }>;
  setLocalDescription: (desc: unknown) => Promise<void>;
  setRemoteDescription: (desc: unknown) => Promise<void>;
  addIceCandidate: (candidate: unknown) => Promise<void>;
  onicecandidate: ((event: { candidate: unknown }) => void) | null;
  ontrack: ((event: { streams?: MediaStreamLike[] }) => void) | null;
  oniceconnectionstatechange: (() => void) | null;
  onconnectionstatechange?: (() => void) | null;
  connectionState?: string;
  iceConnectionState: string;
  remoteDescription: unknown;
};

type WebRtcPeerModule = {
  RTCPeerConnection: new (config: { iceServers: unknown[] }) => RTCPeerConnectionLike;
  RTCSessionDescription: new (desc: unknown) => unknown;
  RTCIceCandidate: new (desc: unknown) => unknown;
};

function getWebRtcPeer(): WebRtcPeerModule {
  if (!isWebRtcNativeAvailable()) {
    throw new Error('WebRTC requires an Expo development build.');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-webrtc');
}

/** Native WebRTC peer connection manager for voice/video calls. */
export class WebRTCClient {
  private pc: RTCPeerConnectionLike | null = null;
  private callId: string | null = null;
  private pendingCandidates: unknown[] = [];
  private processedSignalIds = new Set<string>();

  localStream: MediaStreamLike | null = null;
  remoteStream: MediaStreamLike | null = null;
  iceConnectionState = 'new';

  onIceStateChange: ((state: string) => void) | null = null;
  onRemoteStream: ((stream: MediaStreamLike) => void) | null = null;
  onIceCandidate: ((candidate: unknown) => void) | null = null;

  setCallId(callId: string): void {
    this.callId = callId;
  }

  private log(message: string): void {
    const suffix = this.callId ? ` call_id=${this.callId}` : '';
    secureLog('WEBRTC_MOBILE', `${message}${suffix}`);
  }

  async createPeerConnection(
    localStream: MediaStreamLike,
    iceServers: unknown[]
  ): Promise<void> {
    this.cleanupPeerConnection();
    this.localStream = localStream;

    const { RTCPeerConnection } = getWebRtcPeer();
    const pc = new RTCPeerConnection({ iceServers });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(normalizeIceCandidate(event.candidate));
      }
    };

    pc.oniceconnectionstatechange = () => {
      this.iceConnectionState = pc.iceConnectionState;
      this.log(`connection_state=${pc.iceConnectionState}`);
      this.onIceStateChange?.(pc.iceConnectionState);
    };

    pc.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!stream) return;
      this.remoteStream = stream;
      this.log('remote_stream_ready');
      this.onRemoteStream?.(stream);
    };

    pc.onconnectionstatechange = () => {
      const state = (pc as { connectionState?: string }).connectionState;
      if (state) {
        this.log(`connection_state=${state}`);
        if (state === 'connected') {
          this.onIceStateChange?.('connected');
        } else if (state === 'failed') {
          this.onIceStateChange?.('failed');
        }
      }
    };

    this.pc = pc;
    this.log('peer_created');
  }

  async createAndSendOffer(): Promise<unknown> {
    if (!this.pc) throw new Error('Peer connection not ready');
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.log('offer_created');
    return offer;
  }

  async handleRemoteOffer(
    offer: unknown,
    sendAnswer: (answer: unknown) => Promise<void>
  ): Promise<void> {
    if (!this.pc) throw new Error('Peer connection not ready');
    const { RTCSessionDescription } = getWebRtcPeer();
    const sdp = parseSignalPayload(offer);
    if (!this.pc.remoteDescription) {
      this.log('offer_received');
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await sendAnswer(answer);
      this.log('answer_created');
      await this.drainPendingCandidates();
    }
  }

  async handleRemoteAnswer(answer: unknown): Promise<void> {
    if (!this.pc) return;
    const { RTCSessionDescription } = getWebRtcPeer();
    const sdp = parseSignalPayload(answer);
    if (!this.pc.remoteDescription) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      this.log('answer_received');
      await this.drainPendingCandidates();
    }
  }

  async handleIceCandidate(candidate: unknown): Promise<void> {
    if (!this.pc) return;
    const { RTCIceCandidate } = getWebRtcPeer();
    const ice = normalizeIceCandidate(candidate);
    if (this.pc.remoteDescription && ice.candidate) {
      await this.pc.addIceCandidate(new RTCIceCandidate(ice));
      this.log('ice_candidate_received');
    } else if (ice.candidate) {
      this.pendingCandidates.push(ice);
    }
  }

  private async drainPendingCandidates(): Promise<void> {
    if (!this.pc) return;
    const { RTCIceCandidate } = getWebRtcPeer();
    while (this.pendingCandidates.length > 0) {
      const cand = this.pendingCandidates.shift();
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {
        /* ignore stale candidates */
      }
    }
  }

  async processSignal(
    sig: CallSignalPayload,
    role: 'caller' | 'callee',
    sendAnswer: (answer: unknown) => Promise<void>
  ): Promise<void> {
    const sigId =
      sig.id ?? `${sig.signal_type}-${JSON.stringify(sig.payload).slice(0, 40)}`;
    if (this.processedSignalIds.has(sigId)) return;
    this.processedSignalIds.add(sigId);

    if (sig.signal_type === 'offer' && role === 'callee') {
      await this.handleRemoteOffer(sig.payload, sendAnswer);
    } else if (sig.signal_type === 'answer' && role === 'caller') {
      await this.handleRemoteAnswer(sig.payload);
    } else if (sig.signal_type === 'ice_candidate') {
      await this.handleIceCandidate(sig.payload);
    }
  }

  toggleMute(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled;
  }

  toggleCamera(): boolean {
    const track = this.localStream?.getVideoTracks()[0];
    if (!track) return true;
    track.enabled = !track.enabled;
    return !track.enabled;
  }

  cleanupPeerConnection(): void {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.pendingCandidates = [];
    this.processedSignalIds.clear();
    this.iceConnectionState = 'new';
  }

  cleanup(callId?: string): void {
    this.cleanupPeerConnection();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.log(`cleanup${callId ? ` call_id=${callId}` : ''}`);
    this.callId = null;
  }
}

export const webrtcClient = new WebRTCClient();
