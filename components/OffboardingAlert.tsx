"use client";
import React, { useMemo } from "react";
import { AlertCircle, Users, Calendar, ChevronRight } from "lucide-react";

interface Employee {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    endDate?: string | null;
  };
  leaves: any[];
  tasks: any[];
}

interface OffboardingAlertProps {
  employees: Employee[];
  onManageClick: () => void;
}

export function OffboardingAlert({ employees, onManageClick }: OffboardingAlertProps) {
  const offboardingData = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();
    
    const employeesWithEndDate = employees
      .filter(emp => emp.user.endDate)
      .map(emp => ({
        ...emp.user,
        endDate: new Date(emp.user.endDate!),
        daysRemaining: Math.ceil((new Date(emp.user.endDate!).getTime() - nowTime) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Past offboardings (already offboarded - negative days)
    const past = employeesWithEndDate.filter(e => e.daysRemaining < 0);

    // Filter logic with no overlaps for future offboardings
    const nextWeek = employeesWithEndDate.filter(e => e.daysRemaining >= 0 && e.daysRemaining <= 7);
    
    const thisMonth = employeesWithEndDate.filter(e => {
      const endMonth = e.endDate.getMonth();
      const endYear = e.endDate.getFullYear();
      // Must be this month AND NOT in next week
      return endMonth === now.getMonth() && 
             endYear === now.getFullYear() && 
             e.daysRemaining > 7;
    });
    
    // Remaining: employees NOT in next week AND NOT in this month AND future dates
    const remaining = employeesWithEndDate.filter(e => {
      const isInNextWeek = e.daysRemaining >= 0 && e.daysRemaining <= 7;
      const endMonth = e.endDate.getMonth();
      const endYear = e.endDate.getFullYear();
      const isThisMonth = endMonth === now.getMonth() && endYear === now.getFullYear();
      
      return !isInNextWeek && !isThisMonth && e.daysRemaining > 0;
    });

    return { past, nextWeek, thisMonth, remaining, all: employeesWithEndDate };
  }, [employees]);

  // Don't show if no offboarding employees
  if (offboardingData.all.length === 0) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-[2rem] p-6 border-2 border-orange-200 dark:border-orange-900/50 shadow-lg transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">
              Off-boarding Alerts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {offboardingData.all.length} employee{offboardingData.all.length !== 1 ? 's' : ''} scheduled to off-board
            </p>
          </div>
        </div>
        
        <button
          onClick={onManageClick}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md"
        >
          Manage
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Next Week (0-7 days) */}
        {offboardingData.nextWeek.length > 0 && (
          <div className="bg-red-100 dark:bg-red-900/30 rounded-xl p-4 border border-red-200 dark:border-red-900/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wider">
                Next Week
              </span>
            </div>
            <div className="text-3xl font-black text-red-600 dark:text-red-400 mb-2">
              {offboardingData.nextWeek.length}
            </div>
            <div className="space-y-2">
              {offboardingData.nextWeek.slice(0, 3).map(emp => (
                <div key={emp.id} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-800 dark:text-white truncate pr-2">
                    {emp.name}
                  </span>
                  <span className="text-xs font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                    {emp.daysRemaining}d
                  </span>
                </div>
              ))}
              {offboardingData.nextWeek.length > 3 && (
                <div className="text-xs text-red-600 dark:text-red-400 font-bold">
                  +{offboardingData.nextWeek.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* This Month (excluding next week) */}
        {offboardingData.thisMonth.length > 0 && (
          <div className="bg-orange-100 dark:bg-orange-900/30 rounded-xl p-4 border border-orange-200 dark:border-orange-900/50">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                Rest of This Month
              </span>
            </div>
            <div className="text-3xl font-black text-orange-600 dark:text-orange-400 mb-2">
              {offboardingData.thisMonth.length}
            </div>
            <div className="space-y-2">
              {offboardingData.thisMonth.slice(0, 3).map(emp => (
                <div key={emp.id} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-800 dark:text-white truncate pr-2">
                    {emp.name}
                  </span>
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400 whitespace-nowrap">
                    {formatDate(emp.endDate).split(',')[0]}
                  </span>
                </div>
              ))}
              {offboardingData.thisMonth.length > 3 && (
                <div className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                  +{offboardingData.thisMonth.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming (beyond this month) */}
        {offboardingData.remaining.length > 0 && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-xl p-4 border border-yellow-200 dark:border-yellow-900/50">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-xs font-black text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">
                Upcoming Off-boardings
              </span>
            </div>
            <div className="text-3xl font-black text-yellow-600 dark:text-yellow-400 mb-2">
              {offboardingData.remaining.length}
            </div>
            <div className="space-y-2">
              {offboardingData.remaining.slice(0, 3).map(emp => (
                <div key={emp.id} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-800 dark:text-white truncate pr-2">
                    {emp.name}
                  </span>
                  <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                    {formatDate(emp.endDate).split(',')[0]}
                  </span>
                </div>
              ))}
              {offboardingData.remaining.length > 3 && (
                <div className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">
                  +{offboardingData.remaining.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Past Off-boardings */}
        {offboardingData.past.length > 0 && (
          <div className="bg-gray-100 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Past Off-boardings
              </span>
            </div>
            <div className="text-3xl font-black text-gray-600 dark:text-gray-400 mb-2">
              {offboardingData.past.length}
            </div>
            <div className="space-y-2">
              {offboardingData.past.slice(0, 3).map(emp => (
                <div key={emp.id} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-700 dark:text-gray-300 truncate pr-2">
                    {emp.name}
                  </span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(emp.endDate).split(',')[0]}
                  </span>
                </div>
              ))}
              {offboardingData.past.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                  +{offboardingData.past.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}