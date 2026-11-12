export interface ScrollMetrics {
  top: number;
  height: number;
  viewport: number;
}

export function readMetrics(el: HTMLElement): ScrollMetrics {
  return {
    top: el.scrollTop,
    height: el.scrollHeight,
    viewport: el.clientHeight,
  };
}

/**
 * Decide whether the log should stay pinned to the newest content.
 *
 * Content growth moves the maximum scroll position while the reader is
 * scrolling, so comparing only the new position against the bottom would read
 * a deliberate drag as "still following". The expected position is the old
 * position clamped to the new maximum: growth alone never looks like movement.
 */
export function shouldFollow(
  previous: ScrollMetrics,
  next: ScrollMetrics,
  armed: boolean,
  threshold = 80,
): boolean {
  const max = Math.max(0, next.height - next.viewport);
  const expected = Math.min(previous.top, max);
  const remaining = next.height - next.top - next.viewport;
  if (next.top < expected - 4) return false;
  if (remaining < threshold) return armed || next.top > expected + 4;
  if (next.top > expected + 4) return armed;
  if (next.height > previous.height + 1) return armed;
  return false;
}
