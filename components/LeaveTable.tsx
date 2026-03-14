'use client';

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Info, Calendar, Sparkles } from 'lucide-react';
import { getHoliday } from '@/lib/holidays';

interface LeaveDay {
  startDate: string;
  endDate: string;
  type: 'FULL' | 'HALF' | 'EARLY' | 'WORK_FROM_HOME' | 'LATE';
  reason?: string;
}

interface EmployeeRecord {
  user: {
    id: number;
    name: string;
  };
  leaves: LeaveDay[];
}

interface LeaveRecordProps {
  leaves: EmployeeRecord[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

const LeaveTable: React.FC<LeaveRecordProps> = ({ leaves, currentMonth, onMonthChange }) => {
  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
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
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const normalizeDate = (dateStr: string) => dateStr.split('T')[0];

  // Extraction logic for the Summary Card
  const optionalLeaveSummary = useMemo(() => {
    const summary: { name: string; date: string; occasion: string }[] = [];
    
    leaves.forEach(emp => {
      emp.leaves.forEach(l => {
        if (l.reason?.includes('[OPTIONAL HOLIDAY:')) {
          const leaveDate = new Date(l.startDate);
          // Only show if it matches current view month
          if (leaveDate.getMonth() === currentMonth.getMonth() && leaveDate.getFullYear() === currentMonth.getFullYear()) {
            const occasion = l.reason.split('[OPTIONAL HOLIDAY:')[1].split(']')[0];
            summary.push({
              name: emp.user.name,
              date: normalizeDate(l.startDate),
              occasion: occasion
            });
          }
        }
      });
    });
    return summary;
  }, [leaves, currentMonth]);

  return (
    <div className="w-full p-2 sm:p-6 bg-gray-50 dark:bg-slate-950/20 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800/60">
        
        {/* --- HEADER --- */}
        <div className="bg-indigo-600 dark:bg-indigo-950/80 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                <Calendar className="w-5 h-5 text-indigo-100" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight uppercase italic leading-none">
                  Attendance <span className="text-indigo-300">History</span>
                </h1>
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-indigo-200 mt-1">Monthly Tracking</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-black/20 dark:bg-slate-950/60 p-1.5 rounded-[1.25rem] backdrop-blur-md border border-white/5">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-xl transition-all group">
                <ChevronLeft className="w-4 h-4 text-white group-active:scale-90" />
              </button>
              <div className="px-6 py-2 font-black text-xs uppercase tracking-widest min-w-[150px] text-center">
                {monthName}
              </div>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-xl transition-all group">
                <ChevronRight className="w-4 h-4 text-white group-active:scale-90" />
              </button>
            </div>
          </div>
        </div>

        {/* --- TABLE CONTENT --- */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-100 dark:scrollbar-thumb-slate-800">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/40">
                <th className="sticky left-0 top-0 bg-gray-50 dark:bg-slate-800 border-b border-r border-gray-100 dark:border-slate-800 p-4 min-w-[80px] z-30 text-[10px] font-black uppercase text-slate-400 tracking-widest">ID</th>
                <th className="sticky left-[80px] top-0 bg-gray-50 dark:bg-slate-800 border-b border-r border-gray-100 dark:border-slate-800 p-4 min-w-[180px] z-30 text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Employee</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <th key={day} className={`border-b border-r border-gray-100 dark:border-slate-800 p-2 min-w-[50px] text-center transition-colors ${isWeekendDay(day) ? 'bg-red-50/30 dark:bg-red-950/20' : 'bg-white dark:bg-slate-900/50'}`}>
                    <div className="font-black text-slate-800 dark:text-slate-200 text-xs">{day}</div>
                    <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{getDayOfWeek(day)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {leaves?.map((employee) => (
                <tr key={employee?.user?.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors group">
                  <td className="sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-indigo-50/40 dark:group-hover:bg-indigo-950/30 border-b border-r border-gray-50 dark:border-slate-800 p-4 font-bold text-xs text-slate-400 z-10 transition-colors">
                    #{employee?.user?.id}
                  </td>
                  <td className="sticky left-[80px] bg-white dark:bg-slate-900 group-hover:bg-indigo-50/40 dark:group-hover:bg-indigo-950/30 border-b border-r border-gray-50 dark:border-slate-800 p-4 font-black text-xs text-slate-800 dark:text-slate-200 z-10 transition-colors">
                    {employee?.user?.name}
                  </td>

                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const companyHoliday = getHoliday(dateKey);
                    const leaveForDay = employee?.leaves?.find((leave) => {
                      const start = normalizeDate(leave.startDate);
                      const end = normalizeDate(leave.endDate);
                      return dateKey >= start && dateKey <= end;
                    });
                    
                    const isLeaveDay = !!leaveForDay;
                    const isWeekend = isWeekendDay(day);
                    const isOptionalHolidayLeave = leaveForDay?.reason?.includes('[OPTIONAL HOLIDAY:');

                    let symbol = "";
                    let cellColor = "";

                    if (companyHoliday) {
                        symbol = companyHoliday.type === 'FIXED' ? "FIX" : "OPT";
                        cellColor = companyHoliday.type === 'FIXED' 
                            ? "bg-slate-200/50 dark:bg-slate-700/50 text-slate-500" 
                            : "bg-indigo-100/30 dark:bg-indigo-900/20 text-indigo-400 border-indigo-200 border-dashed border";
                    } else if (isLeaveDay) {
                        switch (leaveForDay.type?.toUpperCase()) {
                            case "FULL": symbol = "F"; break;
                            case "HALF": symbol = "H"; break;
                            case "EARLY": symbol = "E"; break;
                            case "WORK_FROM_HOME": symbol = "WFH"; break;
                            case "LATE": symbol = "L"; break;
                            default: symbol = "F"; 
                        }
                        cellColor = isOptionalHolidayLeave
                            ? "bg-indigo-600 text-white" 
                            : leaveForDay.type === 'WORK_FROM_HOME' 
                                ? "bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                                : "bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300";
                    }

                    return (
                      <td
                        key={day}
                        className={`border-b border-r border-gray-50 dark:border-slate-800/50 p-1 text-center text-[9px] font-black transition-all ${isWeekend && !symbol ? "bg-red-50/20 dark:bg-red-950/10" : ""} ${cellColor}`}
                      >
                        <span className={symbol ? "scale-110 inline-flex items-center justify-center gap-0.5" : "opacity-0"}>
                          {isOptionalHolidayLeave && <Sparkles size={8} />}
                          {symbol}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- DYNAMIC OPTIONAL HOLIDAY SUMMARY --- */}
        {optionalLeaveSummary.length > 0 && (
          <div className="p-6 bg-indigo-50/30 dark:bg-indigo-950/20 border-t border-indigo-100 dark:border-indigo-900/50">
             <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 dark:text-indigo-300">Optional Holidays Availed ({monthName})</h3>
             </div>
             <div className="flex flex-wrap gap-3">
                {optionalLeaveSummary.map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm flex items-center gap-3">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</span>
                       <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{item.occasion}</span>
                    </div>
                    <div className="h-6 w-[1px] bg-slate-100 dark:bg-slate-700" />
                    <span className="text-[10px] font-black text-slate-400">{item.date.split('-')[2]} {monthName.slice(0, 3)}</span>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- LEGEND --- */}
        <div className="p-8 bg-gray-50/50 dark:bg-slate-900/80 border-t border-gray-100 dark:border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-6">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Attendance Keys</h3>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-6">
            <LegendItem color="bg-emerald-100/60 text-emerald-600" label="Physical Leave" symbol="F/H/E/L" />
            <LegendItem color="bg-blue-100/60 text-blue-600" label="Remote Work" symbol="WFH" />
            <LegendItem color="bg-slate-200 text-slate-500" label="Fixed Holiday" symbol="FIX" />
            <LegendItem color="bg-indigo-600 text-white" label="Used Optional" symbol="✨ OPT" />
            <LegendItem color="bg-red-50/50 border-red-100" label="Weekend" symbol="" />
          </div>
        </div>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label, symbol }: { color: string; label: string; symbol: string }) => (
  <div className="flex items-center gap-3 group cursor-default">
    <div className={`w-9 h-9 ${color} border rounded-[0.75rem] flex items-center justify-center text-[10px] font-black shadow-sm transition-transform group-hover:scale-110`}>
      {symbol}
    </div>
    <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-tight group-hover:text-indigo-600 transition-colors">
      {label}
    </span>
  </div>
);

export default LeaveTable;