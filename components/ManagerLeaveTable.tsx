// components/ManagerLeaveTable.tsx
'use client';

import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Loader2 // Imported Loader
} from 'lucide-react';
import { getStatusIcon } from '../utils/getStatusIcon';
import { formatDate } from '@/utils/formatDate';
import { getStatusColor } from '@/utils/getStatusColors';


interface ManagerLeaveTableProps {
  leaves: Leave[];
  onApprove: (leaveId: number, comment?: string) => Promise<void>;
  onReject: (leaveId: number, comment?: string) => Promise<void>;
  // NEW: Props for month navigation (controlled by parent)
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

export const ManagerLeaveTable: React.FC<ManagerLeaveTableProps> = ({ 
  leaves, 
  onApprove, 
  onReject,
  currentMonth,   // Received from parent
  onMonthChange   // Received from parent
}) => {
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [currentAction, setCurrentAction] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [actionLeaveId, setActionLeaveId] = useState<number | null>(null);
  
  // NEW: Loading state to prevent double clicks
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper functions
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
      case 'HALF': return `${leave.startTime} - ${leave.endTime || 'N/A'}`;
      case 'EARLY': return `Leaving at ${leave.startTime}`;
      case 'LATE': return `Arriving at ${leave.startTime}`;
      case 'WORK_FROM_HOME': return 'All Day'; 
      default: return null;
    }
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
        totalDays: employeeLeaves.reduce((sum, l) => sum + l.days, 0)
      };
  };

  const handleSearchEmployee = () => {
    if (!searchEmployee.trim()) return;
    const stats = getCurrentMonthLeaves(searchEmployee.trim());
    setEmployeeStats(stats);
    setShowStatsModal(true);
  };
  
  const handleActionClick = (leaveId: number, action: 'approve' | 'reject') => {
    setActionLeaveId(leaveId);
    setCurrentAction(action);
    setComment('');
    setShowCommentModal(true);
  };

  const handleConfirmAction = async () => {
      if (!actionLeaveId || !currentAction) return;
      if (currentAction === 'reject' && !comment.trim()) {
        alert('Please provide a comment when rejecting a leave request');
        return;
      }

      setIsSubmitting(true); // Disable button & show loader

      try {
        if (currentAction === 'approve') {
          await onApprove(actionLeaveId, comment.trim() || undefined);
        } else {
          await onReject(actionLeaveId, comment.trim());
        }
        setShowCommentModal(false);
        setComment('');
        setActionLeaveId(null);
        setCurrentAction(null);
      } catch (error) {
        console.error('Error processing leave:', error);
      } finally {
        setIsSubmitting(false); // Re-enable button
      }
  };

  const uniqueEmployees = Array.from(new Set(leaves.map(l => l.user?.name).filter(Boolean)));

  // Filter leaves by the CURRENT selected month (passed from props)
  const filteredLeaves = leaves.filter(leave => {
    const leaveDate = new Date(leave.startDate);
    return (
      leaveDate.getMonth() === currentMonth.getMonth() &&
      leaveDate.getFullYear() === currentMonth.getFullYear()
    );
  });

  // Month Navigation using Props
  const prevMonth = () => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    onMonthChange(newDate);
  };
  const nextMonth = () => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    onMonthChange(newDate);
  };

  return (
    <>
      {/* Search Bar & Month Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Month Navigation */}
          <div className="flex items-center space-x-4 bg-gray-50 p-2 rounded-lg">
            <button onClick={prevMonth} className="p-1 hover:bg-white rounded shadow-sm transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-2 min-w-[150px] justify-center">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-gray-700">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button onClick={nextMonth} className="p-1 hover:bg-white rounded shadow-sm transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchEmployee()}
                placeholder="Search employee by name..."
                list="employee-suggestions"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <datalist id="employee-suggestions">
                {uniqueEmployees.map((name) => (
                   <option key={name as string} value={name as string} />
                ))}
              </datalist>
            </div>
            <button
              onClick={handleSearchEmployee}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              <span>View Stats</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leave Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
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
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No requests found for {currentMonth.toLocaleString('default', { month: 'long' })}
                  </td>
                </tr>
              ) : (
                filteredLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <button
                      onClick={() => {
                        const stats = getCurrentMonthLeaves(leave.user?.name || '');
                        setEmployeeStats(stats);
                        setShowStatsModal(true);
                      }}
                      className="hover:text-indigo-600 transition-colors"
                    >
                      {leave.user?.name}
                    </button>
                  </td>
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
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(leave.status)}`}>
                        {getStatusIcon(leave.status)}
                        <span>{leave.status.toLowerCase()}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {leave.status === 'PENDING' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleActionClick(leave.id, 'approve')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleActionClick(leave.id, 'reject')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Confirmation Modal with Loader */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className={`${currentAction === 'approve' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-4 rounded-t-xl flex items-center justify-between`}>
              <h3 className="text-lg font-semibold">
                {currentAction === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <button
                onClick={() => !isSubmitting && setShowCommentModal(false)}
                className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment {currentAction === 'reject' && <span className="text-red-500">*</span>}
                  {currentAction === 'approve' && <span className="text-gray-500">(Optional)</span>}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={currentAction === 'reject' ? 'Please provide a reason for rejection...' : 'Add a comment (optional)...'}
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:bg-gray-100"
                />
                {currentAction === 'reject' && !comment.trim() && (
                  <p className="text-xs text-red-500 mt-1">Comment is required for rejection</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
              <button
                onClick={() => setShowCommentModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmitting || (currentAction === 'reject' && !comment.trim())}
                className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  currentAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : currentAction === 'approve' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Full Detail Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Leave Request Details</h3>
              <button
                onClick={() => !isSubmitting && setSelectedLeave(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Employee</label>
                <p className="text-gray-900 font-medium">{selectedLeave.user?.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
                  <p className="text-gray-900 capitalize">{selectedLeave.type.toLowerCase()}</p>
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

        {/* Action Buttons inside View Modal */}
         {selectedLeave.status === 'PENDING' && (
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
            <button
              onClick={() => {
                const id = selectedLeave.id;
                setSelectedLeave(null); // Close detail modal
                handleActionClick(id, 'reject'); // Open action modal
              }}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
            <button
              onClick={() => {
                const id = selectedLeave.id;
                setSelectedLeave(null); // Close detail modal
                handleActionClick(id, 'approve'); // Open action modal
              }}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )}

      {/* Stats Modal */}
      {showStatsModal && employeeStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                 <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
          <h3 className="text-lg font-semibold">Employee Leave Statistics</h3>
          <button
            onClick={() => setShowStatsModal(false)}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Employee Name</label>
            <p className="text-xl font-semibold text-gray-900">{employeeStats.name}</p>
          </div>

          <div className="text-sm text-gray-500 font-medium">
            Selected Month ({currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })})
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Total Requests</p>
              <p className="text-3xl font-bold text-blue-700">{employeeStats.totalLeaves}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Total Days</p>
              <p className="text-3xl font-bold text-purple-700">{employeeStats.totalDays}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-700">Approved</span>
              <span className="text-lg font-bold text-green-700">{employeeStats.approvedLeaves}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-medium text-yellow-700">Pending</span>
              <span className="text-lg font-bold text-yellow-700">{employeeStats.pendingLeaves}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-700">Rejected</span>
              <span className="text-lg font-bold text-red-700">{employeeStats.rejectedLeaves}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end">
          <button
            onClick={() => setShowStatsModal(false)}
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