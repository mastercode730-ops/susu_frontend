'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Home, Headphones, User, LogOut, ChevronDown, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export function TopNavbar({ onToggleMobileNav, collapsed }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Format breadcrumb route name
  const pageTitle = React.useMemo(() => {
    if (pathname === '/home') return 'Dashboard';
    const segment = pathname?.split('/')[1] || '';
    return segment.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-md transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/80",
        collapsed ? "lg:pl-20" : "lg:pl-68"
      )}
    >
      {/* Left section: Mobile menu & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link href="/home" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            <Home className="h-4 w-4" />
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold dark:text-white">{pageTitle}</span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <a
          href="https://wa.me/+17073166800"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <Headphones className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline">Support</span>
        </a>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 p-1.5 pr-3 hover:bg-slate-50 transition-colors dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs uppercase">
              {user?.UID?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{user?.UID}</span>
              {user?.SubUID && (
                <span className="text-[10px] text-slate-500 font-medium leading-tight">Staff: {user.SubUID}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {userDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.UID}</p>
                  {user?.SubUID && <p className="text-[10px] text-slate-500">Staff Account</p>}
                </div>
                <Link
                  href="/change-password"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <User className="h-4 w-4" />
                  <span>Change Password</span>
                </Link>
                <button
                  onClick={() => { setUserDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
