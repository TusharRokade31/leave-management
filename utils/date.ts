// utils/date.ts

/**
 * Calculates the inclusive number of days between two dates.
 */
export const calculateDays = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Ensures only the current date (today) is editable.
 * Resets time to midnight to ensure the comparison is date-only.
 */
export const canEditDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  // Strictly checks if the target date is today
  return target.getTime() === today.getTime();
};

/**
 * Checks if a given date is in the future relative to today.
 */
export const isFutureDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return target > today;
};