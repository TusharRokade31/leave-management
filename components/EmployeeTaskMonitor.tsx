"use client";
import React, { useState, useEffect } from 'react';
import { User, Search } from 'lucide-react';
import { EmployeeCalendar } from './EmployeeCalendar';
import { getAuthToken } from '@/lib/api/api'; //

export const EmployeeTaskMonitor = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      const token = getAuthToken(); //
      try {
        const res = await fetch('/api/users/bulk', { //
          headers: {
            'Authorization': `Bearer ${token}` //
          }
        });
        const data = await res.json();
        // The bulk API returns a results object
        setEmployees(Array.isArray(data) ? data : (data.results?.success || []));
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Employee Task Monitoring</h2>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b bg-gray-50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input 
                type="text"
                placeholder="Search employees..."
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading employees...</div>
            ) : filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <button
                  key={emp.id || emp.email}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors border-b last:border-0 ${
                    selectedEmployeeId === emp.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="bg-gray-200 p-2 rounded-full"><User className="w-4 h-4 text-gray-600" /></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500 truncate">{emp.email}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">No employees found.</div>
            )}
          </div>
        </div>
        <div className="lg:col-span-3">
          {selectedEmployeeId ? (
            <EmployeeCalendar viewOnly={true} employeeId={selectedEmployeeId} />
          ) : (
            <div className="bg-white border-2 border-dashed rounded-2xl h-[500px] flex flex-col items-center justify-center text-gray-400">
              <User className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select an employee to view their daily tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};