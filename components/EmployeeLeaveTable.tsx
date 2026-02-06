"use client";
import React, { useState } from 'react';
import { getStatusIcon } from '@/utils/getStatusIcon';
import { formatDate } from '@/utils/formatDate';
import { getStatusColor } from '@/utils/getStatusColors';
import { Eye, X } from 'lucide-react';

interface EmployeeLeaveTableProps {
  leaves: Leave[];
  onDelete: (leaveId: number) => Promise<void>;
}

export const EmployeeLeaveTable: React.FC<EmployeeLeaveTableProps> = ({ leaves, onDelete }) => {
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);

  const formatRequestedTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLeaveTime = (leave: Leave): string | null => {
    if (!leave.startTime) return null;
    
    switch (leave.type) {
      case 'HALF':
        return `${leave.startTime} - ${leave.endTime || 'N/A'}`;
      case 'EARLY':
        return `Leaving at ${leave.startTime}`;
      case 'LATE':
        return `Arriving at ${leave.startTime}`;
      case 'WORK_FROM_HOME':
        return 'All Day';
      default:
        return null;
    }
  };

  if (leaves.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 text-center transition-colors">
        <p className="text-gray-500 dark:text-slate-400">No leave requests found</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Requested At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {leaves.map(leave => (
                <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm">
                    <div className="text-gray-900 dark:text-slate-100 font-medium">
                      {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                    </div>
                    {formatLeaveTime(leave) && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                        🕐 {formatLeaveTime(leave)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-300 capitalize">
                    {leave.type === 'WORK_FROM_HOME' ? 'WFH' : leave.type.toLowerCase()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-300">{leave.days}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="max-w-xs">
                      <p className="truncate text-gray-600 dark:text-slate-400">{leave.reason}</p>
                      <button
                        onClick={() => setSelectedLeave(leave)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs flex items-center space-x-1 mt-1 font-semibold"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View full</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                    {formatRequestedTime(leave.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium capitalize ring-1 ring-inset ${getStatusColor(leave.status)}`}>
                      {getStatusIcon(leave.status)}
                      <span>{leave.status.toLowerCase()}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {leave.status === 'PENDING' && (
                      <button
                        onClick={() => onDelete(leave.id)}
                        className="px-3 py-1 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {leaves.map(leave => (
          <div key={leave.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium capitalize ring-1 ring-inset ${getStatusColor(leave.status)}`}>
                {getStatusIcon(leave.status)}
                <span>{leave.status.toLowerCase()}</span>
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                {leave.type === 'WORK_FROM_HOME' ? 'WFH' : leave.type.toLowerCase()}
              </span>
            </div>

            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
              </p>
              {formatLeaveTime(leave) && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                  🕐 {formatLeaveTime(leave)}
                </p>
              )}
            </div>

            <div className="mb-3">
              <span className="text-xs text-gray-500 dark:text-slate-400">Days: </span>
              <span className="text-sm font-medium text-gray-900 dark:text-slate-200">{leave.days}</span>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Reason:</p>
              <p className="text-sm text-gray-900 dark:text-slate-300 line-clamp-2">{leave.reason}</p>
              <button
                onClick={() => setSelectedLeave(leave)}
                className="text-indigo-600 dark:text-indigo-400 text-xs flex items-center space-x-1 mt-2 font-semibold"
              >
                <Eye className="w-3 h-3" />
                <span>View full details</span>
              </button>
            </div>

            <div className="mb-3">
              <p className="text-[10px] text-gray-400 dark:text-slate-500 italic">
                Requested: {formatRequestedTime(leave.createdAt)}
              </p>
            </div>

            {leave.status === 'PENDING' && (
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  onClick={() => onDelete(leave.id)}
                  className="w-full px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors font-medium"
                >
                  Delete Request
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* View Full Detail Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors border border-gray-200 dark:border-slate-800">
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Leave Request Details</h3>
              <button
                onClick={() => setSelectedLeave(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Start Date</label>
                  <p className="text-gray-900 dark:text-slate-200 font-medium mt-1">{formatDate(selectedLeave.startDate)}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">End Date</label>
                  <p className="text-gray-900 dark:text-slate-200 font-medium mt-1">{formatDate(selectedLeave.endDate)}</p>
                </div>
              </div>

              {formatLeaveTime(selectedLeave) && (
                <div>
                  <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Time Schedule</label>
                  <p className="text-indigo-600 dark:text-indigo-400 font-semibold mt-1">🕐 {formatLeaveTime(selectedLeave)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Leave Type</label>
                  <p className="text-gray-900 dark:text-slate-200 capitalize font-medium mt-1">
                    {selectedLeave.type === 'WORK_FROM_HOME' ? 'WFH' : selectedLeave.type.toLowerCase()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Total Days</label>
                  <p className="text-gray-900 dark:text-slate-200 font-medium mt-1">{selectedLeave.days}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Request Status</label>
                <div className="mt-2">
                  <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium capitalize ring-1 ring-inset ${getStatusColor(selectedLeave.status)}`}>
                    {getStatusIcon(selectedLeave.status)}
                    <span>{selectedLeave.status.toLowerCase()}</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Reason for Leave</label>
                <div className="mt-2 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800">
                  <p className="text-gray-900 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedLeave.reason}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/30 px-6 py-4 flex justify-end border-t border-gray-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedLeave(null)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};