"use client";
import React, { useState, useMemo } from 'react';
import { getStatusIcon } from '@/utils/getStatusIcon';
import { formatDate } from '@/utils/formatDate';
import { getStatusColor } from '@/utils/getStatusColors';
import { 
  Eye, X, Edit2, Save, Calendar, Clock, 
  FileText, MessageSquare, RefreshCcw, Trash2,
  ChevronLeft, ChevronRight, Sparkles, Loader2, History
} from 'lucide-react';
import { HOLIDAY_DATA, getHoliday } from '@/lib/holidays';

type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' ;

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

// Helper for 12hr display
const format12hr = (time?: string | null) => {
  if (!time) return "";
  const [h, m] = time.split(':');
  let hours = parseInt(h);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${m} ${ampm}`;
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
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(nextMonth);
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
      } else {
        newDays = 1;
      }

      if (editForm.startDate !== originalStart || editForm.endDate !== originalEnd) changes.push("Dates");
      if (editForm.type !== editingLeave.type) changes.push("Type");
      if (editForm.reason !== editingLeave.reason) changes.push("Reason");
      if (editForm.startTime !== (editingLeave.startTime || "")) changes.push("Timing");

      const editSummaryText = changes.length > 0 ? `Changed ${changes.join(', ')}` : "Updated details";

      await onUpdate(editingLeave.id, {
        ...editForm,
        days: newDays,
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

  const handleSlotChange = (slot: string) => {
    const times: Record<string, { start: string; end: string }> = {
      FIRST_HALF: { start: '10:00', end: '14:30' },
      SECOND_HALF: { start: '14:30', end: '19:00' },
      CUSTOM: { start: editForm.startTime || '', end: editForm.endTime || '' }
    };
    const selected = times[slot];
    setEditForm(prev => ({ ...prev, slot, startTime: selected.start, endTime: selected.end }));
  };

  const editHoliday = useMemo(() => {
    return editForm.startDate ? getHoliday(editForm.startDate) : null;
  }, [editForm.startDate]);

  if (leaves.length === 0) return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 p-16 text-center">
      <FileText className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
      <p className="text-gray-400 font-bold italic text-sm">No applications found in your history.</p>
    </div>
  );

  return (
    <>
      {/* MONTH SELECTOR BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-colors">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all active:scale-90">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center space-x-3 px-4 min-w-[180px] justify-center text-center">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-black uppercase tracking-widest text-xs text-gray-700 dark:text-slate-200">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all active:scale-90">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
          </div>
          <div className="hidden md:block text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee Personal Log</div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-all duration-300">
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
                const optionalHoliday = holidaysInRange.find(h => h.type === "OPTIONAL");
                const fixedHoliday = holidaysInRange.find(h => h.type === 'FIXED');

                return (
                  <tr key={leave.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-8 py-5">
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {formatDate(leave.startDate)} <span className="text-slate-300 mx-1">→</span> {formatDate(leave.endDate)}
                      </div>
                      
                      {/* INCREASED SIZE FOR TIME LABELS */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {leave.isEdited && (
                          <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 dark:text-amber-500 font-black uppercase italic">
                            <History size={10} /> Revised
                          </span>
                        )}
                        
                        {leave.type === 'HALF' && leave.slot && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase border border-indigo-100 dark:border-indigo-800/50">
                            {leave.slot.replace('_', ' ')} • {format12hr(leave.startTime)}
                          </span>
                        )}
                        
                        {['EARLY', 'LATE'].includes(leave.type) && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase border border-indigo-100 dark:border-indigo-800/50">
                            Schedule: {format12hr(leave.startTime)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/30 whitespace-nowrap">
                          {leave.type.replace('_', ' ')}
                        </span>
                        {optionalHoliday && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase shadow-sm">
                            <Sparkles size={8} /> {optionalHoliday.name}
                          </span>
                        )}
                        {fixedHoliday && fixedHoliday.isHalfDay && (
                           <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[8px] font-black uppercase border border-amber-200">
                             <Clock size={8} /> {fixedHoliday.name} (Half)
                           </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-black text-slate-900 dark:text-slate-300 whitespace-nowrap">{leave.days} <span className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">Days</span></td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${getStatusColor(leave.status as any)}`}>
                        {getStatusIcon(leave.status as any)}
                        <span>{leave.status}</span>
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => setSelectedLeave(leave)} className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all active:scale-90"><Eye size={16} /></button>
                        {isWithinEditWindow(leave.createdAt) && <button onClick={() => handleEditInit(leave)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all active:scale-90"><Edit2 size={16} /></button>}
                        {leave.status === 'PENDING' && <button onClick={() => onDelete(leave.id)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-all active:scale-90"><Trash2 size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[130] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white italic">Application Review</h3>
                <button onClick={() => setSelectedLeave(null)} className="p-2 text-slate-400 hover:rotate-90 transition-all"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="px-8 py-8 space-y-8 overflow-y-auto custom-scrollbar">
              {selectedLeave.isEdited && selectedLeave.editSummary && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-[1.5rem] flex items-start gap-3">
                    <RefreshCcw className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Modification History</p>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 italic">&quot;{selectedLeave.editSummary}&quot;</p>
                    </div>
                </div>
              )}

              {/* Timing & Type Info */}
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Clock size={20} /></div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Schedule Type</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{selectedLeave.type.replace('_', ' ')}</p>
                  </div>
                </div>
                {selectedLeave.startTime && (
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Timing</p>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {format12hr(selectedLeave.startTime)} {selectedLeave.endTime ? ` - ${format12hr(selectedLeave.endTime)}` : ''}
                    </p>
                    {selectedLeave.slot && <p className="text-[9px] font-black text-indigo-500 uppercase">{selectedLeave.slot.replace('_', ' ')}</p>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Duration</label>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{formatDate(selectedLeave.startDate)} <span className="text-slate-300">→</span> {formatDate(selectedLeave.endDate)}</p>
                  <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 uppercase">{selectedLeave.days} Work Days</p>
                </div>
                <div className="text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                  <span className={`inline-block px-3 py-1 font-black text-[10px] uppercase rounded-lg border ${getStatusColor(selectedLeave.status as any)}`}>{selectedLeave.status}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">My Justification</label>
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner italic text-sm text-slate-600 dark:text-slate-300">&quot;{selectedLeave.reason}&quot;</div>
              </div>

              {selectedLeave.managerComment && (
                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-[2rem] space-y-2">
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-2 tracking-widest"><MessageSquare size={14}/> Manager Feedback</p>
                  <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200 italic leading-relaxed">&quot;{selectedLeave.managerComment}&quot;</p>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end">
              <button onClick={() => setSelectedLeave(null)} className="px-10 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Dismiss Review</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingLeave && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[130] p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">Revise Application</h3>
              <button onClick={() => setEditingLeave(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Date</label>
                  <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({...editForm, startDate: e.target.value, endDate: ['HALF', 'EARLY', 'LATE'].includes(editForm.type) ? e.target.value : editForm.endDate })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End Date</label>
                  <input type="date" disabled={['HALF', 'EARLY', 'LATE'].includes(editForm.type)} value={editForm.endDate} onChange={(e) => setEditForm({...editForm, endDate: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold disabled:opacity-50" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                <select value={editForm.type} onChange={(e) => setEditForm({...editForm, type: e.target.value, endDate: ['HALF', 'EARLY', 'LATE'].includes(e.target.value) ? editForm.startDate : editForm.endDate })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold">
                  <option value="FULL">Full Day</option>
                  <option value="HALF">Half Day</option>
                  <option value="EARLY">Early Leave</option>
                  <option value="LATE">Late Arrival</option>
                  <option value="WORK_FROM_HOME">WFH</option>
                </select>
              </div>

              {/* TIMING CONFIGURATION IN EDIT MODAL */}
              {['HALF', 'EARLY', 'LATE'].includes(editForm.type) && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
                  <p className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-2 tracking-widest"><Clock size={14}/> Schedule Configuration</p>
                  
                  {editForm.type === 'HALF' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {['FIRST_HALF', 'SECOND_HALF', 'CUSTOM'].map(s => (
                          <button key={s} type="button" onClick={() => handleSlotChange(s)} className={`py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${editForm.slot === s ? 'border-indigo-600 bg-white text-indigo-600 shadow-sm' : 'border-transparent bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                      {(editForm.slot === 'CUSTOM' || !editForm.slot) && (
                        <div className="grid grid-cols-2 gap-4">
                          <input type="time" value={editForm.startTime} onChange={e => setEditForm(p => ({...p, startTime: e.target.value}))} className="w-full p-3 bg-white dark:bg-slate-700 rounded-xl font-bold" />
                          <input type="time" value={editForm.endTime} onChange={e => setEditForm(p => ({...p, endTime: e.target.value}))} className="w-full p-3 bg-white dark:bg-slate-700 rounded-xl font-bold" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">{editForm.type === 'EARLY' ? 'Leaving At' : 'Arriving At'}</label>
                      <input type="time" value={editForm.startTime} onChange={e => setEditForm(p => ({...p, startTime: e.target.value}))} className="w-full p-4 bg-white dark:bg-slate-700 rounded-2xl font-bold" />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Justification</label>
                <textarea value={editForm.reason} onChange={(e) => setEditForm({...editForm, reason: e.target.value})} className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 min-h-[140px] italic font-medium" />
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800 border-t flex flex-col sm:flex-row justify-end gap-4">
              <button onClick={() => setEditingLeave(null)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isSubmitting} className="flex items-center justify-center space-x-3 px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                <span>Apply Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};