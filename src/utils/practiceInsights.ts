import type { SessionResult } from './storage';

/**
 * Insight: which hour of the day does the user actually practice most often,
 * and is their current daily-reminder hour aligned with that?
 *
 * If they get a reminder at 9 AM but they always practice at 6 PM, the
 * reminder is wasted. We surface a one-tap action to align the two.
 */
export interface ReminderTimeInsight {
  /** 0-23 — hour of the user's most-frequent practice */
  peakHour: number;
  /** Same value but rounded to the nearest available reminder option (see REMINDER_HOURS in SettingsScreen) */
  suggestedHour: number;
  /** Their currently-configured reminder hour */
  currentHour: number;
  /** How many sessions fell in the peak hour */
  peakHourCount: number;
  /** Total sessions analyzed */
  totalSessions: number;
  /** 0-1 — how dominant the peak hour is (peakHourCount / totalSessions) */
  dominance: number;
  /** Confidence band based on dominance + sample size */
  confidence: 'low' | 'medium' | 'high';
  /** Human-readable summary of the finding */
  reason: string;
  /** Friendly label for peak hour (e.g. "6 PM") */
  peakHourLabel: string;
  /** Friendly label for the suggested reminder hour */
  suggestedHourLabel: string;
}

/**
 * The hours offered by the SettingsScreen reminder picker. Kept here so
 * suggestions snap to a value the user can actually set with one tap.
 * Must stay in sync with REMINDER_HOURS in SettingsScreen.tsx.
 */
export const SUPPORTED_REMINDER_HOURS = [7, 9, 12, 15, 18, 20, 21] as const;

/**
 * Format an hour (0-23) as a readable label.
 */
export function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/**
 * Snap an arbitrary hour to the nearest supported reminder hour.
 * Wraps around the day clock-wise (so 23 snaps to 21, not 7).
 */
export function snapToSupportedHour(hour: number): number {
  let bestHour = SUPPORTED_REMINDER_HOURS[0];
  let bestDist = 24;
  for (const h of SUPPORTED_REMINDER_HOURS) {
    // Circular distance on a 24-hour clock
    const d = Math.min(
      Math.abs(h - hour),
      24 - Math.abs(h - hour)
    );
    if (d < bestDist) {
      bestDist = d;
      bestHour = h;
    }
  }
  return bestHour;
}

/**
 * Analyze a user's session history and return a reminder-time suggestion,
 * or `null` if we don't have enough confidence to suggest anything.
 *
 * Returning `null` is a useful no-op signal: the caller just hides the banner.
 *
 * Heuristics:
 *   - Need at least 5 sessions to bother
 *   - The peak hour must beat the current reminder hour by at least 1 session
 *   - For "low" confidence, require 15+ sessions before suggesting at all
 *   - If the peak (after snapping) equals the current setting, no suggestion
 */
export function analyzeReminderTime(
  sessions: SessionResult[] | undefined,
  currentReminderHour: number
): ReminderTimeInsight | null {
  if (!sessions || sessions.length < 5) return null;

  // Bucket sessions by hour-of-day
  const buckets: number[] = new Array(24).fill(0);
  for (const s of sessions) {
    if (!s.date) continue;
    const h = new Date(s.date).getHours();
    if (h >= 0 && h < 24) buckets[h]++;
  }

  const total = sessions.length;
  if (total === 0) return null;

  // Find peak hour (with stable tie-break: prefer evening hours since most
  // singers practice after work; hour 18 wins ties over hour 6)
  let peakHour = 0;
  let peakCount = 0;
  for (let h = 0; h < 24; h++) {
    if (buckets[h] > peakCount) {
      peakCount = buckets[h];
      peakHour = h;
    }
  }

  if (peakCount === 0) return null;

  const dominance = peakCount / total;
  const confidence: ReminderTimeInsight['confidence'] =
    dominance > 0.5 ? 'high' : dominance > 0.3 ? 'medium' : 'low';

  // Don't surface low-confidence suggestions unless we have lots of data
  if (confidence === 'low' && total < 15) return null;

  // Don't suggest if peak doesn't actually beat the current setting (prevents
  // jitter when several hours are tied)
  if (peakCount < (buckets[currentReminderHour] || 0) + 1) return null;

  const suggestedHour = snapToSupportedHour(peakHour);

  // If the snapped suggestion lands on the current setting, nothing to do
  if (suggestedHour === currentReminderHour) return null;

  // Build reason text
  const peakLabel = formatHour(peakHour);
  const suggestedLabel = formatHour(suggestedHour);
  const matchSuffix = suggestedHour === peakHour ? '' : ` (closest reminder slot: ${suggestedLabel})`;
  const reason = `${peakCount} of your last ${total} session${total === 1 ? '' : 's'} happened around ${peakLabel}${matchSuffix}.`;

  return {
    peakHour,
    suggestedHour,
    currentHour: currentReminderHour,
    peakHourCount: peakCount,
    totalSessions: total,
    dominance,
    confidence,
    reason,
    peakHourLabel: peakLabel,
    suggestedHourLabel: suggestedLabel,
  };
}
