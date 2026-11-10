const START_MINUTES = 16 * 60 + 42;
const MINUTES_PER_DAY = 24 * 60;

/**
 * Deterministic display clock for the simulation transcript.
 * The scenario stores no timestamps, so each revealed entry advances the
 * narrative clock by one minute. Kept pure so the render is stable in tests.
 */
export function messageClock(index: number): string {
  const offset = Number.isFinite(index) ? Math.max(0, Math.trunc(index)) : 0;
  const minutes = (START_MINUTES + offset) % MINUTES_PER_DAY;
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}.${mm}`;
}
