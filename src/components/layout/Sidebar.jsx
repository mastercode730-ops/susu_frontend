'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  UserPlus,
  Gamepad2,
  Trophy,
  MessageSquare,
  Inbox,
  Scale,
  Calendar,
  IndianRupee,
  Users,
  Wallet,
  Percent,
  TrendingUp,
  Hash,
  UserX,
  UserCheck,
  Shield,
  Key,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Headphones,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const isStaff = !!user.SubUID;
  const showItem = (permissionKey) => {
    if (!isStaff) return true;
    return String(user[permissionKey]) !== 'False';
  };

  const navItems = [
    { href: '/home', icon: Home, label: 'Dashboard', visible: true },
    { href: '/customer', icon: UserPlus, label: 'Add Contact', visible: showItem('ADDContacts') },
    { href: '/game', icon: Gamepad2, label: 'Add Game', visible: showItem('ADDGames') },
    { href: '/results', icon: Trophy, label: 'Result', visible: showItem('Result') },
    { href: '/sale-history', icon: MessageSquare, label: 'Find Chat', visible: true },
    { href: '/received', icon: Inbox, label: 'Received', visible: true },
    { href: '/hisab', icon: Scale, label: 'Hisab', visible: showItem('Hisab') },
    { href: '/hisab-summary', icon: Scale, label: 'Hisab Summary', visible: showItem('HisabSummary') },
    { href: '/date-wise-hisab', icon: Calendar, label: 'Date Wise Hisab', visible: showItem('DateWiseHisab') },
    { href: '/accounts', icon: IndianRupee, label: 'Accounts', visible: showItem('Accounts') },
    { href: '/subusers', icon: Users, label: 'Sub User', visible: !isStaff },
    { href: '/balance', icon: Wallet, label: 'Balance', visible: showItem('Balance') },
    { href: '/staff-balance', icon: Wallet, label: 'Sub User Balance', visible: !isStaff },
    { href: '/lc', icon: Percent, label: 'LC', visible: showItem('LC') },
    { href: '/pl-yantri', icon: TrendingUp, label: 'P&L Yantri', visible: true },
    { href: '/yantri', icon: Hash, label: 'Yantri', visible: showItem('Yantri') },
    { href: '/absent-customers', icon: UserX, label: 'Absent Report', visible: true },
    { href: '/assign-clients', icon: UserCheck, label: 'Assign Customer', visible: !isStaff },
    { href: '/access-rights', icon: Shield, label: 'Access Rights', visible: !isStaff },
    { href: '/change-password', icon: Key, label: 'Change Password', visible: true },
  ];

  const visibleNav = navItems.filter((i) => i.visible);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white text-slate-900 border-r border-slate-200/80 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800">
      {/* Brand header */}
      <div>
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/80">
          <Link href="/home" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-black text-white shadow-md">
              S9
            </div>
            {(!collapsed || mobileOpen) && (
              <span className="text-lg font-bold tracking-wider text-slate-900 dark:text-white">
                SUSU9
              </span>
            )}
          </Link>
          {!mobileOpen && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* User Card */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-100 dark:border-transparent">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/20 font-semibold text-blue-600 dark:text-blue-400 text-xs uppercase">
              {user.UID?.charAt(0) || 'U'}
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-slate-900 dark:text-white">{user.UID}</div>
                {isStaff && (
                  <div className="truncate text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Staff: {user.SubUID}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation list */}
        <div className="px-3 py-3 overflow-y-auto max-h-[calc(100vh-13rem)] space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 group",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                {(!collapsed || mobileOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}

          {user.SuperAdmin === 'SuperAdmin' && (
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800/80 transition-all",
                pathname?.startsWith('/admin') && "bg-amber-100 dark:bg-amber-500/20"
              )}
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              {(!collapsed || mobileOpen) && <span>Admin Panel</span>}
            </Link>
          )}
        </div>
      </div>

      {/* Footer Support & Logout */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
        <a
          href="https://wa.me/+17073166800"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800/80 transition-colors"
        >
          <Headphones className="h-4 w-4 shrink-0" />
          {(!collapsed || mobileOpen) && <span>WhatsApp Support</span>}
        </a>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || mobileOpen) && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
