import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#292524]">
            {label} {required && <span className="text-[#B86226]">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`w-full px-3.5 py-2 text-sm bg-[#FDFBF7] text-[#1C1917] border rounded-lg transition-colors placeholder:text-[#8C827A] focus:outline-none focus:ring-1 focus:ring-[#B86226] focus:border-[#B86226] disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? "border-red-500 bg-red-50/20" : "border-[#D6CEBE] hover:border-[#C5BCAB]"
          } ${className}`}
          {...props}
        />
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-[11px] text-[#78716C]">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-[11px] text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
