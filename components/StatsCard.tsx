import React from 'react';
import { Calendar, CheckCircle, Clock, Laptop } from 'lucide-react'; 
import { Stats } from '@/type/form';

interface StatsCardsProps {
  stats: Stats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  console.log(stats)
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 transition-colors duration-300">
      {/* Total Leaves */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-slate-800 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Total Leaves</p>
            <p className="text-4xl font-black text-gray-800 dark:text-white mt-1 leading-none">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl transition-colors">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
      
      {/* Pending */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-slate-800 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Pending</p>
            <p className="text-4xl font-black text-yellow-600 dark:text-yellow-500 mt-1 leading-none">{stats.pending}</p>
          </div>
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl transition-colors">
            <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
          </div>
        </div>
      </div>
      
      {/* Approved */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-slate-800 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Approved</p>
            <p className="text-4xl font-black text-green-600 dark:text-green-500 mt-1 leading-none">{stats.approved}</p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl transition-colors">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-500" />
          </div>
        </div>
      </div>

      {/* NEW: Work From Home Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-slate-800 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Work From Home</p>
            <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-1 leading-none">{stats.wfh || 0}</p>
          </div>
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl transition-colors">
            <Laptop className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>
    </div>
  );
};