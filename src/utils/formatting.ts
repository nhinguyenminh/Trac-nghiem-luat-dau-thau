/**
 * Format a duration in seconds to HH:MM:SS.
 */
export function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds)
  const h = Math.floor(safeSeconds / 3600)
  const m = Math.floor((safeSeconds % 3600) / 60)
  const s = safeSeconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":")
}

/**
 * Format a duration in milliseconds to a human-readable string (e.g. "2m 34s").
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s"
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const remSec = sec % 60
  return `${min}m ${remSec}s`
}
