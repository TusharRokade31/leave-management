"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getStatusIcon } from '@/utils/getStatusIcon';
import { formatDate } from '@/utils/formatDate';
import { getStatusColor } from '@/utils/getStatusColors';
import { 
  Eye, X, Edit2, Save, Calendar, Clock, 
  FileText, MessageSquare, RefreshCcw, Trash2,
  ChevronLeft, ChevronRight, Sparkles, Loader2, History,
  ArrowRight, AlertCircle
} from 'lucide-react';
import { HOLIDAY_DATA, getHoliday } from '@/lib/holidays';

type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface TableLeave {
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
  status: string;
  managerComment?: string | null;
  createdAt: string;
  updatedAt: string; 
  isEdited?: boolean; 
  editSummary?: string | null; 
  isOptional?: boolean;
  holidayName?: string | null;
}

interface EmployeeLeaveTableProps {
  leaves: TableLeave[];
  onDelete: (leaveId: number) => Promise<void>;
  onUpdate: (leaveId: number, updatedData: Partial<TableLeave>) => Promise<void>;
}

const getHolidaysInRange = (start: string, end: string) => {
  const s = new Date(start.split('T')[0]);
  const e = new Date(end.split('T')[0]);
  return HOLIDAY_DATA.filter(h => {
    const hDate = new Date(h.date);
    return hDate >= s && hDate <= e;
  });
};

const isOptionalLeave = (leave: TableLeave): boolean =>
  // ✅ ONLY check isOptional flag — holidayName alone does NOT mean OH was used.
  // Old leaves that overlap an optional holiday date may have holidayName set
  // without the employee having intentionally used their OH quota.
  leave.isOptional === true;

