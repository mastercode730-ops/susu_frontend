import * as React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

export function EmptyState({ icon: Icon = Inbox, title = "No data found", description = "There are no records matching your request.", action, className }) {
  return (
    <div className={cn("flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-8 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
