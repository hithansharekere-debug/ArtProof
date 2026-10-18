import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`text-center py-12 px-6 rounded-xl border border-dashed border-[#D6CEBE] bg-[#FAF7F0]/40 max-w-lg mx-auto space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#F5EFE6] text-[#B86226] flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-serif font-semibold text-base text-[#1C1917]">{title}</h3>
      <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed max-w-sm mx-auto">
        {description}
      </p>
      {action && <div className="pt-2 flex justify-center">{action}</div>}
    </div>
  );
}
