export const calculateDays = (start: Date, end: Date) => {
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 3600 * 24)) + 1;
};
