export type DateFormatStyle = "compact" | "prefix-short" | "prefix-long" | "chat" | "time-only";

export interface FormatDateOptions {
  style?: DateFormatStyle;
  withTime?: boolean;
  withYear?: boolean;
  timeFormat?: "colon" | "h";
  fallback?: string;
}

const MONTH_NAMES_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const PARIS_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

interface ParisDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  yearStr: string;
  monthPadded: string;
  dayPadded: string;
  hourPadded: string;
  minutePadded: string;
}

function getParisParts(date: Date): ParisDateParts {
  const parts = PARIS_FORMATTER.formatToParts(date);
  let year = 1970;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;

  for (const part of parts) {
    if (part.type === "year") year = parseInt(part.value, 10);
    else if (part.type === "month") month = parseInt(part.value, 10);
    else if (part.type === "day") day = parseInt(part.value, 10);
    else if (part.type === "hour") hour = parseInt(part.value === "24" ? "0" : part.value, 10);
    else if (part.type === "minute") minute = parseInt(part.value, 10);
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
    yearStr: String(year),
    monthPadded: String(month).padStart(2, "0"),
    dayPadded: String(day).padStart(2, "0"),
    hourPadded: String(hour).padStart(2, "0"),
    minutePadded: String(minute).padStart(2, "0"),
  };
}

export function formatDate(
  dateInput: Date | string | number | null | undefined,
  options: FormatDateOptions = {}
): string {
  if (dateInput === null || dateInput === undefined) {
    return options.fallback ?? "—";
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (isNaN(date.getTime())) {
    return options.fallback ?? "—";
  }

  const targetParts = getParisParts(date);
  const { style = "prefix-long", withTime = true, withYear = false, timeFormat } = options;

  const defaultTimeSeparator = style === "chat" || style === "time-only" ? ":" : "h";
  const separator = timeFormat === "colon" ? ":" : timeFormat === "h" ? "h" : defaultTimeSeparator;
  const timeStr =
    separator === ":"
      ? `${targetParts.hourPadded}:${targetParts.minutePadded}`
      : `${targetParts.hour}h${targetParts.minutePadded}`;

  if (style === "time-only") {
    return timeStr;
  }

  if (style === "chat") {
    const nowParts = getParisParts(new Date());
    const targetUtc = Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day);
    const nowUtc = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
    const diffDays = Math.round((targetUtc - nowUtc) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Aujourd'hui à ${timeStr}`;
    }
    if (diffDays === -1) {
      return `Hier à ${timeStr}`;
    }
    if (diffDays === 1) {
      return `Demain à ${timeStr}`;
    }

    if (targetParts.year === nowParts.year && !withYear) {
      return `${targetParts.dayPadded}/${targetParts.monthPadded} ${timeStr}`;
    }

    return `${targetParts.dayPadded}/${targetParts.monthPadded}/${targetParts.yearStr} ${timeStr}`;
  }

  const monthName = MONTH_NAMES_FR[targetParts.month - 1] ?? "";
  const dayDisplay = targetParts.day === 1 ? "1er" : String(targetParts.day);
  let datePart = "";

  switch (style) {
    case "compact": {
      datePart = withYear
        ? `${targetParts.dayPadded}/${targetParts.monthPadded}/${targetParts.yearStr}`
        : `${targetParts.dayPadded}/${targetParts.monthPadded}`;
      break;
    }
    case "prefix-short": {
      datePart = withYear
        ? `Le ${targetParts.dayPadded}/${targetParts.monthPadded}/${targetParts.yearStr}`
        : `Le ${targetParts.dayPadded}/${targetParts.monthPadded}`;
      break;
    }
    case "prefix-long":
    default: {
      datePart = withYear
        ? `Le ${dayDisplay} ${monthName} ${targetParts.yearStr}`
        : `Le ${dayDisplay} ${monthName}`;
      break;
    }
  }

  if (withTime) {
    if (style === "compact") {
      return `${datePart} ${timeStr}`;
    }
    return `${datePart} à ${timeStr}`;
  }

  return datePart;
}

export function formatShortTime(
  dateInput: Date | string | number | null | undefined,
  options?: Omit<FormatDateOptions, "style">
): string {
  return formatDate(dateInput, { ...options, style: "time-only" });
}

export function formatChatDate(
  dateInput: Date | string | number | null | undefined,
  options?: Omit<FormatDateOptions, "style">
): string {
  return formatDate(dateInput, { ...options, style: "chat" });
}