const format12hr = (time?: string | null) => {
  if (!time) return "";
  if (/[AaPp][Mm]/.test(time)) return time;
  const [h, m] = time.split(':');
  let hours = parseInt(h);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${m} ${ampm}`;
};

// ── Returns a human-readable schedule string for EARLY / LATE / HALF ────────
const getScheduleLabel = (leave: TableLeave): string => {
  switch (leave.type) {
    case 'EARLY':
      return leave.startTime ? `Early leave by ${format12hr(leave.startTime)}` : 'Early Leave';
    case 'LATE':
      return leave.startTime ? `Late arrival by ${format12hr(leave.startTime)}` : 'Late Arrival';
    case 'HALF':
      if (leave.slot === 'FIRST_HALF')  return '1st Half · 10:00 AM – 2:30 PM';
      if (leave.slot === 'SECOND_HALF') return '2nd Half · 2:30 PM – 7:00 PM';
      if (leave.slot === 'CUSTOM' && leave.startTime)
        return `${format12hr(leave.startTime)}${leave.endTime ? ` – ${format12hr(leave.endTime)}` : ''}`;
      // fallback for legacy records without slot
      if (leave.startTime)
        return `${format12hr(leave.startTime)}${leave.endTime ? ` – ${format12hr(leave.endTime)}` : ''}`;
      return 'Half Day';
    default:
      return '';
  }
};

// ── Short label for mobile card row ─────────────────────────────────────────
const getShortScheduleLabel = (leave: TableLeave): string => {
  switch (leave.type) {
    case 'EARLY':
      return leave.startTime ? `By ${format12hr(leave.startTime)}` : 'Early';
    case 'LATE':
      return leave.startTime ? `By ${format12hr(leave.startTime)}` : 'Late';
    case 'HALF':
      if (leave.slot === 'FIRST_HALF')  return '1st Half';
      if (leave.slot === 'SECOND_HALF') return '2nd Half';
      if (leave.startTime) return format12hr(leave.startTime);
      return 'Half Day';
    default:
      return '';
  }
};

export const EmployeeLeaveTable: React.FC<EmployeeLeaveTableProps> = ({ leaves, onDelete, onUpdate }) => {
  const [selectedLeave, setSelectedLeave] = useState<TableLeave | null>(null);
  const [editingLeave, setEditingLeave] = useState<TableLeave | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date()); 
  
  const [editForm, setEditForm] = useState({
    startDate: "",
    endDate: "",
    type: "",
    reason: "",
    startTime: "",
    endTime: "",
    slot: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredLeaves = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    return leaves.filter(leave => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      return leaveStart <= endOfMonth && leaveEnd >= startOfMonth;
    });
  }, [leaves, currentMonth]);

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const handleEditInit = (leave: TableLeave) => {
    setEditingLeave(leave);
    setEditForm({
      startDate: leave.startDate.split('T')[0],
      endDate: leave.endDate.split('T')[0],
      type: leave.type,
      reason: leave.reason,
      startTime: leave.startTime || "",
      endTime: leave.endTime || "",
      slot: leave.slot || ""
    });
  };

  const isWithinEditWindow = (createdAt: string): boolean => {
    if (!createdAt) return false;
    const createdDate = new Date(createdAt);
    const deadline = new Date(createdDate);
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(12, 0, 0, 0);
    return new Date() < deadline;
  };

  const handleSaveEdit = async () => {
    if (!editingLeave) return;
    setIsSubmitting(true);
    try {
      const changes: string[] = [];
      const originalStart = editingLeave.startDate.split('T')[0];
      const originalEnd = editingLeave.endDate.split('T')[0];
      const start = new Date(editForm.startDate);
      const end = new Date(editForm.endDate);
      start.setHours(12, 0, 0, 0);
      end.setHours(12, 0, 0, 0);
      let newDays = 1;
      if (['FULL', 'WORK_FROM_HOME'].includes(editForm.type)) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        newDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
      if (editForm.startDate !== originalStart || editForm.endDate !== originalEnd) changes.push("Dates");
      if (editForm.type !== editingLeave.type) changes.push("Type");
      if (editForm.reason !== editingLeave.reason) changes.push("Reason");
      if (editForm.startTime !== (editingLeave.startTime || "")) changes.push("Timing");
      await onUpdate(editingLeave.id, {
        ...editForm,
        days: newDays,
        status: 'PENDING',
        isEdited: true,
        updatedAt: new Date().toISOString(),
        editSummary: changes.length > 0 ? `Changed ${changes.join(', ')}` : "Updated details"
      });
      setEditingLeave(null);
    } catch (error) {
      console.error("Failed to update leave:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSlotChange = (slot: string) => {
    const times: Record<string, { start: string; end: string }> = {
      FIRST_HALF: { start: '10:00', end: '14:30' },
      SECOND_HALF: { start: '14:30', end: '19:00' },
      CUSTOM: { start: editForm.startTime || '', end: editForm.endTime || '' }
    };
    const selected = times[slot];
    setEditForm(prev => ({ ...prev, slot, startTime: selected.start, endTime: selected.end }));
  };

  if (leaves.length === 0) return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 p-8 sm:p-16 text-center">
      <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
      <p className="text-gray-400 font-bold italic text-xs sm:text-sm">No applications found in your history.</p>
    </div>
  );

  return (
    <>
      {/* Month Selector Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 p-3 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center w-full sm:w-auto space-x-2 bg-slate-50 dark:bg-slate-800 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg sm:rounded-xl transition-all active:scale-90">
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300" />
            </button>
            <div className="flex flex-1 items-center space-x-3 px-2 sm:px-4 min-w-[140px] sm:min-w-[180px] justify-center text-center">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-black uppercase tracking-tighter sm:tracking-widest text-[10px] sm:text-xs text-gray-700 dark:text-slate-200 whitespace-nowrap">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg sm:rounded-xl shadow-sm transition-all active:scale-90">
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300" />
            </button>
          </div>
          <div className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Employee Personal Log</div>
        </div>
      </div>

      <div className="w-full">

        {/* ── Mobile: compact single-row cards ── */}
        <div className="grid grid-cols-1 gap-2.5 md:hidden">
          {filteredLeaves.map(leave => {
            const holidaysInRange = getHolidaysInRange(leave.startDate, leave.endDate);
            const fixedHoliday = holidaysInRange.find(h => h.type === 'FIXED');
            const appliedOptionalHoliday = isOptionalLeave(leave)
              ? holidaysInRange.find(h => h.type === "OPTIONAL") : null;
            const isSameDay = leave.startDate.slice(0, 10) === leave.endDate.slice(0, 10);
            const shortSchedule = getShortScheduleLabel(leave);

            return (
              <div
                key={leave.id}
                onClick={() => setSelectedLeave(leave)}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 dark:active:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 px-3.5 py-3">

                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: status + type + revised */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase ring-1 ring-inset ${getStatusColor(leave.status as any)}`}>
                        {getStatusIcon(leave.status as any)}
                        <span>{leave.status}</span>
                      </span>
                      <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800/30">
                        {leave.type.replace('_', ' ')}
                      </span>
                      {leave.isEdited && (
                        <span className="inline-flex items-center gap-0.5 text-[7px] text-amber-600 font-black uppercase bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                          <History size={7} /> Rev
                        </span>
                      )}
                      {appliedOptionalHoliday && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-600 text-white rounded-full text-[7px] font-black uppercase">
                          <Sparkles size={7} /> {appliedOptionalHoliday.name}
                        </span>
                      )}
                    </div>

                    {/* Row 2: dates + days + schedule */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                        {formatDate(leave.startDate)}
                        {!isSameDay && <><span className="text-slate-300 mx-1">→</span>{formatDate(leave.endDate)}</>}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">
                        · {leave.days} {leave.days === 1 ? 'day' : 'days'}
                      </span>
                      {shortSchedule && (
                        <span className="text-[8px] font-bold text-slate-400 flex-shrink-0">{shortSchedule}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: action buttons — stop propagation so they don't open the modal */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedLeave(leave)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg transition-all active:scale-90"
                    >
                      <Eye size={14} />
                    </button>
                    {isWithinEditWindow(leave.createdAt) && (
                      <button
                        onClick={() => handleEditInit(leave)}
                        className="w-8 h-8 flex items-center justify-center text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg transition-all active:scale-90"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {leave.status === 'PENDING' && (
                      <button
                        onClick={() => onDelete(leave.id)}
                        className="w-8 h-8 flex items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg transition-all active:scale-90"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Desktop: table ── */}
        <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-slate-50">
                <tr>
                  <th className="px-8 py-5 text-left">Dates & Schedule</th>
                  <th className="px-6 py-5 text-left">Type & Holiday</th>
                  <th className="px-6 py-5 text-left">Total Days</th>
                  <th className="px-6 py-5 text-left">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                {filteredLeaves.map(leave => {
                  const holidaysInRange = getHolidaysInRange(leave.startDate, leave.endDate);
                  const fixedHoliday = holidaysInRange.find(h => h.type === 'FIXED');
                  const appliedOptionalHoliday = isOptionalLeave(leave)
                    ? holidaysInRange.find(h => h.type === "OPTIONAL") : null;
                  const scheduleLabel = getScheduleLabel(leave);
                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-all group">
                      <td className="px-8 py-5">
                        <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                          {formatDate(leave.startDate)} <span className="text-slate-300 mx-1">→</span> {formatDate(leave.endDate)}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {leave.isEdited && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 font-black uppercase italic"><History size={10} /> Revised</span>
                          )}
                          {/* ── Fixed: use getScheduleLabel instead of broken slot?.replace logic ── */}
                          {['HALF', 'EARLY', 'LATE'].includes(leave.type) && scheduleLabel && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-[11px] font-black text-indigo-600 uppercase border border-indigo-100 dark:border-indigo-800/50">
                              {scheduleLabel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/30 whitespace-nowrap">
                            {leave.type.replace('_', ' ')}
                          </span>
                          {appliedOptionalHoliday && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase shadow-sm">
                              <Sparkles size={8} /> {appliedOptionalHoliday.name}
                            </span>
                          )}
                          {fixedHoliday && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${fixedHoliday.isHalfDay ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {fixedHoliday.name} ({fixedHoliday.isHalfDay ? 'Half' : 'Full'})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-slate-900 dark:text-slate-300 whitespace-nowrap">
                        {leave.days} <span className="text-[10px] font-bold text-slate-400 uppercase">Days</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${getStatusColor(leave.status as any)}`}>
                          {getStatusIcon(leave.status as any)}
                          <span>{leave.status}</span>
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => setSelectedLeave(leave)} className="p-2.5 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all active:scale-90"><Eye size={16} /></button>
                          {isWithinEditWindow(leave.createdAt) && <button onClick={() => handleEditInit(leave)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-90"><Edit2 size={16} /></button>}
                          {leave.status === 'PENDING' && <button onClick={() => onDelete(leave.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedLeave && (() => {
        const modalHolidays = getHolidaysInRange(selectedLeave.startDate, selectedLeave.endDate);
        const modalFixedHoliday = modalHolidays.find(h => h.type === 'FIXED');
        const modalOptionalHoliday = isOptionalLeave(selectedLeave)
          ? modalHolidays.find(h => h.type === 'OPTIONAL') : null;
        const changedFields = selectedLeave.isEdited && selectedLeave.editSummary
          ? selectedLeave.editSummary.replace('Changed ', '').split(', ')
          : [];
        const modalScheduleLabel = getScheduleLabel(selectedLeave);
        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[130] p-0 sm:p-4 animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800">
              <div className="px-6 sm:px-8 py-5 sm:py-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white italic">Application Review</h3>
                  {selectedLeave.isEdited && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase border border-amber-200 dark:border-amber-700">
                      <History size={9} /> Revised
                    </span>
                  )}
                </div>
                <button onClick={() => setSelectedLeave(null)} className="p-2 text-slate-400 hover:rotate-90 transition-all"><X className="w-5 h-5" /></button>
              </div>
              <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-7 overflow-y-auto">
                {selectedLeave.isEdited && (
                  <div className="p-4 sm:p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-[1.5rem] flex items-start gap-3">
                    <RefreshCcw className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Modification Summary</p>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 italic">&quot;{selectedLeave.editSummary || 'Updated details'}&quot;</p>
                    </div>
                  </div>
                )}
                {modalOptionalHoliday && (
                  <div className="p-4 sm:p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-[1.5rem] flex items-start gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl shrink-0 mt-0.5"><Sparkles className="w-4 h-4 text-white" /></div>
                    <div>
                      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Optional Holiday Used</p>
                      <p className="text-sm font-black text-indigo-900 dark:text-indigo-100">{modalOptionalHoliday.name}</p>
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{formatDate(modalOptionalHoliday.date)} — Optional holiday quota applied.</p>
                    </div>
                  </div>
                )}
                <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border flex flex-col sm:flex-row gap-4 sm:items-center justify-between ${changedFields.includes('Type') ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-800/50' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl text-white shadow-lg ${changedFields.includes('Type') ? 'bg-amber-500' : 'bg-indigo-600'}`}><Clock size={18} /></div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-[9px] font-black uppercase tracking-widest ${changedFields.includes('Type') ? 'text-amber-600' : 'text-indigo-600'}`}>Schedule Type</p>
                        {changedFields.includes('Type') && <span className="text-[8px] font-black bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200 px-1.5 py-0.5 rounded uppercase">Edited</span>}
                      </div>
                      <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase">{selectedLeave.type.replace('_', ' ')}</p>
                      {modalFixedHoliday && (
                        <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${modalFixedHoliday.isHalfDay ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {modalFixedHoliday.name} ({modalFixedHoliday.isHalfDay ? 'Half' : 'Full'})
                        </span>
                      )}
                    </div>
                  </div>
                  {/* ── Fixed: show schedule label for EARLY/LATE/HALF properly ── */}
                  {['EARLY', 'LATE', 'HALF'].includes(selectedLeave.type) && modalScheduleLabel && (
                    <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0">
                      <div className="flex sm:justify-end items-center gap-2">
                        {changedFields.includes('Timing') && <span className="text-[8px] font-black bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200 px-1.5 py-0.5 rounded uppercase">Edited</span>}
                        <p className={`text-[9px] font-black uppercase ${changedFields.includes('Timing') ? 'text-amber-500' : 'text-slate-400'}`}>Timing</p>
                      </div>
                      <p className={`text-xs sm:text-sm font-black ${changedFields.includes('Timing') ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'}`}>
                        {modalScheduleLabel}
                      </p>
                    </div>
                  )}
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 sm:p-5 rounded-2xl border ${changedFields.includes('Dates') ? 'border-amber-300 dark:border-amber-800/50 bg-amber-50/20 dark:bg-amber-900/5' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duration</label>
                      {changedFields.includes('Dates') && <span className="text-[8px] font-black bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200 px-1.5 py-0.5 rounded uppercase">Edited</span>}
                    </div>
                    <p className={`font-bold text-sm sm:text-lg ${changedFields.includes('Dates') ? 'text-amber-900 dark:text-amber-200' : 'text-slate-900 dark:text-slate-100'}`}>
                      {formatDate(selectedLeave.startDate)} <ArrowRight size={12} className="inline mx-1 text-slate-300" /> {formatDate(selectedLeave.endDate)}
                    </p>
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 mt-1 uppercase">{selectedLeave.days} Work Days</p>
                  </div>
                  <div className="sm:text-right">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                    <span className={`inline-block px-3 py-1 font-black text-[10px] uppercase rounded-lg border ${getStatusColor(selectedLeave.status as any)}`}>{selectedLeave.status}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">My Justification</label>
                    {changedFields.includes('Reason') && <span className="text-[8px] font-black bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200 px-1.5 py-0.5 rounded uppercase">Edited</span>}
                  </div>
                  <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border italic text-xs sm:text-sm ${changedFields.includes('Reason') ? 'bg-amber-50/40 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    &quot;{selectedLeave.reason}&quot;
                  </div>
                </div>
                {selectedLeave.managerComment && (
                  <div className="p-5 sm:p-6 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl sm:rounded-[2rem] space-y-2">
                    <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-2 tracking-widest"><MessageSquare size={14}/> Manager Feedback</p>
                    <p className="text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-200 italic leading-relaxed">&quot;{selectedLeave.managerComment}&quot;</p>
                  </div>
                )}
              </div>
              <div className="px-6 sm:px-8 py-5 sm:py-6 bg-slate-50 dark:bg-slate-800/50 border-t mt-auto">
                <button onClick={() => setSelectedLeave(null)} className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Dismiss</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* EDIT MODAL */}
      {editingLeave && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[130] p-0 sm:p-4 animate-in fade-in slide-in-from-bottom-10 duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800">
            <div className="px-6 sm:px-8 py-5 sm:py-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] italic">Revise Application</h3>
              <button onClick={() => setEditingLeave(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
                  <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({...editForm, startDate: e.target.value, endDate: ['HALF', 'EARLY', 'LATE'].includes(editForm.type) ? e.target.value : editForm.endDate })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">End Date</label>
                  <input type="date" disabled={['HALF', 'EARLY', 'LATE'].includes(editForm.type)} value={editForm.endDate} onChange={(e) => setEditForm({...editForm, endDate: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm disabled:opacity-40" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                <select value={editForm.type} onChange={(e) => setEditForm({...editForm, type: e.target.value, endDate: ['HALF', 'EARLY', 'LATE'].includes(e.target.value) ? editForm.startDate : editForm.endDate })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl sm:rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm appearance-none">
                  <option value="FULL">Full Day</option>
                  <option value="HALF">Half Day</option>
                  <option value="EARLY">Early Leave</option>
                  <option value="LATE">Late Arrival</option>
                  <option value="WORK_FROM_HOME">WFH</option>
                </select>
              </div>
              {['HALF', 'EARLY', 'LATE'].includes(editForm.type) && (
                <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                  {editForm.type === 'HALF' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {['FIRST_HALF', 'SECOND_HALF', 'CUSTOM'].map(s => (
                          <button key={s} type="button" onClick={() => handleSlotChange(s)} className={`py-3 rounded-xl text-[8px] font-black uppercase border-2 transition-all ${editForm.slot === s ? 'border-indigo-600 bg-white text-indigo-600 shadow-sm' : 'border-transparent bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                            {s.split('_')[0]}
                          </button>
                        ))}
                      </div>
                      {editForm.slot === 'CUSTOM' && (
                        <div className="grid grid-cols-2 gap-3">
                          <input type="time" value={editForm.startTime} onChange={e => setEditForm(p => ({...p, startTime: e.target.value}))} className="w-full p-3 bg-white dark:bg-slate-700 rounded-xl font-bold text-xs" />
                          <input type="time" value={editForm.endTime} onChange={e => setEditForm(p => ({...p, endTime: e.target.value}))} className="w-full p-3 bg-white dark:bg-slate-700 rounded-xl font-bold text-xs" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <input type="time" value={editForm.startTime} onChange={e => setEditForm(p => ({...p, startTime: e.target.value}))} className="w-full p-4 bg-white dark:bg-slate-700 rounded-xl font-bold text-sm" />
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Reason</label>
                <textarea value={editForm.reason} onChange={(e) => setEditForm({...editForm, reason: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-xl sm:rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] text-sm italic" />
              </div>
            </div>
            <div className="px-6 sm:px-8 py-5 sm:py-6 bg-slate-50 dark:bg-slate-800 border-t flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-auto">
              <button onClick={() => setEditingLeave(null)} className="py-3 px-6 text-[10px] font-black uppercase text-slate-400">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isSubmitting} className="flex items-center justify-center space-x-3 w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-black uppercase text-[10px] disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={14} />}
                <span>Apply Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};