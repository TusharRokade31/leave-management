import React, { useState } from 'react';
import { getStatusIcon } from '@/utils/getStatusIcon';
import { formatDate } from '@/utils/formatDate';
import { getStatusColor } from '@/utils/getStatusColors';
import { Eye, X } from 'lucide-react';

interface EmployeeLeaveTableProps {
  leaves: Leave[];
  onDelete: (leaveId: number) => Promise<void>;
}

export const EmployeeLeaveTable: React.FC<EmployeeLeaveTableProps> = ({ leaves, onDelete }) => {
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);

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
      case 'HALF':
        return `${leave.startTime} - ${leave.endTime || 'N/A'}`;
      case 'EARLY':
        return `Leaving at ${leave.startTime}`;
      case 'LATE':
        return `Arriving at ${leave.startTime}`;
      case 'WORK_FROM_HOME':
        return 'All Day';
      default:
        return null;
    }
  };

  if (leaves.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-500">No leave requests found</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaves.map(leave => (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <div className="text-gray-900">
                      {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                    </div>
                    {formatLeaveTime(leave) && (
                      <div className="text-xs text-indigo-600 mt-1 font-medium">
                        🕐 {formatLeaveTime(leave)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                    {leave.type === 'WORK_FROM_HOME' ? 'WFH' : leave.type.toLowerCase()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{leave.days}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="max-w-xs">
                      <p className="truncate">{leave.reason}</p>
                      <button
                        onClick={() => setSelectedLeave(leave)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center space-x-1 mt-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View full</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatRequestedTime(leave.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(leave.status)}`}>
                      {getStatusIcon(leave.status)}
                      <span>{leave.status.toLowerCase()}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {leave.status === 'PENDING' && (
                      <button
                        onClick={() => onDelete(leave.id)}
                        className="px-3 py-1 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {leaves.map(leave => (
          <div key={leave.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(leave.status)}`}>
                {getStatusIcon(leave.status)}
                <span>{leave.status.toLowerCase()}</span>
              </span>
              <span className="text-xs text-gray-500 capitalize">
                {leave.type === 'WORK_FROM_HOME' ? 'WFH' : leave.type.toLowerCase()}
              </span>
            </div>

            {/* Dates */}
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900">
                {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
              </p>
              {formatLeaveTime(leave) && (
                <p className="text-xs text-indigo-600 mt-1 font-medium">
                  🕐 {formatLeaveTime(leave)}
                </p>
              )}
            </div>

            {/* Days */}
            <div className="mb-3">
              <span className="text-xs text-gray-500">Days: </span>
              <span className="text-sm font-medium text-gray-900">{leave.days}</span>
            </div>

            {/* Reason */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Reason:</p>
              <p className="text-sm text-gray-900 line-clamp-2">{leave.reason}</p>
              <button
                onClick={() => setSelectedLeave(leave)}
                className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center space-x-1 mt-1"
              >
                <Eye className="w-3 h-3" />
                <span>View full details</span>
              </button>
            </div>

            {/* Requested At */}
            <div className="mb-3">
              <p className="text-xs text-gray-500">
                Requested: {formatRequestedTime(leave.createdAt)}
              </p>
            </div>

            {/* Actions */}
            {leave.status === 'PENDING' && (
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={() => onDelete(leave.id)}
                  className="w-full px-3 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-medium"
                >
                  Delete Request
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* View Full Detail Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Leave Request Details</h3>
              <button
                onClick={() => setSelectedLeave(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-4 sm:px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Start Date</label>
                  <p className="text-gray-900">{formatDate(selectedLeave.startDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">End Date</label>
                  <p className="text-gray-900">{formatDate(selectedLeave.endDate)}</p>
                </div>
              </div>

              {formatLeaveTime(selectedLeave) && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Time</label>
                  <p className="text-gray-900">🕐 {formatLeaveTime(selectedLeave)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-gray-900 capitalize">
                    {selectedLeave.type === 'WORK_FROM_HOME' ? 'WFH' : selectedLeave.type.toLowerCase()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Days</label>
                  <p className="text-gray-900">{selectedLeave.days}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(selectedLeave.status)}`}>
                    {getStatusIcon(selectedLeave.status)}
                    <span>{selectedLeave.status.toLowerCase()}</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Requested At</label>
                <p className="text-gray-900">{formatRequestedTime(selectedLeave.createdAt)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Reason</label>
                <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedLeave.reason}</p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-4 sm:px-6 py-4 flex justify-end border-t border-gray-200">
              <button
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};