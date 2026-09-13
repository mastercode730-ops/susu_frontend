'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export function Tabs({ tabs, activeTab, onChange, className }) {
  return (
    <div className={cn("flex space-x-1 rounded-xl bg-slate-100 p-1", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-none select-none",
              isActive
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {tab.icon && <span className="h-4 w-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                isActive ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
