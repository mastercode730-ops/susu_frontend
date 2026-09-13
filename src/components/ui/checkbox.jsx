import * as React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

const Checkbox = React.forwardRef(({ className, label, id, checked, onChange, ...props }, ref) => {
  const checkboxId = id || React.useId();
  return (
    <label htmlFor={checkboxId} className="inline-flex cursor-pointer items-center gap-2 select-none text-sm font-medium text-slate-700">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
          ref={ref}
          {...props}
        />
        <div className={cn(
          "h-4 w-4 rounded-md border border-slate-300 bg-white transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/20 peer-checked:border-blue-600 peer-checked:bg-blue-600",
          className
        )} />
        <Check className="absolute h-3 w-3 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100" />
      </div>
      {label && <span>{label}</span>}
    </label>
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
