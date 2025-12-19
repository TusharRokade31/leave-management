import React from 'react';
import { Calendar, CheckCircle, Clock, Laptop } from 'lucide-react'; 
import { Stats } from '@/type/form';

interface StatsCardsProps {
  stats: Stats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  console.log(stats)
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Total Leaves */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Leaves</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
      
      {/* Pending */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
      </div>
      
      {/* Approved */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{stats.approved}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* NEW: Work From Home Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Work From Home</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.wfh || 0}</p>
          </div>
          <div className="p-3 bg-indigo-100 rounded-lg">
            <Laptop className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
      </div>
    </div>
  );
};