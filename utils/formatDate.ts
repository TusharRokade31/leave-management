export const formatDate = (dateString: string): string => {
  if (!dateString) return '';

  // Remove time zone part
  const onlyDate = dateString.split('T')[0]; // → "2025-12-14"

  const [year, month, day] = onlyDate.split('-');

  return `${day}/${month}/${year}`;
};