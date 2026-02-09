'use client';

import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Loader2 
} from 'lucide-react';
import { getStatusIcon } from '../utils/getStatusIcon';
import { formatDate } from '@/utils/formatDate';
import { getStatusColor } from '@/utils/getStatusColors';
import { toast } from 'react-toastify';


interface ManagerLeaveTableProps {
  leaves: Leave[];
  onApprove: (leaveId: number, comment?: string) => Promise<void>;
  onReject: (leaveId: number, comment?: string) => Promise<void>;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

interface EmployeeStats {
  name: string;
  totalLeaves: number;
  approvedLeaves: number;
  pendingLeaves: number;
  rejectedLeaves: number;
  totalDays: number;
}

export const ManagerLeaveTable: React.FC<ManagerLeaveTableProps> = ({ 
  leaves, 
  onApprove, 
  onReject,
  currentMonth,
  onMonthChange 
}) => {
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [currentAction, setCurrentAction] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [actionLeaveId, setActionLeaveId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      case 'HALF': return `${leave.startTime} - ${leave.endTime || 'N/A'}`;
      case 'EARLY': return `Leaving at ${leave.startTime}`;
      case 'LATE': return `Arriving at ${leave.startTime}`;
      case 'WORK_FROM_HOME': return 'All Day'; 
      default: return null;
    }
  };

  const getCurrentMonthLeaves = (employeeName: string): EmployeeStats => {
      const month = currentMonth.getMonth(); 
      const year = currentMonth.getFullYear();

      const employeeLeaves = leaves.filter(leave => {
        const leaveDate = new Date(leave.startDate);
        return (
          leave.user?.name === employeeName &&
          leave.type !== 'WORK_FROM_HOME' && 
          leaveDate.getMonth() === month &&
          leaveDate.getFullYear() === year
        );
      });

      return {
        name: employeeName,
        totalLeaves: employeeLeaves.length,
        approvedLeaves: employeeLeaves.filter(l => l.status === 'APPROVED').length,
        pendingLeaves: employeeLeaves.filter(l => l.status === 'PENDING').length,
        rejectedLeaves: employeeLeaves.filter(l => l.status === 'REJECTED').length,
        totalDays: employeeLeaves.reduce((sum, l) => sum + l.days, 0)
      };
  };

  const handleSearchEmployee = () => {
    if (!searchEmployee.trim()) return;
    const stats = getCurrentMonthLeaves(searchEmployee.trim());
    setEmployeeStats(stats);
    setShowStatsModal(true);
  };
  
  const handleActionClick = (leaveId: number, action: 'approve' | 'reject') => {
    setActionLeaveId(leaveId);
    setCurrentAction(action);
    setComment('');
    setShowCommentModal(true);
  };

  const handleConfirmAction = async () => {
      if (!actionLeaveId || !currentAction) return;
      if (currentAction === 'reject' && !comment.trim()) {
        toast('Please provide a comment when rejecting a leave request');
        return;
      }

      setIsSubmitting(true);

      try {
        if (currentAction === 'approve') {
          await onApprove(actionLeaveId, comment.trim() || undefined);
        } else {
          await onReject(actionLeaveId, comment.trim());
        }
        setShowCommentModal(false);
        setComment('');
        setActionLeaveId(null);
        setCurrentAction(null);
      } catch (error) {
        console.error('Error processing leave:', error);
      } finally {
        setIsSubmitting(false);
      }
  };

  const uniqueEmployees = Array.from(new Set(leaves.map(l => l.user?.name).filter(Boolean)));

  const filteredLeaves = leaves.filter(leave => {
    const leaveDate = new Date(leave.startDate);
    return (
      leaveDate.getMonth() === currentMonth.getMonth() &&
      leaveDate.getFullYear() === currentMonth.getFullYear()
    );
  });

