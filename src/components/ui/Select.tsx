import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, hint, required, className = "", id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[#292524]">
            {label} {required && <span className="text-[#B86226]">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          className={`w-full px-3.5 py-2 text-sm bg-[#FDFBF7] text-[#1C1917] border rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-[#B86226] focus:border-[#B86226] disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? "border-red-500 bg-red-50/20" : "border-[#D6CEBE] hover:border-[#C5BCAB]"
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hint && !error && (
          <p id={`${selectId}-hint`} className="text-[11px] text-[#78716C]">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${selectId}-error`} className="text-[11px] text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
