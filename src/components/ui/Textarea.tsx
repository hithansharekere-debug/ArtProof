import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className = "", id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-[#292524]">
            {label} {required && <span className="text-[#B86226]">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          className={`w-full px-3.5 py-2 text-sm bg-[#FDFBF7] text-[#1C1917] border rounded-lg transition-colors placeholder:text-[#8C827A] focus:outline-none focus:ring-1 focus:ring-[#B86226] focus:border-[#B86226] disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? "border-red-500 bg-red-50/20" : "border-[#D6CEBE] hover:border-[#C5BCAB]"
          } ${className}`}
          {...props}
        />
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-[11px] text-[#78716C]">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${textareaId}-error`} className="text-[11px] text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