  const prevMonth = () => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    onMonthChange(newDate);
  };
  const nextMonth = () => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    onMonthChange(newDate);
  };

  return (
    <>
      {/* Search Bar & Month Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 mb-4 transition-colors duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Month Navigation */}
          <div className="flex items-center space-x-4 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg transition-colors">
            <button onClick={prevMonth} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm transition-all">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center space-x-2 min-w-[150px] justify-center text-center">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-semibold text-gray-700 dark:text-slate-200">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button onClick={nextMonth} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm transition-all">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchEmployee()}
                placeholder="Search employee by name..."
                list="employee-suggestions"
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all"
              />
              <datalist id="employee-suggestions">
                {uniqueEmployees.map((name) => (
                   <option key={name as string} value={name as string} />
                ))}
              </datalist>
            </div>
            <button
              onClick={handleSearchEmployee}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 whitespace-nowrap shadow-md active:scale-95"
            >
              <Search className="w-4 h-4" />
              <span className="font-bold">View Stats</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leave Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Employee</th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Dates</th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Type</th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Days</th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Reason</th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Requested</th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Status</th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400 font-medium italic">
                    No requests found for {currentMonth.toLocaleString('default', { month: 'long' })}
                  </td>
                </tr>
              ) : (
                filteredLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-slate-100">
                      <button
                        onClick={() => {
                          const stats = getCurrentMonthLeaves(leave.user?.name || '');
                          setEmployeeStats(stats);
                          setShowStatsModal(true);
                        }}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline decoration-dotted underline-offset-4"
                      >
                        {leave.user?.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-300">
                      <div className="font-medium">
                        {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                      </div>
                      {formatLeaveTime(leave) && (
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-bold">
                          🕐 {formatLeaveTime(leave)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-300 capitalize">
                      {leave.type === 'WORK_FROM_HOME' ? 'WFH' : leave.type.toLowerCase()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-300">{leave.days}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                      <div className="max-w-xs">
                        <p className="truncate">{leave.reason}</p>
                        <button
                          onClick={() => setSelectedLeave(leave)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-bold flex items-center space-x-1 mt-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View full</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">
                      {formatRequestedTime(leave.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ring-1 ring-inset ${getStatusColor(leave.status)}`}>
                        {getStatusIcon(leave.status)}
                        <span>{leave.status.toLowerCase()}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {leave.status === 'PENDING' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleActionClick(leave.id, 'approve')}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all active:scale-90 shadow-sm border border-transparent hover:border-green-100"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleActionClick(leave.id, 'reject')}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-90 shadow-sm border border-transparent hover:border-red-100"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Confirmation Modal with Loader */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-slate-800">
            <div className={`${currentAction === 'approve' ? 'bg-green-600 dark:bg-green-700' : 'bg-red-600 dark:bg-red-700'} text-white px-6 py-5 rounded-t-xl flex items-center justify-between`}>
              <h3 className="text-lg font-black uppercase tracking-tight">
                {currentAction === 'approve' ? 'Approve Request' : 'Reject Request'}
              </h3>
              <button
                onClick={() => !isSubmitting && setShowCommentModal(false)}
                className="text-white hover:rotate-90 transition-all duration-200 disabled:opacity-50"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">
                  Add Feedback {currentAction === 'reject' && <span className="text-red-500">*</span>}
                  {currentAction === 'approve' && <span className="text-gray-400 ml-1">(Optional)</span>}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={currentAction === 'reject' ? 'Reason for rejection...' : 'Good job, approved...'}
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all resize-none disabled:opacity-50"
                />
                {currentAction === 'reject' && !comment.trim() && (
                  <p className="text-[10px] font-bold text-red-500 mt-2 uppercase tracking-wide">Comment required for rejection</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => setShowCommentModal(false)}
                disabled={isSubmitting}
                className="px-5 py-2.5 font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmitting || (currentAction === 'reject' && !comment.trim())}
                className={`px-6 py-2.5 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all flex items-center space-x-2 shadow-lg disabled:opacity-50 disabled:scale-95 ${
                  currentAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700 shadow-green-100 dark:shadow-none' 
                    : 'bg-red-600 hover:bg-red-700 shadow-red-100 dark:shadow-none'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing</span>
                  </>
                ) : currentAction === 'approve' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Full Detail Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-5 flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Leave Request Details</h3>
              <button
                onClick={() => !isSubmitting && setSelectedLeave(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-all p-1"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="px-6 py-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Employee</label>
                  <p className="text-gray-900 dark:text-slate-100 font-bold text-lg leading-none">{selectedLeave.user?.name}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Requested On</label>
                  <p className="text-gray-700 dark:text-slate-300 font-medium">{formatRequestedTime(selectedLeave.createdAt)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                <div>
                  <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Start Date</label>
                  <p className="text-gray-900 dark:text-slate-200 font-bold">{formatDate(selectedLeave.startDate)}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">End Date</label>
                  <p className="text-gray-900 dark:text-slate-200 font-bold">{formatDate(selectedLeave.endDate)}</p>
                </div>
              </div>

               {formatLeaveTime(selectedLeave) && (
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-bold">
                  <span className="text-[10px] uppercase tracking-widest opacity-60">Schedule:</span>
                  <p className="text-sm">🕐 {formatLeaveTime(selectedLeave)}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Type</label>
                  <p className="text-gray-900 dark:text-slate-200 capitalize font-bold">{selectedLeave.type.toLowerCase()}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Days</label>
                  <p className="text-gray-900 dark:text-slate-200 font-bold">{selectedLeave.days}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${getStatusColor(selectedLeave.status)}`}>
                      {getStatusIcon(selectedLeave.status)}
                      <span>{selectedLeave.status}</span>
                      </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Reason for Request</label>
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                  <p className="text-gray-900 dark:text-slate-300 whitespace-pre-wrap leading-relaxed italic">{selectedLeave.reason}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons inside View Modal */}
             {selectedLeave.status === 'PENDING' && (
              <div className="sticky bottom-0 bg-gray-50 dark:bg-slate-800/80 backdrop-blur-md px-6 py-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    const id = selectedLeave.id;
                    setSelectedLeave(null); 
                    handleActionClick(id, 'reject');
                  }}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-100 transition-all flex items-center space-x-2 border border-red-100 dark:border-red-900/50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => {
                    const id = selectedLeave.id;
                    setSelectedLeave(null); 
                    handleActionClick(id, 'approve');
                  }}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-green-700 transition-all flex items-center space-x-2 shadow-lg shadow-green-100 dark:shadow-none"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && employeeStats && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-slate-800">
            <div className="bg-indigo-600 dark:bg-indigo-700 text-white px-6 py-5 flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tight">Employee Performance</h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-white hover:opacity-70 transition-opacity"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-6 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Full Name</label>
                  <p className="text-xl font-black text-gray-900 dark:text-slate-100">{employeeStats.name}</p>
                </div>
                <div className="text-right">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 block">Analysis Period</label>
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold">
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/50 transition-colors">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Total Requests</p>
                  <p className="text-4xl font-black text-blue-700 dark:text-blue-300">{employeeStats.totalLeaves}</p>
                </div>
                <div className="bg-purple-50/50 dark:bg-purple-900/20 rounded-2xl p-5 border border-purple-100 dark:border-purple-900/50 transition-colors">
                  <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Leaves Used</p>
                  <p className="text-4xl font-black text-purple-700 dark:text-purple-300">{employeeStats.totalDays}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/50">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-black text-green-700 dark:text-green-300 uppercase tracking-widest">Approved</span>
                  </div>
                  <span className="text-xl font-black text-green-700 dark:text-green-300">{employeeStats.approvedLeaves}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-900/50">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xs font-black text-yellow-700 dark:text-yellow-300 uppercase tracking-widest">Pending Action</span>
                  </div>
                  <span className="text-xl font-black text-yellow-700 dark:text-yellow-300">{employeeStats.pendingLeaves}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-black text-red-700 dark:text-red-300 uppercase tracking-widest">Rejected</span>
                  </div>
                  <span className="text-xl font-black text-red-700 dark:text-red-300">{employeeStats.rejectedLeaves}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-5 rounded-b-xl flex justify-end border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 dark:shadow-none"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};