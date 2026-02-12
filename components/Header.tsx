"use client";
import React, { useState, useEffect } from 'react';
import { Calendar, LogOut, Bell, Menu, X, Sun, Moon, User, ChevronDown } from 'lucide-react';

interface HeaderProps {
  currentUser: any; 
  onLogout: () => void;
  onNotificationClick: () => void;
  notificationCount: number;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onNotificationClick, notificationCount }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for a floating feel
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <nav className={`sticky top-0 z-50 transition-all duration-500 ${
      scrolled 
        ? 'py-2 px-4' 
        : 'py-4 px-0'
    }`}>
      <div className={`max-w-7xl mx-auto transition-all duration-500 rounded-2xl border ${
        scrolled 
          ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg border-slate-200/50 dark:border-slate-700/50 px-6' 
          : 'bg-white dark:bg-slate-900 border-transparent px-8'
      }`}>
        <div className="flex justify-between items-center h-16">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-4 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative p-2.5 bg-indigo-600 rounded-xl text-white shadow-indigo-200 dark:shadow-none transition-transform group-hover:scale-105">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter text-slate-800 dark:text-white leading-none">
                ALPHABETA
              </span>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
                Management System
              </span>
            </div>
          </div>

          {/* Desktop Navigation Actions */}
          <div className="hidden md:flex items-center space-x-1">
            
            {/* Notification Hub */}
            <button
              onClick={onNotificationClick}
              className="relative p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all group"
            >
              <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              {notificationCount > 0 && (
                <span className="absolute top-2 right-2 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white dark:border-slate-900 text-[8px] font-bold text-white items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>

            {/* Vertical Divider */}
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-3" />

            {/* User Profile Action */}
            <div className="flex items-center gap-3 pl-2 py-1.5 pr-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{currentUser.name}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                  currentUser.role === 'MANAGER' 
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' 
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-transparent group-hover:border-indigo-500 transition-all">
                <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
            </div>

            <button
              onClick={onLogout}
              className="ml-2 p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 text-slate-500 dark:text-slate-400">
               {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown - Elegant Slide Down */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 dark:border-slate-800 py-4 space-y-4 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4 px-2">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">{currentUser.name}</p>
                <p className="text-xs text-slate-500">{currentUser.role}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={onNotificationClick}
                className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm"
              >
                <Bell className="w-4 h-4" /> Notifications ({notificationCount})
              </button>
              <button 
                onClick={onLogout}
                className="flex items-center justify-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl font-bold text-sm"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};