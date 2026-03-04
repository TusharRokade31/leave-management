"use client";
import React, { useState, useMemo } from 'react';
import { getStatusIcon } from '@/utils/getStatusIcon';
import { formatDate } from '@/utils/formatDate';
import { getStatusColor } from '@/utils/getStatusColors';
import { 
  Eye, X, Edit2, Save, Calendar, Clock, 
  FileText, MessageSquare, RefreshCcw, Trash2,
  ChevronLeft, ChevronRight 
} from 'lucide-react';

// 1. FIXED: Define LeaveStatus globally to resolve casting red lines in getStatusIcon/Color
type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' ;

interface TableLeave {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
  type: string;
  days: number;
  status: string;
  managerComment?: string | null;
  createdAt: string;
  updatedAt: string; 
  isEdited?: boolean; 
  editSummary?: string | null; 
}

interface EmployeeLeaveTableProps {
  leaves: TableLeave[];
  onDelete: (leaveId: number) => Promise<void>;
  onUpdate: (leaveId: number, updatedData: Partial<TableLeave>) => Promise<void>;
}

export const EmployeeLeaveTable: React.FC<EmployeeLeaveTableProps> = ({ leaves, onDelete, onUpdate }) => {
  const [selectedLeave, setSelectedLeave] = useState<TableLeave | null>(null);
  const [editingLeave, setEditingLeave] = useState<TableLeave | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Added Month Selector State
  
  const [editForm, setEditForm] = useState({
    startDate: "",
    endDate: "",
    type: "",
    reason: "",
    startTime: "",
    endTime: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter Logic: Only show leaves overlapping with the selected month
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
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(nextMonth);
  };

  // 2. FIXED: Implemented formatRequestedTime to resolve red line in Details modal
  const formatRequestedTime = (timestamp: string | undefined): string => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleEditInit = (leave: TableLeave) => {
    setEditingLeave(leave);
    setEditForm({
      startDate: leave.startDate.split('T')[0],
      endDate: leave.endDate.split('T')[0],
      type: leave.type,
      reason: leave.reason,
      startTime: leave.startTime || "",
      endTime: leave.endTime || ""
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
      
      if (editForm.startDate !== originalStart || editForm.endDate !== originalEnd) changes.push("Dates");
      if (editForm.type !== editingLeave.type) changes.push("Type");
      if (editForm.reason !== editingLeave.reason) changes.push("Reason");
      if (editForm.startTime !== (editingLeave.startTime || "")) changes.push("Timing");

      const wasDecided = editingLeave.status !== 'PENDING';
      let editSummaryText = changes.length > 0 ? `Changed ${changes.join(', ')}` : "Updated details";
      if (wasDecided) editSummaryText += " (Status reset to Pending)";

      await onUpdate(editingLeave.id, {
        ...editForm,
        status: 'PENDING',
        isEdited: true,
        updatedAt: new Date().toISOString(),
        editSummary: editSummaryText 
      });
      setEditingLeave(null);
    } catch (error) {
      console.error("Failed to update leave:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (leaves.length === 0) return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-12 text-center transition-colors">
      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileText className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-gray-500 dark:text-slate-400 font-medium tracking-tight text-sm">No leave requests found in your history.</p>
    </div>
  );

  return (
    <>
      {/* MONTH SELECTOR BAR */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-gray-100 dark:border-slate-800 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
            <Calendar size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">History Log</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
            <ChevronLeft size={20} className="text-slate-400" />
          </button>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden space-y-4">
        {filteredLeaves.length === 0 ? (
          <p className="text-center py-10 text-slate-400 font-bold italic">No requests found for this month.</p>
        ) : (
          filteredLeaves.map(leave => (
            <div key={leave.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{leave.type}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                  </p>
                  {leave.isEdited && (
                    <span className="inline-block px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-[9px] text-amber-600 font-bold uppercase rounded-md italic">Edited</span>
                  )}
                </div>
                <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase ring-1 ring-inset ${getStatusColor(leave.status as LeaveStatus)}`}>
                  {getStatusIcon(leave.status as LeaveStatus)}
                  <span>{leave.status}</span>
                </span>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic tracking-tight">&quot;{leave.reason}&quot;</p>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                <button onClick={() => setSelectedLeave(leave)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                  <Eye size={14} /> Details
                </button>
                {isWithinEditWindow(leave.createdAt) && (
                  <button onClick={() => handleEditInit(leave)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                    <Edit2 size={14} /> Edit
                  </button>
                )}
                {leave.status === 'PENDING' && (
                  <button onClick={() => onDelete(leave.id)} className="p-2.5 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em]">Dates & Schedule</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em]">Category</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em]">Justification</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em]">Status</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                        <p className="text-gray-400 dark:text-slate-500 font-bold tracking-tight italic">No applications found for this month.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-8 py-5 text-sm text-nowrap">
                      <div className="text-slate-900 dark:text-slate-100 font-bold flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {formatDate(leave.startDate)} <span className="text-slate-300 mx-1">→</span> {formatDate(leave.endDate)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{leave.days} Days</span>
                         {leave.isEdited && <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-[9px] text-amber-600 font-bold uppercase rounded italic border border-amber-100 dark:border-amber-800/30">Edited</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-md text-nowrap">
                          {leave.type}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[200px] italic">&quot;{leave.reason}&quot;</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${getStatusColor(leave.status as LeaveStatus)}`}>
                        {getStatusIcon(leave.status as LeaveStatus)}
                        <span>{leave.status}</span>
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => setSelectedLeave(leave)} className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all" title="View Details">
                          <Eye size={16} />
                        </button>
                        {isWithinEditWindow(leave.createdAt) && (
                          <button onClick={() => handleEditInit(leave)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all" title="Edit Request">
                            <Edit2 size={16} />
                          </button>
                        )}
                        {leave.status === 'PENDING' && (
                          <button onClick={() => onDelete(leave.id)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-all" title="Delete">
                              <Trash2 size={16} />
                          </button>
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

      {/* VIEW DETAILS MODAL */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[120] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white">
              <h3 className="text-sm font-black uppercase tracking-[0.2em]">Application Details</h3>
              <button onClick={() => setSelectedLeave(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto">
              {selectedLeave.isEdited && selectedLeave.editSummary && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-[1.5rem]">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-2 text-nowrap">
                    <RefreshCcw size={12}/> Update Log
                  </p>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{selectedLeave.editSummary}</p>
                </div>
              )}

              {selectedLeave.managerComment && (
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-[2rem] space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-nowrap">
                    <MessageSquare size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Decision Feedback</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100 italic leading-relaxed">
                    &quot;{selectedLeave.managerComment}&quot;
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Timeframe</label>
                  <div className="text-slate-900 dark:text-slate-200 font-bold">
                    {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)}
                    <span className="block text-indigo-600 dark:text-indigo-400 text-[10px] mt-1 uppercase font-black text-nowrap">{selectedLeave.days} Days Total</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Leave Type</label>
                  <p className="text-slate-900 dark:text-slate-200 font-black uppercase tracking-tighter text-lg leading-none">{selectedLeave.type}</p>
                </div>
              </div>

              {selectedLeave.startTime && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-4 border border-slate-100 dark:border-slate-800">
                   <Clock className="text-indigo-500" size={20} />
                   <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Scheduled Window</label>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 italic">
                        {selectedLeave.startTime} {selectedLeave.endTime ? `till ${selectedLeave.endTime}` : ''}
                      </p>
                   </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Justification</label>
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                   <FileText size={14} className="text-slate-400 mb-2" />
                  <p className="text-sm text-slate-900 dark:text-slate-300 italic whitespace-pre-wrap leading-relaxed">&quot;{selectedLeave.reason}&quot;</p>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 dark:text-slate-600 text-center uppercase tracking-widest pt-4">
                Request filed on {formatRequestedTime(selectedLeave.createdAt)}
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800 border-t flex justify-end">
              <button onClick={() => setSelectedLeave(null)} className="w-full sm:w-auto px-12 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95">
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingLeave && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[120] p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                  <Edit2 size={18} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Revise Application</h3>
              </div>
              <button onClick={() => setEditingLeave(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto">
              {editingLeave.status !== 'PENDING' && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-[1.5rem] flex items-start gap-3">
                  <p className="text-[11px] text-red-700 dark:text-red-400 font-bold leading-relaxed uppercase tracking-tight">
                    Notice: Current request is already <span className="underline">{editingLeave.status}</span>. Saving changes will reset it to <span className="underline">PENDING</span> for review.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Calendar size={12}/> Start Date</label>
                  <input 
                    type="date" 
                    value={editForm.startDate} 
                    onChange={(e) => setEditForm({
                      ...editForm, 
                      startDate: e.target.value, 
                      endDate: editForm.type === 'HALF' ? e.target.value : editForm.endDate 
                    })} 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Calendar size={12}/> End Date</label>
                  <input 
                    type="date" 
                    disabled={editForm.type === 'HALF'} 
                    value={editForm.endDate} 
                    onChange={(e) => setEditForm({...editForm, endDate: e.target.value})} 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold disabled:opacity-50" 
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type</label>
                  <select 
                    value={editForm.type} 
                    onChange={(e) => setEditForm({
                      ...editForm, 
                      type: e.target.value, 
                      endDate: e.target.value === 'HALF' ? editForm.startDate : editForm.endDate 
                    })} 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold"
                  >
                    <option value="FULL">Full Day</option>
                    <option value="HALF">Half Day</option>
                    <option value="EARLY">Early Leave</option>
                    <option value="LATE">Late Arrival</option>
                    <option value="WORK_FROM_HOME">WFH</option>
                  </select>
                </div>

                {editForm.type === 'HALF' && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                    <button 
                      type="button"
                      onClick={() => setEditForm({ ...editForm, startTime: "10:00 AM", endTime: "02:00 PM" })}
                      className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${editForm.startTime === "10:00 AM" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600" : "border-slate-100 dark:border-slate-800 text-slate-400"}`}
                    >
                      1st Half (10-2)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditForm({ ...editForm, startTime: "02:00 PM", endTime: "07:00 PM" })}
                      className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${editForm.startTime === "02:00 PM" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600" : "border-slate-100 dark:border-slate-800 text-slate-400"}`}
                    >
                      2nd Half (2-7)
                    </button>
                  </div>
                )}

                {(editForm.type === 'HALF' || editForm.type === 'EARLY' || editForm.type === 'LATE') && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1"><Clock size={12}/> Start Time</label>
                        <input type="text" placeholder="e.g. 09:00 AM" value={editForm.startTime || ""} onChange={(e) => setEditForm({...editForm, startTime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1"><Clock size={12}/> End Time</label>
                        <input type="text" placeholder="e.g. 05:00 PM" value={editForm.endTime || ""} onChange={(e) => setEditForm({...editForm, endTime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><FileText size={12}/> Justification</label>
                <textarea value={editForm.reason} onChange={(e) => setEditForm({...editForm, reason: e.target.value})} className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-none rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white min-h-[140px] italic font-medium" />
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800 border-t flex flex-col sm:flex-row justify-end gap-4">
              <button onClick={() => setEditingLeave(null)} className="flex-1 sm:flex-none px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors order-2 sm:order-1">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isSubmitting} className="flex-1 sm:flex-none flex items-center justify-center space-x-3 px-12 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all order-1 sm:order-2">
                {isSubmitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                <span>Apply Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};