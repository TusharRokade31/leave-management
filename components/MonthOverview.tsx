"use client";

import React, { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isBefore, startOfDay, isValid } from "date-fns";
import { CheckCircle2, AlertCircle, Coffee, Zap, TrendingUp } from "lucide-react";
import { getHoliday } from "@/lib/holidays";

interface Props {
  tasks: Record<string, any>;
  leaves: any[];
  currentMonth: Date;
}

const MonthOverview = ({ tasks, leaves, currentMonth }: Props) => {
  const data = useMemo(() => {
    const safeCurrentMonth = isValid(currentMonth) ? currentMonth : new Date();
    const start = startOfMonth(safeCurrentMonth);
    const end = endOfMonth(safeCurrentMonth);
    const daysInMonth = eachDayOfInterval({ start, end });
    const today = startOfDay(new Date());

    const stats = {
      logged: 0,
      notLogged: 0,
      fullLeave: [] as string[],
      halfLeave: [] as string[],
      earlyLeave: [] as string[],
      lateLeave: [] as string[],
      wfh: [] as string[],
      fixedHolidays: [] as { name: string; date: string }[],
      optionalHolidays: [] as { name: string; date: string }[],
    };

    daysInMonth.forEach((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      const dayName = format(day, "dd MMM");
      const holiday = getHoliday(dateKey);
      
      const leave = leaves.find((l) => {
        if (!l.startDate || !l.endDate) return false;
        const s = format(new Date(l.startDate), "yyyy-MM-dd");
        const e = format(new Date(l.endDate), "yyyy-MM-dd");
        return l.status === "APPROVED" && dateKey >= s && dateKey <= e;
      });

      const task = tasks[dateKey];
      const hasRealContent = task?.content && task.content !== "<p><br></p>";

      if (hasRealContent) {
        stats.logged++;
      } else if (isBefore(day, today) && !holiday && !isWeekend(day) && !leave) {
        stats.notLogged++;
      }

      if (holiday) {
        if (holiday.type === "FIXED") stats.fixedHolidays.push({ name: holiday.name, date: dayName });
        else stats.optionalHolidays.push({ name: holiday.name, date: dayName });
      }

      if (leave) {
        const type = (leave.type || "").toUpperCase();
        if (type.includes("WFH")) stats.wfh.push(dayName);
        else if (type.includes("FULL")) stats.fullLeave.push(dayName);
        else if (type.includes("HALF")) stats.halfLeave.push(dayName);
        else if (type.includes("EARLY")) stats.earlyLeave.push(dayName);
        else if (type.includes("LATE")) stats.lateLeave.push(dayName);
      }
    });

    return stats;
  }, [tasks, leaves, currentMonth]);

  if (!isValid(currentMonth)) return null;

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl w-full transition-all">
      {/* Header Section */}
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-900 pb-4">
        <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md shadow-indigo-500/10">
          <TrendingUp size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Month Overview
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {format(currentMonth, "MMMM yyyy")}
          </p>
        </div>
      </div>

      <div className="flex flex-row gap-6 items-start">
        {/* Left Column: Essential Metrics */}
        <div className="w-1/3 flex flex-col gap-4">
          <StatCard 
            icon={<CheckCircle2 size={18} />} 
            label="Tasks Logged" 
            value={data.logged} 
            colorVariant="emerald"
          />
          <StatCard 
            icon={<AlertCircle size={18} />} 
            label="Logs Pending" 
            value={data.notLogged} 
            colorVariant="rose"
          />
        </div>

        {/* Right Column: Detailed Breakdown */}
        <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-5 border border-slate-100 dark:border-slate-800 space-y-6">
          <DetailRow label="Full Leaves" dates={data.fullLeave} color="bg-red-500" />
          <DetailRow label="Half Days" dates={data.halfLeave} color="bg-orange-500" />
          <DetailRow label="Early/Late Logs" dates={[...data.earlyLeave, ...data.lateLeave]} color="bg-amber-500" />
          <DetailRow label="WFH Mode" dates={data.wfh} color="bg-indigo-600" />

          {/* Compact Holidays */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
             <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-2">
                  <Coffee size={14} /> Fixed Holidays
                </span>
                <div className="flex flex-wrap gap-2">
                  {data.fixedHolidays.length > 0 ? data.fixedHolidays.map((h, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                      {h.date}
                    </div>
                  )) : <span className="text-xs text-slate-400 italic">None scheduled</span>}
                </div>
             </div>

             <div>
                <span className="text-xs font-bold text-indigo-500 flex items-center gap-2 mb-2">
                  <Zap size={14} /> Optional Holidays
                </span>
                <div className="flex flex-wrap gap-2">
                  {data.optionalHolidays.length > 0 ? data.optionalHolidays.map((h, i) => (
                    <div key={i} className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 px-2.5 py-1 rounded text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {h.date}
                    </div>
                  )) : <span className="text-xs text-slate-400 italic">None available</span>}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, colorVariant }: any) => {
  const styles = {
    emerald: "text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10",
    rose: "text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10"
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all ${styles[colorVariant as keyof typeof styles]}`}>
      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 shadow-sm mb-2">
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-80 mb-1">{label}</p>
      <span className="text-3xl font-bold leading-none">{value}</span>
    </div>
  );
};

const DetailRow = ({ label, dates, color }: any) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-center px-0.5">
      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-[11px] font-semibold text-slate-500 bg-white dark:bg-slate-800 px-2 rounded border border-slate-100 dark:border-slate-800 shadow-sm">
        {dates.length}
      </span>
    </div>
    <div className="flex flex-wrap gap-2 min-h-[12px]">
      {dates.length > 0 ? dates.map((d: string, i: number) => (
        <span key={i} className={`px-2 py-1 ${color} text-white rounded text-xs font-bold shadow-sm`}>
          {d}
        </span>
      )) : (
        <div className="w-full h-px bg-slate-200 dark:bg-slate-800 opacity-40" />
      )}
    </div>
  </div>
);

export default MonthOverview;