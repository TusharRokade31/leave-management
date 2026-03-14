export interface Holiday {
  date: string; // yyyy-mm-dd
  name: string;
  type: 'FIXED' | 'OPTIONAL';
  isHalfDay?: boolean;
}

export const HOLIDAY_DATA: Holiday[] = [
  // --- FIXED HOLIDAYS ---
  { date: '2026-01-01', name: 'New Year', type: 'FIXED' },
  { date: '2026-01-26', name: 'Republic Day', type: 'FIXED' },
  { date: '2026-03-03', name: 'Holi', type: 'FIXED' },
  { date: '2026-03-21', name: 'Id-ul-Fitr', type: 'FIXED', isHalfDay: true },
  { date: '2026-05-01', name: 'Maharashtra Day', type: 'FIXED' },
  { date: '2026-08-15', name: 'Independence Day', type: 'FIXED' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi', type: 'FIXED' },
  { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'FIXED' },
  // Diwali (9th to 11th Nov)
  { date: '2026-11-09', name: 'Diwali', type: 'FIXED' },
  { date: '2026-11-10', name: 'Diwali', type: 'FIXED' },
  { date: '2026-11-11', name: 'Diwali', type: 'FIXED' },
  { date: '2026-12-25', name: 'Christmas', type: 'FIXED', isHalfDay: true },

  // --- OPTIONAL HOLIDAYS ---
  { date: '2026-03-19', name: 'Gudi Padwa', type: 'OPTIONAL' },
  { date: '2026-04-03', name: 'Good Friday', type: 'OPTIONAL' },
  { date: '2026-05-27', name: 'Bakra Eid', type: 'OPTIONAL' },
  { date: '2026-08-26', name: 'Id-e-Milad', type: 'OPTIONAL' },
  { date: '2026-08-28', name: 'Raksha Bandhan', type: 'OPTIONAL' },
  { date: '2026-10-20', name: 'Dussehra', type: 'OPTIONAL' },
  // Durga Pooja Candidates
  { date: '2026-10-17', name: 'Durga Pooja', type: 'OPTIONAL' },
  { date: '2026-10-19', name: 'Durga Pooja', type: 'OPTIONAL' },
];

/**
 * Helper to find if a specific date is a holiday
 */
export const getHoliday = (date: Date | string) => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return HOLIDAY_DATA.find(h => h.date === dateStr);
};

/**
 * Helper to check if a range contains an optional holiday
 */
export const findOptionalInStates = (start: string, end: string) => {
  return HOLIDAY_DATA.filter(h => h.type === 'OPTIONAL' && h.date >= start && h.date <= end);
};