'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { TopNavbar } from '../../components/layout/TopNavbar';
import { LoadingSpinner } from '../../components/ui/spinner';
import { cn } from '../../lib/utils';

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading Susu9..." />
      </div>
    );
  }

  if (!user) {
    return null; // AuthContext handles redirect to /login
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main App Container */}
      <div className="flex flex-col min-h-screen">
        <TopNavbar
          onToggleMobileNav={() => setMobileOpen(!mobileOpen)}
          collapsed={collapsed}
        />

        <main
          className={cn(
            "flex-1 p-4 sm:p-6 lg:p-8 transition-all duration-300",
            collapsed ? "lg:pl-20" : "lg:pl-68"
          )}
        >
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
