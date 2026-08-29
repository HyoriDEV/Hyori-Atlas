export type DateFormatStyle = "compact" | "prefix-short" | "prefix-long";

export interface FormatDateOptions {
  style?: DateFormatStyle;
  withTime?: boolean;
  withYear?: boolean;
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

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const partsMap: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      partsMap[part.type] = part.value;
    }
  }

  const dayNum = parseInt(partsMap.day ?? "1", 10);
  const dayPadded = (partsMap.day ?? "01").padStart(2, "0");
  const monthNum = parseInt(partsMap.month ?? "1", 10);
  const monthPadded = (partsMap.month ?? "01").padStart(2, "0");
  const monthName = MONTH_NAMES_FR[monthNum - 1] ?? "";
  const year = parseInt(partsMap.year ?? "1970", 10);

  const hourNum = parseInt(partsMap.hour === "24" ? "0" : (partsMap.hour ?? "0"), 10);
  const minutesPadded = (partsMap.minute ?? "00").padStart(2, "0");
  const timeStr = `${hourNum}h${minutesPadded}`;

  const { style = "prefix-long", withTime = true, withYear = false } = options;

  let datePart = "";

  switch (style) {
    case "compact": {
      datePart = withYear ? `${dayPadded}/${monthPadded}/${year}` : `${dayPadded}/${monthPadded}`;
      break;
    }
    case "prefix-short": {
      datePart = withYear
        ? `Le ${dayPadded}/${monthPadded}/${year}`
        : `Le ${dayPadded}/${monthPadded}`;
      break;
    }
    case "prefix-long":
    default: {
      datePart = withYear ? `Le ${dayNum} ${monthName} ${year}` : `Le ${dayNum} ${monthName}`;
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

export function formatShortTime(dateInput: Date | string | number | null | undefined): string {
  if (dateInput === null || dateInput === undefined) return "";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const partsMap: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      partsMap[part.type] = part.value;
    }
  }

  const hourPadded = (partsMap.hour === "24" ? "00" : (partsMap.hour ?? "00")).padStart(2, "0");
  const minutesPadded = (partsMap.minute ?? "00").padStart(2, "0");
  return `${hourPadded}h${minutesPadded}`;
}
