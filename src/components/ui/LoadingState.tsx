import React from "react";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Loading...",
  className = "py-16",
}: LoadingStateProps) {
  return (
    <div className={`text-center space-y-3 ${className}`} role="status">
      <div className="inline-block animate-spin w-8 h-8 border-2 border-[#B86226] border-t-transparent rounded-full" />
      <p className="text-xs text-[#78716C] font-medium">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className = "py-8",
}: ErrorStateProps) {
  return (
    <div
      className={`p-6 rounded-xl border border-red-200 bg-red-50/50 text-center max-w-md mx-auto space-y-3 ${className}`}
      role="alert"
    >
      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-sm font-bold">
        !
      </div>
      <h3 className="font-serif font-semibold text-sm text-red-900">{title}</h3>
      <p className="text-xs text-red-700 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-xs font-semibold text-[#B86226] hover:text-[#9E521F] underline focus:outline-none"
        >
          Try again
        </button>
      )}
    </div>
  );
}
