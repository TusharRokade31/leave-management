// components/LeaveTable.tsx
'use client';

import React from 'react';

interface LeaveRecord {
  leaves: any[]; // Using any to handle the structure from your API, strictly it should be User with leaves
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

const LeaveTable: React.FC<LeaveRecord> = ({ leaves, currentMonth, onMonthChange }) => {
  
  // Get days in current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  });

  // Navigate months
  const changeMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    onMonthChange(newDate); // Notify parent
  };

  // Get day of week string (e.g., "Mon", "Sun")
  const getDayOfWeek = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    return date.toLocaleDateString('default', { weekday: 'short' });
  };

  // Check if a specific day is a Weekend (Sunday OR Last Saturday)
  const isWeekendDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday

    // 1. Sunday is always a weekend
    if (dayOfWeek === 0) return true;

    // 2. Check for Last Saturday
    if (dayOfWeek === 6) {
      // If adding 7 days goes beyond the total days in month, it's the last one
      return day + 7 > daysInMonth;
    }

    return false;
  };

  return (
    <div className="w-full p-6 bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Leave Management</h1>
            <div className="flex gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded"
              >
                ← Previous
              </button>
              <button
                onClick={() => changeMonth(1)}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded"
              >
                Next →
              </button>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-center">{monthName}</h2>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {/* Days row */}
              <tr>
                <th className="sticky left-0 bg-gray-100 border border-gray-300 p-2 min-w-[150px] z-10">
                  Employee Id
                </th>
                <th className="sticky left-0 bg-gray-100 border border-gray-300 p-2 min-w-[150px] z-10">
                  Employee Name
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1)?.map((day) => (
                  <th
                    key={day}
                    className={`border border-gray-300 p-2 min-w-[40px] text-center ${
                      isWeekendDay(day) ? 'bg-red-50' : 'bg-gray-100'
                    }`}
                  >
                    <div className="font-bold">{day}</div>
                    <div className="text-xs text-gray-600">
                      {getDayOfWeek(day)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
           {leaves?.map((employee) => (
            <tr key={employee?.user?.id} className="hover:bg-gray-50">

              {/* Employee ID */}
              <td className="sticky left-0 bg-white border border-gray-300 p-2 font-medium z-10">
                {employee?.user?.id}
              </td>

              {/* Employee Name */}
              <td className="sticky left-0 bg-white border border-gray-300 p-2 font-medium z-10">
                {employee?.user?.name}
              </td>

              {/* CALENDAR CELLS */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1)?.map((day) => {
                // Build yyyy-mm-dd
                const dateKey = `${currentMonth.getFullYear()}-${String(
                  currentMonth.getMonth() + 1
                ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                // Remove time from ISO date string
                const normalize = (dateStr: string) => dateStr.split("T")[0];
                
                // Check if employee has leave on this day
                const leaveForDay = (employee as any)?.leaves?.find((leave: Leave) => {
                  const start = normalize(leave.startDate);
                  const end = normalize(leave.endDate);
                  return dateKey >= start && dateKey <= end;
                });
                
                const isLeaveDay = !!leaveForDay;
                const isWeekend = isWeekendDay(day);

                // Determine symbol
                let symbol = "";
                if (isLeaveDay) {
                  switch (leaveForDay.type?.toUpperCase()) {
                    case "FULL": symbol = "F"; break;
                    case "HALF": symbol = "H"; break;
                    case "EARLY": symbol = "E"; break;
                    case "WORK_FROM_HOME": symbol = "WFH"; break;
                    case "LATE": symbol = "L"; break;
                    default: symbol = "F"; 
                  }
                }

                return (
                <td
                  key={day}
                  className={`
                    border border-gray-300 p-1 text-center cursor-pointer hover:bg-blue-50
                    ${isWeekend ? "bg-red-50" : ""}
                    ${isLeaveDay && leaveForDay?.type === 'WORK_FROM_HOME' ? "bg-blue-200 font-bold text-xs" : ""} 
                    ${isLeaveDay && leaveForDay?.type !== 'WORK_FROM_HOME' ? "bg-green-200 font-bold" : ""}
                  `}
                >
                  {symbol}
                </td>
                );
              })}
            </tr>
          ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-4 bg-gray-50 border-t">
          <h3 className="font-semibold mb-2">Leave Types:</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-200 border"></div>
              <span>F - Full Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-200 border"></div>
              <span>H - Half Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-pink-200 border"></div>
              <span>E - Early Leave</span>
            </div>
             <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-200 border"></div>
              <span>WFH - Work From Home</span>
            </div>
             {/* Weekend Legend */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-50 border"></div>
              <span>Weekend (Sun & Last Sat)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveTable;