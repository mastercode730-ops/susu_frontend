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
  History,
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

  // Account owner can hide any menu key below by setting Users.DisabledMenus
  // (comma-separated) directly in the database — see
  // susu_backend/migrations/002_menu_visibility.sql. Applies to the owner
  // and all their sub-users, takes effect on next load with no redeploy.
  const disabledMenus = user.disabledMenus || [];
  const enabled = (key) => !disabledMenus.includes(key);

  const navItems = [
    { key: 'home', href: '/home', icon: Home, label: 'Dashboard', visible: enabled('home') },
    { key: 'customer', href: '/customer', icon: UserPlus, label: 'Add Contact', visible: showItem('ADDContacts') && enabled('customer') },
    { key: 'game', href: '/game', icon: Gamepad2, label: 'Add Game', visible: showItem('ADDGames') && enabled('game') },
    { key: 'results', href: '/results', icon: Trophy, label: 'Result', visible: showItem('Result') && enabled('results') },
    { key: 'sale-history', href: '/sale-history', icon: MessageSquare, label: 'Find Chat', visible: enabled('sale-history') },
    { key: 'received', href: '/received', icon: Inbox, label: 'Received', visible: enabled('received') },
    { key: 'hisab', href: '/hisab', icon: Scale, label: 'Hisab', visible: showItem('Hisab') && enabled('hisab') },
    { key: 'hisab-summary', href: '/hisab-summary', icon: Scale, label: 'Hisab Summary', visible: showItem('HisabSummary') && enabled('hisab-summary') },
    { key: 'date-wise-hisab', href: '/date-wise-hisab', icon: Calendar, label: 'Date Wise Hisab', visible: showItem('DateWiseHisab') && enabled('date-wise-hisab') },
    { key: 'accounts', href: '/accounts', icon: IndianRupee, label: 'Accounts', visible: showItem('Accounts') && enabled('accounts') },
    {
      key: 'staff-management', href: '/staff-management', icon: Users, label: 'Sub User Management',
      visible: !isStaff && enabled('staff-management'),
      activeMatch: (p) => ['/staff-management', '/subusers', '/access-rights', '/assign-clients'].includes(p),
    },
    { key: 'balance', href: '/balance', icon: Wallet, label: 'Balance', visible: showItem('Balance') && enabled('balance') },
    // Hidden platform-wide for every owner and sub-user — was previously
    // `!isStaff && enabled('staff-balance')` (per-account DB toggle). The
    // /staff-balance route and its API still work if linked to directly;
    // only the nav entry is hidden.
    { key: 'staff-balance', href: '/staff-balance', icon: Wallet, label: 'Sub User Balance', visible: false },
    { key: 'lc', href: '/lc', icon: Percent, label: 'LC', visible: showItem('LC') && enabled('lc') },
    { key: 'pl-yantri', href: '/pl-yantri', icon: TrendingUp, label: 'P&L Yantri', visible: enabled('pl-yantri') },
    { key: 'yantri', href: '/yantri', icon: Hash, label: 'Yantri', visible: showItem('Yantri') && enabled('yantri') },
    { key: 'absent-customers', href: '/absent-customers', icon: UserX, label: 'Absent Report', visible: enabled('absent-customers') },
    { key: 'activity-log', href: '/activity-log', icon: History, label: 'Activity Log', visible: !isStaff && enabled('activity-log') },
    { key: 'change-password', href: '/change-password', icon: Key, label: 'Change Password', visible: enabled('change-password') },
  ];

  const visibleNav = navItems.filter((i) => i.visible);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white text-slate-900 border-r border-slate-200/80">
      {/* Brand header, user card & nav list — takes remaining space above the footer */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-slate-100">
          <Link href="/home" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-black text-white shadow-md">
              S9
            </div>
            {(!collapsed || mobileOpen) && (
              <span className="text-lg font-bold tracking-wider text-slate-900">
                SUSU9
              </span>
            )}
          </Link>
          {!mobileOpen && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = item.activeMatch ? item.activeMatch(pathname) : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 group",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-500")} />
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-all",
                pathname?.startsWith('/admin') && "bg-amber-100"
              )}
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              {(!collapsed || mobileOpen) && <span>Admin Panel</span>}
            </Link>
          )}
        </div>
      </div>

      {/* Footer Support & Logout */}
      <div className="shrink-0 p-3 border-t border-slate-100 space-y-1">
        <a
          href="https://wa.me/+17073166800"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
        >
          <Headphones className="h-4 w-4 shrink-0" />
          {(!collapsed || mobileOpen) && <span>WhatsApp Support</span>}
        </a>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
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
