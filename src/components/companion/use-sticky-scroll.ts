"use client";

import * as React from "react";
import {
  readMetrics,
  type ScrollMetrics,
  shouldFollow,
} from "@/components/companion/scroll-follow";

const THRESHOLD = 80;

/**
 * Keep a transcript pinned to the bottom while the reader is there.
 *
 * Any deliberate upward gesture disarms following before the browser moves
 * the scroll position, so a growing answer does not yank a reader who is
 * reading back. `pinIfFollowing` is the per-chunk anchor; `pin` is the
 * "new messages" control.
 */
export function useStickyScroll<T extends HTMLElement>(
  resetKey?: unknown,
): {
  ref: (node: T | null) => void;
  following: boolean;
  arm: () => void;
  pin: () => void;
  pinIfFollowing: () => void;
  onScroll: () => void;
} {
  const [node, setNode] = React.useState<T | null>(null);
  const [following, setFollowing] = React.useState(true);
  const armedRef = React.useRef(true);
  const metricsRef = React.useRef<ScrollMetrics>({
    top: 0,
    height: 0,
    viewport: 0,
  });
  const frameRef = React.useRef<number | null>(null);

  const ref = React.useCallback((el: T | null) => setNode(el), []);

  const arm = React.useCallback(() => {
    armedRef.current = true;
    setFollowing(true);
  }, []);

  const pin = React.useCallback(() => {
    if (!node) return;
    node.scrollTop = node.scrollHeight;
    metricsRef.current = readMetrics(node);
    armedRef.current = true;
    setFollowing(true);
  }, [node]);

  const pinIfFollowing = React.useCallback(() => {
    if (armedRef.current) pin();
  }, [pin]);

  const onScroll = React.useCallback(() => {
    if (!node) return;
    const next = readMetrics(node);
    const follow = shouldFollow(
      metricsRef.current,
      next,
      armedRef.current,
      THRESHOLD,
    );
    metricsRef.current = next;
    armedRef.current = follow;
    setFollowing(follow);
  }, [node]);

  React.useEffect(() => {
    if (!node) return;
    let touchOrigin: number | null = null;
    const release = () => {
      armedRef.current = false;
      setFollowing(false);
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) release();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchOrigin = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (touchOrigin === null || y === undefined) return;
      if (y - touchOrigin > 4) {
        touchOrigin = y;
        release();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("button,a,summary,[role='button']")
      ) {
        release();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(
          event.key === "ArrowUp" ||
          event.key === "PageUp" ||
          event.key === "Home" ||
          (event.shiftKey && event.code === "Space")
        )
      ) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      release();
    };

    node.addEventListener("wheel", onWheel, { passive: true });
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: true });
    node.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);

    arm();
    frameRef.current = requestAnimationFrame(pin);

    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [node, arm, pin]);

  React.useLayoutEffect(() => {
    if (resetKey === undefined) return;
    arm();
    const frame = requestAnimationFrame(pin);
    return () => cancelAnimationFrame(frame);
  }, [resetKey, arm, pin]);

  return { ref, following, arm, pin, pinIfFollowing, onScroll };
}
