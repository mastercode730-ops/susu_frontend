import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-100 text-slate-900",
        primary: "border-transparent bg-blue-100 text-blue-800",
        secondary: "border-transparent bg-slate-100 text-slate-800",
        success: "border-transparent bg-emerald-100 text-emerald-800",
        danger: "border-transparent bg-rose-100 text-rose-800",
        warning: "border-transparent bg-amber-100 text-amber-800",
        outline: "border border-slate-200 text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, dot, children, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children}
    </div>
  );
}

function StatusBadge({ status, className }) {
  const statusStr = String(status).toLowerCase();
  
  if (['active', 'completed', 'success', 'true', '1', 'running'].includes(statusStr)) {
    return <Badge variant="success" dot className={className}>{statusStr === 'true' || statusStr === '1' ? 'Active' : status}</Badge>;
  }
  if (['pending', 'in-progress', 'running'].includes(statusStr)) {
    return <Badge variant="warning" dot className={className}>{status}</Badge>;
  }
  if (['failed', 'inactive', 'false', '0', 'disabled', 'blocked'].includes(statusStr)) {
    return <Badge variant="danger" className={className}>{statusStr === 'false' || statusStr === '0' ? 'Inactive' : status}</Badge>;
  }

  return <Badge variant="secondary" className={className}>{status}</Badge>;
}

export { Badge, StatusBadge, badgeVariants };
