import { formatDate, type FormatDateOptions } from "@/lib/date";

export interface FormattedDateProps extends FormatDateOptions {
  date: Date | string | number | null | undefined;
  className?: string;
}

export function FormattedDate({
  date,
  style,
  withTime,
  withYear,
  fallback,
  className,
}: FormattedDateProps) {
  const text = formatDate(date, { style, withTime, withYear, fallback });
  const parsedDate = date ? new Date(date) : null;
  const isoString =
    parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : undefined;

  return (
    <time dateTime={isoString} className={className}>
      {text}
    </time>
  );
}
