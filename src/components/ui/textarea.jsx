import * as React from 'react';
import { cn } from '../../lib/utils';

const Textarea = React.forwardRef(({ className, label, id, error, helperText, ...props }, ref) => {
  const textareaId = id || React.useId();
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition-all duration-200 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/20",
          error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20 dark:border-red-500",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
