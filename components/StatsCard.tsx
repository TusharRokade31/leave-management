"use client";
import React from 'react';
import { Calendar, CheckCircle, Clock, Laptop, Sparkles, Check } from 'lucide-react'; 
import { Stats } from '@/type/form';
import { formatDate } from '@/utils/formatDate'; 

interface StatsCardsProps {
  stats: Stats & {
    optionalUsed?: boolean;
    holidayName?: string;
    optionalHolidayDate?: string; 
  };
  role?: "EMPLOYEE" | "MANAGER"; 
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, role }) => {
  const optionalRemaining = stats.optionalUsed ? 0 : 1;

  // Manual fallback formatter if utils/formatDate behaves unexpectedly
  const renderDate = (dateStr?: string) => {
    if (!dateStr) return "Annual Quota";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${role === "EMPLOYEE" ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-4 lg:gap-6 mb-8 transition-colors duration-300`}>
      {/* Total Leaves */}
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm p-5 border border-gray-100 dark:border-slate-800 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Total Leaves</p>
            <p className="text-3xl font-black text-gray-800 dark:text-white mt-1 leading-none">{stats.total}</p>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
      
      {/* Pending */}
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm p-5 border border-gray-100 dark:border-slate-800 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Pending</p>
            <p className="text-3xl font-black text-amber-500 dark:text-amber-400 mt-1 leading-none">{stats.pending}</p>
          </div>
          <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <Clock className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          </div>
        </div>
      </div>
      
      {/* Approved */}
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm p-5 border border-gray-100 dark:border-slate-800 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Approved</p>
            <p className="text-3xl font-black text-emerald-500 dark:text-emerald-400 mt-1 leading-none">{stats.approved}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Work From Home */}
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm p-5 border border-gray-100 dark:border-slate-800 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">Remote Log</p>
            <p className="text-3xl font-black text-indigo-500 dark:text-indigo-400 mt-1 leading-none">{stats.wfh || 0}</p>
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <Laptop className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* ✅ PERSISTENT OPTIONAL HOLIDAY CARD */}
      {role === "EMPLOYEE" && (
        <div
          className={`rounded-[1.5rem] shadow-sm p-5 border transition-all hover:shadow-md flex flex-col justify-between ${
            optionalRemaining === 0
              ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              : "bg-indigo-600 dark:bg-indigo-700 border-indigo-500 text-white shadow-lg shadow-indigo-200/50"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <p className={`text-[9px] font-black uppercase tracking-widest ${optionalRemaining === 0 ? "text-slate-400" : "text-indigo-100"}`}>
                Optional Holiday
              </p>
              <p className={`text-3xl font-black mt-1 leading-none ${optionalRemaining === 0 ? "text-slate-300 dark:text-slate-600" : "text-white"}`}>
                {optionalRemaining}
              </p>
            </div>

            <div className={`p-2.5 rounded-xl transition-colors ${optionalRemaining === 0 ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700" : "bg-white/20 backdrop-blur-sm"}`}>
              {optionalRemaining === 0 ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </div>
          </div>

          <div className="mt-auto">
            {stats.optionalUsed && stats.holidayName ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter leading-tight truncate italic">
                  {stats.holidayName}
                </p>
                <div className="flex items-center gap-2 py-1.5 px-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm w-full">
                   <Calendar size={12} className="text-slate-400" />
                   <div className="flex flex-col">
                     <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Used On</span>
                     <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                       {renderDate(stats.optionalHolidayDate)}
                     </span>
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-indigo-100/60">
                <Sparkles size={12} />
                <p className="text-[9px] font-black uppercase tracking-widest">
                  1 Day Available
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};