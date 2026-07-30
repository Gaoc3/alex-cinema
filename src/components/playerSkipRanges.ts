export interface IntroSkipRange {
  start: string | number;
  end: string | number;
  control_level?: string | number;
}

export interface ParentalSkippingDurations {
  start?: Array<string | number> | null;
  end?: Array<string | number> | null;
}

export type ParentSkippingFlag = boolean | string | number | null | undefined;
export type SkipSegmentKind = 'intro' | 'outro';

export interface PlayerSkipSegment {
  start: number;
  end: number;
  kind: SkipSegmentKind;
}

const OUTRO_START_RATIO = 0.75;
const OUTRO_MAX_LEAD_SECONDS = 15 * 60;

const toFiniteSeconds = (value: string | number | null | undefined) => {
  const seconds = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(seconds) ? seconds : null;
};

const isTimeInsideRange = (time: number, start: number, end: number) => (
  Number.isFinite(time) && time >= start && time < end
);

export function isParentSkippingEnabled(flag: ParentSkippingFlag) {
  if (typeof flag === 'boolean') return flag;
  if (typeof flag === 'number') return flag === 1;
  return typeof flag === 'string' && flag.trim() === '1';
}

export function getIntroAndOutroSegments(
  ranges: IntroSkipRange[] | null | undefined,
  duration: number,
): PlayerSkipSegment[] {
  if (!Array.isArray(ranges)) return [];

  const outroBoundary = Number.isFinite(duration) && duration > 0
    ? Math.max(
        duration * OUTRO_START_RATIO,
        duration - OUTRO_MAX_LEAD_SECONDS,
      )
    : Number.POSITIVE_INFINITY;

  return ranges
    .map((range): PlayerSkipSegment | null => {
      const start = toFiniteSeconds(range?.start);
      const rawEnd = toFiniteSeconds(range?.end);
      if (start === null || rawEnd === null || start < 0) return null;
      const end = Number.isFinite(duration) && duration > 0
        ? Math.min(rawEnd, duration)
        : rawEnd;
      if (end <= start) return null;

      return {
        start,
        end,
        kind: start >= outroBoundary ? 'outro' : 'intro',
      };
    })
    .filter((range): range is PlayerSkipSegment => range !== null)
    .sort((a, b) => a.start - b.start);
}

export function findActiveIntroOrOutro(
  ranges: IntroSkipRange[] | null | undefined,
  time: number,
  duration: number,
) {
  return getIntroAndOutroSegments(ranges, duration).find(
    (range) => isTimeInsideRange(time, range.start, range.end),
  ) ?? null;
}

export function findActiveParentalSkip(
  durations: ParentalSkippingDurations | null | undefined,
  time: number,
  duration = Number.POSITIVE_INFINITY,
) {
  const starts = Array.isArray(durations?.start) ? durations.start : [];
  const ends = Array.isArray(durations?.end) ? durations.end : [];
  const rangeCount = Math.min(starts.length, ends.length);

  for (let index = 0; index < rangeCount; index += 1) {
    const start = toFiniteSeconds(starts[index]);
    const rawEnd = toFiniteSeconds(ends[index]);
    if (start === null || rawEnd === null || start < 0) continue;
    const end = Number.isFinite(duration) && duration > 0
      ? Math.min(rawEnd, duration)
      : rawEnd;
    if (end <= start) continue;
    if (isTimeInsideRange(time, start, end)) return { start, end };
  }

  return null;
}
