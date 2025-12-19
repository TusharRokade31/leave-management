import React, { useState } from 'react';
import { Calendar, LogOut, Bell, Menu, X } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
  onNotificationClick: () => void;
  notificationCount: number;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onNotificationClick, notificationCount }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Desktop & Tablet View */}
        <div className="hidden md:flex justify-between items-center">
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl lg:text-2xl font-bold text-gray-800">
                  Leave Management
                </h1>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                  {currentUser.role === 'MANAGER' ? 'Manager' : 'Employee'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                Welcome, {currentUser.name}
              </p>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2">
            {currentUser.role === 'MANAGER' && (
              <button
                onClick={onNotificationClick}
                className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Tablet View (sm to md breakpoint) */}
        <div className="hidden sm:flex md:hidden justify-between items-center">
          {/* Left side */}
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-gray-800">Leave Management</h1>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                  {currentUser.role === 'MANAGER' ? 'Manager' : 'Employee'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">Welcome, {currentUser.name}</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-1">
            {currentUser.role === 'MANAGER' && (
              <button
                onClick={onNotificationClick}
                className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                    {notificationCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={onLogout}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden">
          <div className="flex justify-between items-center">
            {/* Left side - Compact */}
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-gray-800 truncate">
                  Leave Management
                </h1>
                <div className="flex items-center space-x-2 mt-0.5">
                  <p className="text-xs text-gray-600 truncate">Welcome, {currentUser.name}</p>
                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-medium whitespace-nowrap">
                    {currentUser.role === 'MANAGER' ? 'Manager' : 'Employee'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right side - Menu Toggle */}
            <div className="flex items-center space-x-1">
              {currentUser.role === 'MANAGER' && (
                <button
                  onClick={onNotificationClick}
                  className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                      {notificationCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="mt-3 pt-3 space-y-2 border-t border-gray-200 animate-fadeIn">
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 p-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};