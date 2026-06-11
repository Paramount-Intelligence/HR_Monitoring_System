'use client';

import { useEffect, RefObject } from 'react';

/** Attach a MediaStream to a video/audio element whenever the ref mounts or stream updates. */
export function useAttachMediaStream(
  ref: RefObject<HTMLVideoElement | HTMLAudioElement | null>,
  stream: MediaStream | null,
  deps: unknown[] = []
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      if ('play' in el) {
        void el.play().catch(() => undefined);
      }
    } else {
      el.srcObject = null;
    }
  }, [ref, stream, ...deps]);
}

/** Callback ref factory — attaches stream when DOM node mounts or stream updates. */
export function createMediaRefCallback(
  stream: MediaStream | null,
  existingRef: RefObject<HTMLVideoElement | HTMLAudioElement | null>
) {
  return (node: HTMLVideoElement | HTMLAudioElement | null) => {
    existingRef.current = node;
    if (node && stream) {
      if (node.srcObject !== stream) {
        node.srcObject = stream;
        void node.play().catch(() => undefined);
      }
    } else if (node && !stream) {
      node.srcObject = null;
    }
  };
}
