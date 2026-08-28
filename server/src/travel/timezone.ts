export class TravelDateTimeError extends Error {}

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const INVALID_DATE_TIME_MESSAGE = "出発予定時刻の形式が正しくありません。";
const INVALID_LOCAL_TIME_MESSAGE = "指定した出発時刻は、都市のタイムゾーンで存在しないか一意に解釈できません。";
const OFFSET_PROBE_HOURS = [-48, -24, -6, -2, -1, 0, 1, 2, 6, 24, 48];

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

export function parseTravelDateTime(value: string | Date | undefined, timeZone: string): Date {
  if (value === undefined) return new Date();
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new TravelDateTimeError(INVALID_DATE_TIME_MESSAGE);
    return value;
  }

  const absolute = new Date(value);
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    if (!Number.isFinite(absolute.getTime())) throw new TravelDateTimeError(INVALID_DATE_TIME_MESSAGE);
    return absolute;
  }

  const match = value.match(LOCAL_DATE_TIME_PATTERN);
  if (!match) throw new TravelDateTimeError(INVALID_DATE_TIME_MESSAGE);

  const [, year, month, day, hour, minute, second = "0", milliseconds = "0"] = match;
  const local = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(milliseconds.padEnd(3, "0")),
  } satisfies LocalDateTimeParts;
  const wallClockMs = timestampFromParts(local);
  if (wallClockMs === null) throw new TravelDateTimeError(INVALID_DATE_TIME_MESSAGE);

  try {
    return new Date(resolveLocalDateTime(wallClockMs, timeZone));
  } catch (error) {
    if (error instanceof TravelDateTimeError) throw error;
    throw new TravelDateTimeError("都市のタイムゾーンを解釈できません。");
  }
}

function resolveLocalDateTime(wallClockMs: number, timeZone: string) {
  let approximateInstantMs = wallClockMs;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const local = localParts(new Date(approximateInstantMs), timeZone);
    const localAsUtcMs = timestampFromParts(local);
    if (localAsUtcMs === null) throw new TravelDateTimeError(INVALID_LOCAL_TIME_MESSAGE);
    approximateInstantMs += wallClockMs - localAsUtcMs;
  }

  const offsets = new Set<number>();
  for (const probeHours of OFFSET_PROBE_HOURS) {
    const instant = new Date(approximateInstantMs + probeHours * 60 * 60_000);
    const local = localParts(instant, timeZone);
    const localAsUtcMs = timestampFromParts(local);
    if (localAsUtcMs !== null) offsets.add(localAsUtcMs - instant.getTime());
  }

  const candidates = [...offsets]
    .map((offset) => wallClockMs - offset)
    .filter((candidate, index, values) => values.indexOf(candidate) === index)
    .filter((candidate) => {
      const local = localParts(new Date(candidate), timeZone);
      return timestampFromParts(local) === wallClockMs;
    });

  if (candidates.length !== 1) throw new TravelDateTimeError(INVALID_LOCAL_TIME_MESSAGE);
  return candidates[0];
}

function localParts(date: Date, timeZone: string): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
    millisecond: date.getUTCMilliseconds(),
  };
}

function timestampFromParts(parts: LocalDateTimeParts): number | null {
  if (
    parts.year < 1 || parts.year > 9999
    || parts.month < 1 || parts.month > 12
    || parts.day < 1 || parts.day > 31
    || parts.hour < 0 || parts.hour > 23
    || parts.minute < 0 || parts.minute > 59
    || parts.second < 0 || parts.second > 59
    || parts.millisecond < 0 || parts.millisecond > 999
  ) return null;

  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, parts.second, parts.millisecond);

  return date.getUTCFullYear() === parts.year
    && date.getUTCMonth() === parts.month - 1
    && date.getUTCDate() === parts.day
    && date.getUTCHours() === parts.hour
    && date.getUTCMinutes() === parts.minute
    && date.getUTCSeconds() === parts.second
    && date.getUTCMilliseconds() === parts.millisecond
    ? date.getTime()
    : null;
}
