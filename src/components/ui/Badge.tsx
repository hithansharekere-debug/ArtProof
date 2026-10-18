import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "copper" | "sage" | "ink" | "parchment" | "danger" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  className = "",
}: BadgeProps) {
  const variantStyles = {
    copper: "bg-[#FBF0E6] text-[#9E521F] border border-[#EACBB2]",
    sage: "bg-[#EBF2EE] text-[#375244] border border-[#C5D8CE]",
    ink: "bg-[#292524] text-[#FDFBF7] border border-[#1C1917]",
    parchment: "bg-[#F5F1EA] text-[#57534E] border border-[#E8E2D5]",
    danger: "bg-[#FDF2F2] text-[#991B1B] border border-[#F87171]/40",
    neutral: "bg-[#F3EFE6] text-[#44403C] border border-[#DCD5C5]",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full tracking-wide transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}
