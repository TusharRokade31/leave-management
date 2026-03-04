'use client';

import React, { useState, useMemo } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Loader2,
  History, 
  MessageSquare, 
  Send,
  AlertTriangle,
  Clock 
} from 'lucide-react';
import { FileText } from 'lucide-react';
import { getStatusIcon } from '../utils/getStatusIcon';
import { formatDate } from '@/utils/formatDate';
import { getStatusColor } from '@/utils/getStatusColors';
import { toast } from 'react-toastify';

// FIXED: Defined LeaveStatus globally to resolve red lines in the JSX casting
type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Leave {
  id: number;
  userId: number;
  startDate: string; 
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
  type: string;
  days: number;
  status: LeaveStatus;
  managerComment?: string | null;
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
  editSummary?: string | null;
  user?: {
    name: string | null;
    email?: string;
  };
}

interface ManagerLeaveTableProps {
  leaves: Leave[];
  onApprove: (leaveId: number, comment?: string) => Promise<void>;
  onReject: (leaveId: number, comment?: string) => Promise<void>;
  onUpdateComment: (leaveId: number, comment: string) => Promise<void>; 
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
  onUpdateComment,
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

  const [viewModalComment, setViewModalComment] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  const formatRequestedTime = (timestamp: string | Date | undefined | null): string => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'N/A';
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
    setComment(viewModalComment || ''); 
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
        setSelectedLeave(null); 
      } catch (error: unknown) {
        console.error('Error processing leave:', error);
        toast.error(error instanceof Error ? error.message : 'Action failed');
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleStandaloneCommentSave = async () => {
    if (!selectedLeave || viewModalComment === (selectedLeave.managerComment || '')) return;
    
    setIsSavingComment(true);
    try {
      await onUpdateComment(selectedLeave.id, viewModalComment);
      toast.success('Comment updated successfully');
      setSelectedLeave({ ...selectedLeave, managerComment: viewModalComment });
    } catch (error: unknown) {
      toast.error('Failed to save comment');
      console.error(error);
    } finally {
      setIsSavingComment(false);
    }
  };

  const uniqueEmployees = Array.from(new Set(leaves.map(l => l.user?.name).filter(Boolean)));

  const filteredLeaves = useMemo(() => {
    return leaves.filter(leave => {
      const leaveDate = new Date(leave.startDate);
      return (
        leaveDate.getMonth() === currentMonth.getMonth() &&
        leaveDate.getFullYear() === currentMonth.getFullYear()
      );
    });
  }, [leaves, currentMonth]);

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
      {/* FILTER BAR SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 p-6 mb-6 transition-all duration-300">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-colors">
            <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all active:scale-90">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center space-x-3 px-4 min-w-[180px] justify-center text-center">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-black uppercase tracking-widest text-xs text-gray-700 dark:text-slate-200">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all active:scale-90">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
          </div>

          <div className="flex items-center space-x-3 flex-1">
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchEmployee()}
                placeholder="Find employee statistics..."
                list="employee-suggestions"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all placeholder:text-gray-400 text-sm font-bold"
              />
              <datalist id="employee-suggestions">
                {uniqueEmployees.map((name) => (
                   <option key={name as string} value={name as string} />
                ))}
              </datalist>
            </div>
            <button
              onClick={handleSearchEmployee}
              className="px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap shadow-xl shadow-slate-200 dark:shadow-none active:scale-95"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Analyze Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN TABLE SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-all duration-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Employee</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Dates & Schedule</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Type</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Total Days</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Justification</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Requested</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Status</th>
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                        <p className="text-gray-400 dark:text-slate-500 font-bold tracking-tight italic">No applications found for this month</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-8 py-5">
                      <button
                        onClick={() => {
                          const stats = getCurrentMonthLeaves(leave.user?.name || '');
                          setEmployeeStats(stats);
                          setShowStatsModal(true);
                        }}
                        className="text-sm font-black text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                      >
                        {leave.user?.name}
                        <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-tight lowercase">{leave.user?.email}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-slate-900 dark:text-slate-100 font-bold">
                        {formatDate(leave.startDate)} <span className="text-slate-300 mx-1">→</span> {formatDate(leave.endDate)}
                      </div>
                      {formatLeaveTime(leave) && (
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-black uppercase tracking-tighter flex items-center gap-1">
                          <Clock size={10} /> {formatLeaveTime(leave)}
                        </div>
                      )}
                      {leave.isEdited && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 dark:text-amber-500 font-black uppercase italic mt-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 rounded border border-amber-100 dark:border-amber-800">
                          <History size={10} /> Revised
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/30 whitespace-nowrap">
                        {leave.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm font-black text-slate-900 dark:text-slate-300 whitespace-nowrap">{leave.days} <span className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">Days</span></td>
                    <td className="px-6 py-5">
                      <div className="max-w-[150px]">
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate italic tracking-tight">&quot;{leave.reason}&quot;</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap">
                      {formatRequestedTime(leave.createdAt)}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${getStatusColor(leave.status as LeaveStatus)}`}>
                        {getStatusIcon(leave.status as LeaveStatus)}
                        <span>{leave.status}</span>
                      </span>
                    </td>
                    <td className="px-8 py-5">
                        <div className="flex items-center justify-end space-x-2">
                            <button
                                onClick={() => {
                                    setSelectedLeave(leave);
                                    setViewModalComment(leave.managerComment || '');
                                }}
                                className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all active:scale-90"
                                title="Full Details"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            {leave.status === 'PENDING' && (
                                <>
                                    <button
                                        onClick={() => handleActionClick(leave.id, 'approve')}
                                        className="p-2.5 text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white dark:bg-slate-800 rounded-xl transition-all active:scale-90"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleActionClick(leave.id, 'reject')}
                                        className="p-2.5 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:bg-slate-800 rounded-xl transition-all active:scale-90"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* ACTION MODAL (APPROVE/REJECT) */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[120] p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-slate-800">
            <div className={`${currentAction === 'approve' ? 'bg-green-600' : 'bg-red-600'} text-white px-8 py-6 flex items-center justify-between`}>
              <h3 className="text-sm font-black uppercase tracking-[0.2em]">
                {currentAction === 'approve' ? 'Final Confirmation' : 'Rejection Reason'}
              </h3>
              <button onClick={() => !isSubmitting && setShowCommentModal(false)} className="text-white hover:rotate-90 transition-all duration-200"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="px-8 py-8 space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                  Manager Feedback {currentAction === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={currentAction === 'reject' ? 'State the reason for rejection...' : 'Optional note for approval...'}
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-[1.5rem] focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all resize-none text-sm font-medium italic"
                />
            </div>

            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3 border-t border-gray-100 dark:border-slate-800">
              <button onClick={() => setShowCommentModal(false)} className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmitting || (currentAction === 'reject' && !comment.trim())}
                className={`px-8 py-3 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center space-x-2 shadow-xl active:scale-95 disabled:opacity-50 ${
                  currentAction === 'approve' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'
                }`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : currentAction === 'approve' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>{isSubmitting ? 'Syncing...' : 'Submit Decision'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
{selectedLeave && !showCommentModal && (
  <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800">
      <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white italic">Application Review</h3>
          <button onClick={() => setSelectedLeave(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"><X className="w-5 h-5" /></button>
      </div>
      
      <div className="px-8 py-8 space-y-8 overflow-y-auto custom-scrollbar">
        {selectedLeave.isEdited && selectedLeave.editSummary && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-[1.5rem] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Modification Summary</p>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 italic">&quot;{selectedLeave.editSummary}&quot;</p>
              </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Duration</label>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{formatDate(selectedLeave.startDate)} <span className="text-slate-300">→</span> {formatDate(selectedLeave.endDate)}</p>
            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-tighter">{selectedLeave.days} Work Days</p>
          </div>
          <div className="text-right">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Category</label>
            <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase rounded-lg border border-indigo-100 dark:border-indigo-800">
              {selectedLeave.type.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* --- NEW: DETAILED SHIFT & TIMING SECTION --- */}
        {(selectedLeave.startTime || selectedLeave.type === 'HALF') && (
          <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <Clock className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Shift & Timing Details</label>
              <div className="flex flex-wrap items-center gap-2">
                {/* Show Slot Information (e.g., First Half/Second Half) */}
                {selectedLeave.type === 'HALF' && (
                  <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded uppercase">
                    {selectedLeave.startTime === '10:00' ? '1st Half' : selectedLeave.startTime === '14:00' ? '2nd Half' : 'Custom Half'}
                  </span>
                )}
                {/* Show Actual Times */}
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                  {selectedLeave.startTime || '--:--'} 
                  <span className="mx-2 text-slate-300 font-normal">to</span> 
                  {selectedLeave.endTime || '--:--'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Employee Justification</label>
          <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">&quot;{selectedLeave.reason}&quot;</p>
          </div>
        </div>

        <div className="p-6 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <MessageSquare size={18} />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Management Discussion</h4>
          </div>
          <textarea
            value={viewModalComment}
            onChange={(e) => setViewModalComment(e.target.value)}
            placeholder="Notes for the employee..."
            className="w-full px-5 py-4 bg-white dark:bg-slate-800 border-none rounded-[1.5rem] focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm italic font-medium"
          />
          <div className="flex justify-end pt-2">
              <button
                onClick={handleStandaloneCommentSave}
                disabled={isSavingComment || viewModalComment === (selectedLeave.managerComment || '')}
                className="px-6 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSavingComment ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Update Feedback
              </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-between items-center">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Received: {formatRequestedTime(selectedLeave.createdAt)}</span>
        <button onClick={() => setSelectedLeave(null)} className="px-10 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95">Dismiss Review</button>
      </div>
    </div>
  </div>
)}

      {/* STATS MODAL */}
      {showStatsModal && employeeStats && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-slate-800">
            <div className="bg-slate-900 dark:bg-indigo-700 text-white px-8 py-6 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em]">Employee Insights</h3>
              <button onClick={() => setShowStatsModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="text-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Selected Employee</label>
                <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">{employeeStats.name}</p>
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-3 bg-indigo-50 dark:bg-indigo-900/40 inline-block px-3 py-1 rounded-full uppercase tracking-tighter">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 text-center border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Requests</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-indigo-400">{employeeStats.totalLeaves}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 text-center border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Days Off</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-indigo-400">{employeeStats.totalDays}</p>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Approved', val: employeeStats.approvedLeaves, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                  { label: 'Pending', val: employeeStats.pendingLeaves, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                  { label: 'Rejected', val: employeeStats.rejectedLeaves, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' }
                ].map((row) => (
                  <div key={row.label} className={`flex items-center justify-between p-4 ${row.bg} rounded-2xl`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${row.color}`}>{row.label}</span>
                    <span className={`text-xl font-black ${row.color}`}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end">
              <button onClick={() => setShowStatsModal(false)} className="px-10 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Close Analytics</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};