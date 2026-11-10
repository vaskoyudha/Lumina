/**
 * Warm the job corpus before a visitor opens the card.
 *
 * The scan is a network crawl, so it must not block server startup; the
 * scheduler's first tick is deferred. Edge gets nothing: the scanner, `pg`, and
 * the child process are Node-only.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { startPrewarm } = await import("@/lib/loker/prewarm");
    startPrewarm();
  } catch {
    // A crawl scheduler must never keep the app from serving requests.
  }
}
