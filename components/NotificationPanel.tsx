'use client';

import React from 'react';
import { 
  Clock, 
  Bell, 
  X, 
  MessageSquare,
  Info
} from 'lucide-react';
import { formatDate } from '@/utils/formatDate';

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
  userRole?: 'MANAGER' | 'EMPLOYEE';
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  recentRequests, 
  onClose,
  userRole = 'MANAGER' 
}) => {
  
  // Employees see PENDING only. Managers see all passed from parent.
  const filteredRequests = userRole === 'EMPLOYEE' 
    ? recentRequests.filter(leave => leave.status === 'PENDING')
    : recentRequests;

  const formatRequestedTime = (timestamp: string | Date): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
      case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      default: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/40 dark:bg-black/80 backdrop-blur-sm flex items-start justify-end z-[120] transition-all duration-300" 
      onClick={onClose}
    >
      <div 
        className="bg-gray-50 dark:bg-slate-950 w-full max-w-md h-full shadow-2xl overflow-hidden flex flex-col transition-colors duration-300 animate-in slide-in-from-right duration-300 border-l border-white/10" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-8 py-7 transition-colors z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white uppercase">
                  {userRole === 'MANAGER' ? 'Activity Center' : 'My Requests'}
                </h2>
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {filteredRequests.length}
                </span>
              </div>
              <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-widest">
                {userRole === 'MANAGER' ? 'Awaiting Manager Review' : 'Awaiting Processing'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 rounded-2xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mb-4 text-slate-300 dark:text-slate-700">
                <Bell size={32} />
              </div>
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                Clean Inbox
              </p>
            </div>
          ) : (
            filteredRequests.map(leave => (
              <div 
                key={leave.id} 
                className={`w-full bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border shadow-sm transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md ${
                  leave.isEdited 
                    ? 'border-amber-200 dark:border-amber-900/50 hover:border-amber-400' 
                    : 'border-slate-100 dark:border-slate-800 hover:border-indigo-400'
                }`}
              >
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex gap-3 overflow-hidden">
                    <div className="mt-1 p-2.5 rounded-xl flex-shrink-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20">
                       <Clock size={18}/>
                    </div>
                    
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight pt-1 truncate">
                        {userRole === 'MANAGER' ? leave.user?.name : `${leave.type.replace(/_/g, ' ')} Leave`}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {formatRequestedTime(leave.createdAt)}
                        </p>
                        {leave.isEdited && (
                          <span className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase whitespace-nowrap">
                            • Edited
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg tracking-wider block whitespace-nowrap ${getStatusStyle(leave.status)}`}>
                      {leave.status}
                    </span>
                  </div>
                </div>

                {leave.managerComment && (
                  <div className="mb-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare size={12} className="text-indigo-500" />
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Manager Note</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic font-medium line-clamp-3">
                      "{leave.managerComment}"
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duration</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{leave.days} Day{leave.days !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalize">{leave.type.toLowerCase().replace(/_/g, ' ')}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                   <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                      {formatDate(leave.startDate)} <span className="text-slate-300 mx-1">→</span> {formatDate(leave.endDate)}
                    </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">Summary View</p>
        </div>
      </div>
    </div>
  );
};