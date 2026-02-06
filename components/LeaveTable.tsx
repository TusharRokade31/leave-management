'use client';

import React from 'react';

interface LeaveRecord {
  leaves: any[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

const LeaveTable: React.FC<LeaveRecord> = ({ leaves, currentMonth, onMonthChange }) => {
  
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

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    onMonthChange(newDate);
  };

  const getDayOfWeek = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toLocaleDateString('default', { weekday: 'short' });
  };

  const isWeekendDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) return true;
    if (dayOfWeek === 6) {
      return day + 7 > daysInMonth;
    }
    return false;
  };

  return (
    // Applied transition-colors and dark:bg-slate-950/50
    <div className="w-full p-2 sm:p-6 bg-gray-50 dark:bg-slate-950/50 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 dark:border-slate-800">
        
        {/* Header - Updated to match Indigo theme in page.tsx */}
        <div className="bg-indigo-600 dark:bg-indigo-900/80 text-white p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Attendance History</h1>
            <div className="flex gap-2 bg-indigo-700/50 dark:bg-slate-950/30 p-1.5 rounded-xl backdrop-blur-sm">
              <button
                onClick={() => changeMonth(-1)}
                className="px-4 py-2 hover:bg-indigo-500 dark:hover:bg-indigo-800 rounded-lg transition-all font-bold text-sm"
              >
                ← Prev
              </button>
              <div className="px-4 py-2 font-black text-sm border-x border-indigo-400/30">
                {monthName}
              </div>
              <button
                onClick={() => changeMonth(1)}
                className="px-4 py-2 hover:bg-indigo-500 dark:hover:bg-indigo-800 rounded-lg transition-all font-bold text-sm"
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {/* Sticky columns background synced with dark mode */}
                <th className="sticky left-0 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 min-w-[80px] z-20 text-[10px] font-black uppercase text-gray-500 dark:text-slate-400">
                  ID
                </th>
                <th className="sticky left-[80px] bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 min-w-[150px] z-20 text-[10px] font-black uppercase text-gray-500 dark:text-slate-400">
                  Name
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <th
                    key={day}
                    className={`border border-gray-200 dark:border-slate-700 p-2 min-w-[45px] text-center transition-colors ${
                      isWeekendDay(day) 
                        ? 'bg-red-50 dark:bg-red-950/20' 
                        : 'bg-gray-50 dark:bg-slate-800/50'
                    }`}
                  >
                    <div className="font-black text-gray-800 dark:text-slate-200 text-xs">{day}</div>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                      {getDayOfWeek(day)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {leaves?.map((employee) => (
                <tr key={employee?.user?.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-3 font-bold text-xs text-gray-600 dark:text-slate-400 z-10 transition-colors">
                    #{employee?.user?.id}
                  </td>
                  <td className="sticky left-[80px] bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-3 font-black text-xs text-gray-800 dark:text-slate-200 z-10 transition-colors">
                    {employee?.user?.name}
                  </td>

                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dateKey = `${currentMonth.getFullYear()}-${String(
                      currentMonth.getMonth() + 1
                    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                    const normalize = (dateStr: string) => dateStr.split("T")[0];
                    
                    const leaveForDay = employee?.leaves?.find((leave: any) => {
                      const start = normalize(leave.startDate);
                      const end = normalize(leave.endDate);
                      return dateKey >= start && dateKey <= end;
                    });
                    
                    const isLeaveDay = !!leaveForDay;
                    const isWeekend = isWeekendDay(day);

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
                          border border-gray-100 dark:border-slate-800 p-1 text-center text-[10px] font-black transition-all
                          ${isWeekend ? "bg-red-50/50 dark:bg-red-950/10" : ""}
                          ${isLeaveDay && leaveForDay?.type === 'WORK_FROM_HOME' ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300" : ""} 
                          ${isLeaveDay && leaveForDay?.type !== 'WORK_FROM_HOME' ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300" : ""}
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

        {/* Legend - Themed */}
        <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-4">Leave Type Legend</h3>
          <div className="flex flex-wrap gap-6">
            <LegendItem color="bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800" label="Full/Half Day" symbol="F/H" />
            <LegendItem color="bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800" label="Work From Home" symbol="WFH" />
            <LegendItem color="bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900" label="Weekend" symbol="" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for cleaner Legend
const LegendItem = ({ color, label, symbol }: { color: string; label: string; symbol: string }) => (
  <div className="flex items-center gap-3">
    <div className={`w-8 h-8 ${color} border rounded-lg flex items-center justify-center text-[10px] font-black`}>
      {symbol}
    </div>
    <span className="text-[10px] font-black uppercase text-gray-600 dark:text-slate-400 tracking-tight">{label}</span>
  </div>
);

export default LeaveTable;