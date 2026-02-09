"use client";
import React, { useState, useEffect } from 'react';
import { Calendar, LogOut, Bell, Menu, X, Sun, Moon } from 'lucide-react'; // Added Sun and Moon icons

interface HeaderProps {
  currentUser: any; // Using any for brevity; ideally use your User type
  onLogout: () => void;
  onNotificationClick: () => void;
  notificationCount: number;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onNotificationClick, notificationCount }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme based on system preference or local storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-white">
                  AlphaBeta Management
                </h1>
                <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium">
                  {currentUser.role === 'MANAGER' ? 'Manager' : 'Employee'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5">
                Welcome, {currentUser.name}
              </p>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {currentUser.role === 'MANAGER' && (
              <button
                onClick={onNotificationClick}
                className="relative p-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-medium ring-2 ring-white dark:ring-slate-900">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={onLogout}
              className="hidden sm:flex items-center space-x-2 px-3 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium text-sm">Logout</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-3 pt-3 space-y-2 border-t border-gray-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
             <div className="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-widest">User Menu</div>
             <button
              onClick={() => { onLogout(); setMobileMenuOpen(false); }}
              className="w-full flex items-center space-x-2 p-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};