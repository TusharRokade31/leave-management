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
  Clock,
  Sparkles,
  FileText,
  Info,
  RefreshCcw,
} from 'lucide-react';
import { getStatusIcon } from '../utils/getStatusIcon';
import { formatDate } from '@/utils/formatDate';
import { getStatusColor } from '@/utils/getStatusColors';
import { toast } from 'react-toastify';
import { HOLIDAY_DATA } from '@/lib/holidays';

type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Leave {
  id: number;
  userId: number;
  startDate: string; 
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  slot?: string | null;
  reason: string;
  type: string;
  days: number;
  status: LeaveStatus;
  managerComment?: string | null;
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
  editSummary?: string | null;
  isOptional?: boolean;
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

const getHolidaysInRange = (start: string, end: string) => {
  const s = new Date(start.split('T')[0]);
  const e = new Date(end.split('T')[0]);
  return HOLIDAY_DATA.filter(h => {
    const hDate = new Date(h.date);
    return hDate >= s && hDate <= e;
  });
};

const normaliseTime = (t: string | null | undefined): string => {
  if (!t) return '--:--';
  return t.substring(0, 5);
};

const to12hr = (t: string | null | undefined): string => {
  const hhmm = normaliseTime(t);
  if (hhmm === '--:--') return '--';
  const [hStr, mStr] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
};

// ── Fixed: use slot field as source of truth; fallback to startTime for legacy ──
const getHalfLabel = (leave: Leave): string => {
  if (leave.type !== 'HALF') return '';
  if (leave.slot === 'FIRST_HALF')  return '1st Half';
  if (leave.slot === 'SECOND_HALF') return '2nd Half';
  if (leave.slot === 'CUSTOM')      return 'Custom';
  // legacy fallback — records before slot field was stored
  const t = normaliseTime(leave.startTime);
  if (t === '10:00') return '1st Half';
  if (t === '14:30') return '2nd Half';
  return 'Half Day';
};

// ── Fixed: slot-based fixed times; EARLY/LATE always use startTime ──────────
const getShiftDetails = (
  leave: Leave
): { label: string; time: string; singleTime: boolean } | null => {
  switch (leave.type) {
    case 'HALF': {
      if (leave.slot === 'FIRST_HALF')
        return { label: '1st Half', time: '10:00 AM → 2:30 PM', singleTime: false };
      if (leave.slot === 'SECOND_HALF')
        return { label: '2nd Half', time: '2:30 PM → 7:00 PM', singleTime: false };
      if (leave.slot === 'CUSTOM' && leave.startTime && leave.endTime)
        return { label: 'Custom', time: `${to12hr(leave.startTime)} → ${to12hr(leave.endTime)}`, singleTime: false };
      // legacy records without slot
      if (leave.startTime)
        return { label: getHalfLabel(leave), time: `${to12hr(leave.startTime)} → ${to12hr(leave.endTime)}`, singleTime: false };
      return { label: 'Half Day', time: '--', singleTime: true };
    }
    case 'EARLY':
      return leave.startTime
        ? { label: 'Early Leave', time: `By ${to12hr(leave.startTime)}`, singleTime: true }
        : null;
    case 'LATE':
      return leave.startTime
        ? { label: 'Late Arrival', time: `By ${to12hr(leave.startTime)}`, singleTime: true }
        : null;
    case 'WORK_FROM_HOME':
      return { label: 'WFH', time: 'Full Day', singleTime: true };
    default:
      if (leave.startTime) {
        return { label: 'Custom Shift', time: `${to12hr(leave.startTime)} → ${to12hr(leave.endTime)}`, singleTime: false };
      }
      return null;
  }
};

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
  const [showCommentModal, setShowCommentBox] = useState(false);
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
    return date.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
      totalDays: employeeLeaves.reduce((sum, l) => sum + l.days, 0),
    };
  };

  const handleSearchEmployee = () => {
    if (!searchEmployee.trim()) return;
    setEmployeeStats(getCurrentMonthLeaves(searchEmployee.trim()));
    setShowStatsModal(true);
  };

  const handleActionClick = (leaveId: number, action: 'approve' | 'reject') => {
    setActionLeaveId(leaveId);
    setCurrentAction(action);
    setComment(viewModalComment || '');
    setShowCommentBox(true);
  };

  const handleConfirmAction = async () => {
    if (!actionLeaveId || !currentAction) return;
    if (currentAction === 'reject' && !comment.trim()) {
      toast.warning('Please provide a comment when rejecting a leave request');
      return;
    }
    setIsSubmitting(true);
    try {
      if (currentAction === 'approve') {
        await onApprove(actionLeaveId, comment.trim() || undefined);
      } else {
        await onReject(actionLeaveId, comment.trim());
      }
      setShowCommentBox(false);
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

  const prevMonth = () => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const ShiftPill = ({ leave, label }: { leave: Leave; label: string }) => {
    switch (leave.type) {
      case 'HALF': return <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-md uppercase">{label}</span>;
      case 'EARLY': return <span className="text-[9px] font-black px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-md uppercase">{label}</span>;
      case 'LATE': return <span className="text-[9px] font-black px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md uppercase">{label}</span>;
      case 'WORK_FROM_HOME': return <span className="text-[9px] font-black px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-md uppercase">{label}</span>;
      default: return <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md uppercase">{label}</span>;
    }
  };

  /* ── Merged Type + Shift + Holiday cell ── */
  const TypeShiftCell = ({ leave }: { leave: Leave }) => {
    const holidaysInRange = getHolidaysInRange(leave.startDate, leave.endDate);
    const appliedOptionalHoliday = (leave.isOptional || leave.type === 'OPTIONAL')
      ? holidaysInRange.find(h => h.type === 'OPTIONAL') : null;
    const fixedHoliday = holidaysInRange.find(h => h.type === 'FIXED');
    const shiftDetails = getShiftDetails(leave);

    return (
      <div className="flex flex-col gap-1.5 items-start">
        {/* Leave type badge */}
        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/30 whitespace-nowrap">
          {leave.type.replace('_', ' ')}
        </span>

        {/* Shift timing inline — only when relevant */}
        {shiftDetails && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <ShiftPill leave={leave} label={shiftDetails.label} />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{shiftDetails.time}</span>
          </div>
        )}

        {/* Optional holiday */}
        {appliedOptionalHoliday && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase">
            <Sparkles size={8} /> {appliedOptionalHoliday.name}
          </span>
        )}

        {/* Fixed half-day holiday */}
        {fixedHoliday?.isHalfDay && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-[8px] font-black uppercase border border-amber-200 dark:border-amber-800">
            <Clock size={8} /> {fixedHoliday.name} (Half)
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ── FILTER BAR ── */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 p-4 sm:p-6 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700/50 self-start sm:self-auto">
            <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all active:scale-90">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center space-x-3 px-3 sm:px-4 min-w-[150px] sm:min-w-[180px] justify-center text-center">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs text-gray-700 dark:text-slate-200">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all active:scale-90">
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
                {uniqueEmployees.map((name) => <option key={name as string} value={name as string} />)}
              </datalist>
            </div>
            <button
              onClick={handleSearchEmployee}
              className="px-4 sm:px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all flex items-center space-x-2 whitespace-nowrap shadow-xl shadow-slate-200 dark:shadow-none active:scale-95"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:inline">Analyze Data</span>
              <Search className="w-4 h-4 sm:hidden" />
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Employee</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Dates</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Type & Schedule</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Days</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Status</th>
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                      <p className="text-gray-400 dark:text-slate-500 font-bold tracking-tight italic">No applications found for this month</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-all group">
                    {/* Employee */}
                    <td className="px-8 py-5">
                      <button
                        onClick={() => { setEmployeeStats(getCurrentMonthLeaves(leave.user?.name || '')); setShowStatsModal(true); }}
                        className="text-left group/emp"
                      >
                        <p className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover/emp:text-indigo-600 dark:group-hover/emp:text-indigo-400 transition-colors">{leave.user?.name}</p>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 lowercase">{leave.user?.email}</p>
                      </button>
                    </td>

                    {/* Dates */}
                    <td className="px-6 py-5">
                      <p className="text-sm font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatDate(leave.startDate)}
                        <span className="text-slate-300 mx-1.5">→</span>
                        {formatDate(leave.endDate)}
                      </p>
                      {leave.isEdited && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] text-amber-600 dark:text-amber-500 font-black uppercase italic px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 rounded border border-amber-100 dark:border-amber-800">
                          <History size={9} /> Revised
                        </span>
                      )}
                    </td>

                    {/* Type + Shift merged */}
                    <td className="px-6 py-5">
                      <TypeShiftCell leave={leave} />
                    </td>

                    {/* Days */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="text-sm font-black text-slate-900 dark:text-slate-300">{leave.days}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Days</span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${getStatusColor(leave.status as LeaveStatus)}`}>
                        {getStatusIcon(leave.status as LeaveStatus)}
                        <span>{leave.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setSelectedLeave(leave); setViewModalComment(leave.managerComment || ''); }}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all active:scale-90"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {leave.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleActionClick(leave.id, 'approve')}
                              className="p-2.5 text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white dark:bg-slate-800 rounded-xl transition-all active:scale-90"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleActionClick(leave.id, 'reject')}
                              className="p-2.5 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:bg-slate-800 rounded-xl transition-all active:scale-90"
                              title="Reject"
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

      {/* ── MOBILE CARD VIEW ── */}
      <div className="md:hidden space-y-2.5">
        {filteredLeaves.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 px-6 py-16 flex flex-col items-center">
            <FileText className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
            <p className="text-gray-400 dark:text-slate-500 font-bold text-sm italic">No applications found for this month</p>
          </div>
        ) : (
          filteredLeaves.map(leave => {
            const holidaysInRange = getHolidaysInRange(leave.startDate, leave.endDate);
            const appliedOptionalHoliday = (leave.isOptional || leave.type === 'OPTIONAL')
              ? holidaysInRange.find(h => h.type === 'OPTIONAL') : null;
            const fixedHoliday = holidaysInRange.find(h => h.type === 'FIXED');
            const shiftDetails = getShiftDetails(leave);
            const isSameDay = leave.startDate.slice(0, 10) === leave.endDate.slice(0, 10);

            return (
              <div
                key={leave.id}
                onClick={() => { setSelectedLeave(leave); setViewModalComment(leave.managerComment || ''); }}
                className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm active:bg-slate-50 dark:active:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 px-3.5 py-3">

                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: employee name + status */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">{leave.user?.name}</p>
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase ring-1 ring-inset flex-shrink-0 ${getStatusColor(leave.status as LeaveStatus)}`}>
                        {getStatusIcon(leave.status as LeaveStatus)}
                        <span>{leave.status}</span>
                      </span>
                      <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800/30 flex-shrink-0">
                        {leave.type.replace('_', ' ')}
                      </span>
                      {leave.isEdited && (
                        <span className="inline-flex items-center gap-0.5 text-[7px] text-amber-600 font-black uppercase bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 flex-shrink-0">
                          <History size={7} /> Rev
                        </span>
                      )}
                      {appliedOptionalHoliday && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-600 text-white rounded-full text-[7px] font-black uppercase flex-shrink-0">
                          <Sparkles size={7} /> {appliedOptionalHoliday.name}
                        </span>
                      )}
                    </div>

                    {/* Row 2: dates + days + shift */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">
                        {formatDate(leave.startDate)}
                        {!isSameDay && <><span className="text-slate-300 mx-1">→</span>{formatDate(leave.endDate)}</>}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">· {leave.days} {leave.days === 1 ? 'day' : 'days'}</span>
                      {shiftDetails && (
                        <span className="text-[8px] font-bold text-slate-400 flex-shrink-0">{shiftDetails.time}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: action buttons — stop propagation */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setSelectedLeave(leave); setViewModalComment(leave.managerComment || ''); }}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg transition-all active:scale-90"
                    >
                      <Eye size={14} />
                    </button>
                    {leave.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleActionClick(leave.id, 'approve')}
                          className="w-8 h-8 flex items-center justify-center text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg transition-all active:scale-90"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          onClick={() => handleActionClick(leave.id, 'reject')}
                          className="w-8 h-8 flex items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg transition-all active:scale-90"
                        >
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── APPROVE / REJECT MODAL ── */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[120] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-slate-800">
            <div className={`${currentAction === 'approve' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 sm:px-8 py-5 sm:py-6 flex items-center justify-between`}>
              <h3 className="text-sm font-black uppercase tracking-[0.2em]">{currentAction === 'approve' ? 'Final Confirmation' : 'Rejection Reason'}</h3>
              <button onClick={() => !isSubmitting && setShowCommentBox(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
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
            <div className="px-6 sm:px-8 py-5 sm:py-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
              <button onClick={() => setShowCommentBox(false)} className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmitting || (currentAction === 'reject' && !comment.trim())}
                className={`px-6 sm:px-8 py-3 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center gap-2 shadow-xl active:scale-95 disabled:opacity-50 ${currentAction === 'approve' ? 'bg-green-600' : 'bg-red-600'}`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : currentAction === 'approve' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>{isSubmitting ? 'Syncing...' : 'Submit Decision'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW / DETAIL MODAL ── */}
      {selectedLeave && !showCommentModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800">
            <div className="px-5 sm:px-8 py-5 sm:py-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white italic">Application Review</h3>
              <button onClick={() => setSelectedLeave(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="px-5 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-7 overflow-y-auto">
              {/* Banners */}
              {(() => {
                const holidaysInRange = getHolidaysInRange(selectedLeave.startDate, selectedLeave.endDate);
                const appliedOptionalHoliday = (selectedLeave.isOptional || selectedLeave.type === 'OPTIONAL')
                  ? holidaysInRange.find(h => h.type === 'OPTIONAL') : null;
                const fixedHoliday = holidaysInRange.find(h => h.type === 'FIXED');
                return (
                  <>
                    {appliedOptionalHoliday && (
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30 rounded-[1.5rem] flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">Optional Holiday Used</p>
                          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                            {appliedOptionalHoliday.name} — {formatDate(appliedOptionalHoliday.date)}
                          </p>
                        </div>
                      </div>
                    )}
                    {fixedHoliday?.isHalfDay && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-[1.5rem] flex items-center gap-3">
                        <Info className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Half-Day Notice</p>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Office is partially closed — {fixedHoliday.name}</p>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {selectedLeave.isEdited && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-[1.5rem] flex items-start gap-3">
                  <RefreshCcw className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Modification Summary</p>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 italic">
                      {selectedLeave.editSummary ? `"${selectedLeave.editSummary}"` : 'This leave request has been revised by the employee.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Duration, category, status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Duration</label>
                  <p className="font-black text-slate-900 dark:text-slate-100 text-base">
                    {formatDate(selectedLeave.startDate)} <span className="text-slate-300 mx-1">→</span> {formatDate(selectedLeave.endDate)}
                  </p>
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 mt-1 uppercase">{selectedLeave.days} Work Days</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Status</label>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${getStatusColor(selectedLeave.status as LeaveStatus)}`}>
                    {getStatusIcon(selectedLeave.status as LeaveStatus)}
                    <span>{selectedLeave.status}</span>
                  </span>
                </div>
              </div>

              {/* Type + Shift */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Type & Schedule</label>
                <TypeShiftCell leave={selectedLeave} />
              </div>

              {/* Justification */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Employee Justification</label>
                <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">&quot;{selectedLeave.reason}&quot;</p>
                </div>
              </div>

              {/* Manager comment */}
              <div className="p-5 sm:p-6 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <MessageSquare size={16} />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Management Feedback</h4>
                </div>
                <textarea
                  value={viewModalComment}
                  onChange={(e) => setViewModalComment(e.target.value)}
                  placeholder="Notes for the employee..."
                  rows={3}
                  className="w-full px-5 py-4 bg-white dark:bg-slate-800 border-none rounded-[1.5rem] focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm italic font-medium dark:text-white"
                />
                <div className="flex justify-end">
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

            <div className="px-5 sm:px-8 py-5 sm:py-6 bg-slate-50 dark:bg-slate-800/50 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Received: {formatRequestedTime(selectedLeave.createdAt)}</span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {selectedLeave.status === 'PENDING' && (
                  <>
                    <button onClick={() => handleActionClick(selectedLeave.id, 'approve')} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => handleActionClick(selectedLeave.id, 'reject')} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedLeave(null)} className="flex-1 sm:flex-none px-6 sm:px-10 py-2.5 sm:py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EMPLOYEE STATS MODAL ── */}
      {showStatsModal && employeeStats && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-slate-800">
            <div className="bg-slate-900 dark:bg-indigo-700 text-white px-6 sm:px-8 py-5 sm:py-6 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em]">Employee Insights</h3>
              <button onClick={() => setShowStatsModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
              <div className="text-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Selected Employee</label>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">{employeeStats.name}</p>
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-3 bg-indigo-50 dark:bg-indigo-900/40 inline-block px-3 py-1 rounded-full uppercase tracking-tighter">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 sm:p-6 text-center border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Requests</p>
                  <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-indigo-400">{employeeStats.totalLeaves}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 sm:p-6 text-center border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Days Off</p>
                  <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-indigo-400">{employeeStats.totalDays}</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Approved', val: employeeStats.approvedLeaves, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                  { label: 'Pending',  val: employeeStats.pendingLeaves,  color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                  { label: 'Rejected', val: employeeStats.rejectedLeaves, color: 'text-red-600',   bg: 'bg-red-50 dark:bg-red-900/20' },
                ].map((row) => (
                  <div key={row.label} className={`flex items-center justify-between p-4 ${row.bg} rounded-2xl`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${row.color}`}>{row.label}</span>
                    <span className={`text-xl font-black ${row.color}`}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 sm:px-8 py-5 sm:py-6 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end">
              <button onClick={() => setShowStatsModal(false)} className="px-8 sm:px-10 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Close Analytics</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};