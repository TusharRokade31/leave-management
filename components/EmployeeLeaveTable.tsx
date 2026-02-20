"use client";
import React, { useState } from 'react';
import { getStatusIcon } from '@/utils/getStatusIcon';
import { formatDate } from '@/utils/formatDate';
import { getStatusColor } from '@/utils/getStatusColors';
import { Eye, X, Edit2, Save, Calendar, Clock, FileText, MessageSquare, RefreshCcw, Trash2 } from 'lucide-react';

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
  const [editForm, setEditForm] = useState({
    startDate: "",
    endDate: "",
    type: "",
    reason: "",
    startTime: "",
    endTime: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      let editSummary = changes.length > 0 ? `Changed ${changes.join(', ')}` : "Updated details";
      if (wasDecided) editSummary += " (Status reset to Pending)";

      await onUpdate(editingLeave.id, {
        ...editForm,
        status: 'PENDING',
        isEdited: true,
        updatedAt: new Date().toISOString(),
        editSummary: editSummary 
      });
      setEditingLeave(null);
    } catch (error) {
      console.error("Failed to update leave:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRequestedTime = (timestamp: string): string => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (leaves.length === 0) return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 text-center transition-colors">
      <p className="text-gray-500 dark:text-slate-400">No leave requests found</p>
    </div>
  );

  return (
    <>
      {/* MOBILE VIEW: Cards (Visible only on small screens) */}
      <div className="md:hidden space-y-4">
        {leaves.map(leave => (
          <div key={leave.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{leave.type}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                </p>
                {leave.isEdited && <span className="text-[10px] text-amber-600 font-semibold italic">Edited</span>}
              </div>
              <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase ring-1 ring-inset ${getStatusColor(leave.status as any)}`}>
                {getStatusIcon(leave.status as any)}
                <span>{leave.status}</span>
              </span>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic">"{leave.reason}"</p>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
              <button onClick={() => setSelectedLeave(leave)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">
                <Eye size={14} /> Details
              </button>
              {isWithinEditWindow(leave.createdAt) && (
                <button onClick={() => handleEditInit(leave)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  <Edit2 size={14} /> Edit
                </button>
              )}
              {leave.status === 'PENDING' && (
                <button onClick={() => onDelete(leave.id)} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP VIEW: Table (Hidden on small screens) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Reason</th>
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
                    {leave.isEdited && <span className="text-[10px] text-amber-600 font-semibold italic">Edited</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-300 capitalize">{leave.type.toLowerCase()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 truncate max-w-[150px]">{leave.reason}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium capitalize ring-1 ring-inset ${getStatusColor(leave.status as any)}`}>
                      {getStatusIcon(leave.status as any)}
                      <span>{leave.status.toLowerCase()}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => setSelectedLeave(leave)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      {isWithinEditWindow(leave.createdAt) && (
                        <button onClick={() => handleEditInit(leave)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Edit Request">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {leave.status === 'PENDING' && (
                        <button onClick={() => onDelete(leave.id)} className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">Request Details</h3>
              <button onClick={() => setSelectedLeave(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {selectedLeave.isEdited && selectedLeave.editSummary && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Update History</p>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{selectedLeave.editSummary}</p>
                </div>
              )}

              {selectedLeave.managerComment && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <MessageSquare size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Manager's Feedback</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100 italic leading-relaxed">
                    "{selectedLeave.managerComment}"
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Duration</label>
                  <p className="text-gray-900 dark:text-slate-200 font-bold flex items-center">
                    {selectedLeave.isEdited && selectedLeave.editSummary?.includes('Dates') && <Clock className="w-3 h-3 text-amber-500 mr-2" />}
                    {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)}
                    <span className="ml-2 text-indigo-600 dark:text-indigo-400">({selectedLeave.days} Days)</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Leave Type</label>
                  <p className="text-gray-900 dark:text-slate-200 font-bold capitalize">{selectedLeave.type.toLowerCase()}</p>
                </div>
              </div>

              {selectedLeave.startTime && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Timing Details</label>
                  <p className="text-gray-900 dark:text-slate-200 font-bold flex items-center gap-2">
                    <Clock className="w-3 h-3 text-indigo-500" />
                    {selectedLeave.startTime} {selectedLeave.endTime ? `to ${selectedLeave.endTime}` : ''}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Reason for Request</label>
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-800">
                  <p className="text-gray-900 dark:text-slate-300 italic whitespace-pre-wrap">"{selectedLeave.reason}"</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <div className="text-[10px] text-gray-400">
                  Applied on: {formatRequestedTime(selectedLeave.createdAt)}
                </div>
                <span className={`w-fit inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${getStatusColor(selectedLeave.status as any)}`}>
                  {getStatusIcon(selectedLeave.status as any)}
                  <span>{selectedLeave.status}</span>
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t flex justify-end">
              <button onClick={() => setSelectedLeave(null)} className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingLeave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Edit2 className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Request</h3>
              </div>
              <button onClick={() => setEditingLeave(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {editingLeave.status !== 'PENDING' && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex flex-col gap-1">
                  <span className="text-red-600 dark:text-red-400 text-xs font-bold uppercase">⚠️ Warning:</span>
                  <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                    This request is already <strong>{editingLeave.status}</strong>. Updating it will reset it to <strong>PENDING</strong>.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Calendar className="w-3 h-3" /> Start Date</label>
                  <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({...editForm, startDate: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Calendar className="w-3 h-3" /> End Date</label>
                  <input type="date" value={editForm.endDate} onChange={(e) => setEditForm({...editForm, endDate: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Leave Type</label>
                  <select value={editForm.type} onChange={(e) => setEditForm({...editForm, type: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                    <option value="FULL">Full Day</option>
                    <option value="HALF">Half Day</option>
                    <option value="EARLY">Early Leave</option>
                    <option value="LATE">Late Arrival</option>
                    <option value="WORK_FROM_HOME">WFH</option>
                  </select>
                </div>
                {(editForm.type === 'HALF' || editForm.type === 'EARLY' || editForm.type === 'LATE') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Clock className="w-3 h-3" /> Timing</label>
                    <input type="text" placeholder="e.g. 09:00 AM" value={editForm.startTime} onChange={(e) => setEditForm({...editForm, startTime: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><FileText className="w-3 h-3" /> Reason</label>
                <textarea value={editForm.reason} onChange={(e) => setEditForm({...editForm, reason: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white min-h-[120px]" />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={() => setEditingLeave(null)} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 order-2 sm:order-1">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isSubmitting} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-50 transition-all shadow-lg order-1 sm:order-2">
                {isSubmitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Update Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};