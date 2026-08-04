import * as React from 'react';
import { cn } from '../../lib/utils';

const Switch = React.forwardRef(({ className, label, id, checked, onChange, disabled, ...props }, ref) => {
  const switchId = id || React.useId();
  return (
    <label
      htmlFor={switchId}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 select-none text-sm font-medium text-slate-700 dark:text-slate-200",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          id={switchId}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
          ref={ref}
          {...props}
        />
        <div className={cn(
          "h-6 w-11 rounded-full border-2 border-transparent bg-slate-200 transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/20 peer-checked:bg-blue-600 dark:bg-slate-700 dark:peer-checked:bg-blue-500",
          className
        )} />
        <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-200 peer-checked:translate-x-5" />
      </div>
      {label && <span>{label}</span>}
    </label>
  );
});
Switch.displayName = "Switch";

export { Switch };
