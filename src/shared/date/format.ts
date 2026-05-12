const CN_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

const CN_MONTHS = [
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
  '十',
  '十一',
  '十二',
] as const;

export const formatChineseMonth = (month: number): string => CN_MONTHS[month - 1] ?? String(month);

export const formatChineseDay = (day: number): string => {
  if (day < 1 || day > 31) return String(day);
  if (day < 10) return CN_DIGITS[day] ?? String(day);
  if (day === 10) return '十';
  if (day < 20) return `十${CN_DIGITS[day - 10] ?? ''}`;
  if (day === 20) return '二十';
  if (day < 30) return `二十${CN_DIGITS[day - 20] ?? ''}`;
  if (day === 30) return '三十';
  return `三十${CN_DIGITS[day - 30] ?? ''}`;
};

export const formatChineseDate = (month: number, day: number): string =>
  `${formatChineseMonth(month)}月${formatChineseDay(day)}日`;
