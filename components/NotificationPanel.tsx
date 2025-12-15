import React, { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, User, LogOut, Bell } from 'lucide-react';
import { formatDate } from '@/utils/formatDate';


interface NotificationPanelProps {
  recentRequests: Leave[];
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ recentRequests, onClose }) => {
  const formatRequestedTime = (timestamp: string): string => {
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
    <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-start justify-end z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Recent Requests</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {recentRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending requests
            </div>
          ) : (
            recentRequests.map(leave => (
              <div key={leave.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{leave.user?.name}</h3>
                    <p className="text-sm text-gray-500">{formatRequestedTime(leave.createdAt)}</p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                    Pending
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">
                    <span className="font-medium">Type:</span> <span className="capitalize">{leave.type.toLowerCase()}</span>
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Duration:</span> {leave.days} day{leave.days !== 1 ? 's' : ''}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Dates:</span> {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Reason:</span> {leave.reason}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};