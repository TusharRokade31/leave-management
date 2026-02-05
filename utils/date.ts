// utils/date.ts

export const calculateDays = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
};

export const canEditDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diff =
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24);

  return diff >= 0 && diff <= 2;
};

export const isFutureDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return target > today;
};
