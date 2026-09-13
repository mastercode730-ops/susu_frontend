import * as React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, wrapperClassName, type, error, helperText, leftIcon, rightIcon, label, id, ...props }, ref) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div className={cn("w-full space-y-1.5", wrapperClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 flex items-center text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50",
            (type === "date" || type === "time" || type === "datetime-local") && "block",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs font-medium text-red-500">{error}</p>
      )}
      {!error && helperText && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
});
Input.displayName = "Input";

export { Input };
