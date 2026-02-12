'use client';

import React from 'react';
import { CheckCircle, XCircle, Clock, User, Bell, X, History, MessageSquare, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/utils/formatDate';

// Updated interface to include edit tracking and manager discussion fields
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
  status: string;
  managerComment?: string | null; 
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
  editSummary?: string | null;
  user?: {
    name: string | null;
  };
}

interface NotificationPanelProps {
  recentRequests: Leave[];
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ recentRequests, onClose }) => {
  const formatRequestedTime = (timestamp: string | Date): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-start justify-end z-[120] transition-all duration-300" 
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl overflow-hidden flex flex-col transition-colors duration-300 animate-in slide-in-from-right duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-8 py-6 transition-colors z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-gray-800 dark:text-white uppercase">Recent Requests</h2>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Awaiting Manager Review</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {recentRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-full mb-4 text-gray-300 dark:text-slate-600">
                <Bell size={40} />
              </div>
              <p className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                No pending requests
              </p>
            </div>
          ) : (
            recentRequests.map(leave => (
              <div 
                key={leave.id} 
                className={`bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-5 border transition-all hover:border-indigo-200 dark:hover:border-slate-700 group relative overflow-hidden ${leave.isEdited ? 'border-amber-100 dark:border-amber-900/30' : 'border-gray-100 dark:border-slate-800'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-black text-gray-800 dark:text-slate-100 uppercase text-sm tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {leave.user?.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                        {formatRequestedTime(leave.createdAt)}
                      </p>
                      {/* WhatsApp-style Edit Indicator */}
                      {leave.isEdited && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase italic">
                          <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></span>
                          (Edited)
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 text-[10px] font-black uppercase rounded-lg tracking-tighter">
                    Pending
                  </span>
                </div>

                {/* --- Manager Discussion Indicator --- */}
                {leave.managerComment && (
                  <div className="mb-3 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                    <MessageSquare size={12} className="text-indigo-600 dark:text-indigo-400" />
                    <p className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                      Management Feedback Logged
                    </p>
                  </div>
                )}

                {/* Edit Summary Box (Only shows if edited) */}
                {leave.isEdited && leave.editSummary && (
                  <div className="mb-4 p-3 bg-amber-50/50 dark:bg-amber-900/20 rounded-xl border border-amber-100/50 dark:border-amber-900/30 flex items-start gap-2">
                    <History size={14} className="text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-[8px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-0.5">Modification Summary</p>
                        <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 italic leading-tight">
                            {leave.editSummary}
                        </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-gray-200/50 dark:border-slate-700/50 pb-2">
                    <span className="font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Type</span>
                    <span className={`font-black capitalize ${leave.editSummary?.includes('Type') ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-slate-300'}`}>
                        {leave.type.toLowerCase()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between border-b border-gray-200/50 dark:border-slate-700/50 pb-2">
                    <span className="font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Duration</span>
                    <span className="font-black text-gray-700 dark:text-slate-300">{leave.days} day{leave.days !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="pt-1">
                    <span className="font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Schedule</span>
                    <p className={`font-black ${leave.editSummary?.includes('Dates') ? 'text-amber-600 dark:text-amber-400 underline decoration-dotted' : 'text-gray-700 dark:text-slate-300'}`}>
                      {formatDate(leave.startDate)} <span className="text-gray-300 dark:text-slate-600 mx-1">→</span> {formatDate(leave.endDate)}
                    </p>
                  </div>

                  <div className="pt-2">
                    <span className="font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block mb-1 text-[10px]">Reason</span>
                    <div className={`bg-white dark:bg-slate-900/50 p-3 rounded-xl border ${leave.editSummary?.includes('Reason') ? 'border-amber-200 dark:border-amber-900/50' : 'border-gray-100 dark:border-slate-700/50'}`}>
                      <p className="text-gray-600 dark:text-slate-400 leading-relaxed italic line-clamp-2">"{leave.reason}"</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 text-center transition-colors">
          <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">End of Notifications</p>
        </div>
      </div>
    </div>
  );
};