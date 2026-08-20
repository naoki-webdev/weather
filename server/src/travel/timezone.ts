export class TravelDateTimeError extends Error {}

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

export function parseTravelDateTime(value: string | Date | undefined, timeZone: string): Date {
  if (value === undefined) return new Date();
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new TravelDateTimeError("出発予定時刻の形式が正しくありません。");
    return value;
  }

  const absolute = new Date(value);
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    if (!Number.isFinite(absolute.getTime())) throw new TravelDateTimeError("出発予定時刻の形式が正しくありません。");
    return absolute;
  }

  const match = value.match(LOCAL_DATE_TIME_PATTERN);
  if (!match) throw new TravelDateTimeError("出発予定時刻の形式が正しくありません。");

  const [, year, month, day, hour, minute, second = "0", milliseconds = "0"] = match;
  const wallClockMs = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), Number(milliseconds.padEnd(3, "0")));
  if (!Number.isFinite(wallClockMs)) throw new TravelDateTimeError("出発予定時刻の形式が正しくありません。");

  let instantMs = wallClockMs;
  try {
    for (let iteration = 0; iteration < 4; iteration += 1) {
      const local = localParts(new Date(instantMs), timeZone);
      const localAsUtcMs = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second, local.millisecond);
      instantMs += wallClockMs - localAsUtcMs;
    }
  } catch {
    throw new TravelDateTimeError("都市のタイムゾーンを解釈できません。");
  }

  return new Date(instantMs);
}

function localParts(date: Date, timeZone: string) {
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
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second, millisecond: date.getUTCMilliseconds() };
}

