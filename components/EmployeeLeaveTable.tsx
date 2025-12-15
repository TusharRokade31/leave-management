import React from 'react';
import { getStatusIcon } from '@/utils/getStatusIcon';
import { formatDate } from '@/utils/formatDate';
import { getStatusColor } from '@/utils/getStatusColors';

interface EmployeeLeaveTableProps {
  leaves: Leave[];
  onDelete: (leaveId: number) => Promise<void>;
}

export const EmployeeLeaveTable: React.FC<EmployeeLeaveTableProps> = ({ leaves, onDelete }) => {
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                <td className="px-6 py-4 text-sm text-gray-900 capitalize">{leave.type.toLowerCase()}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{leave.days}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{leave.reason}</td>
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
  );
};