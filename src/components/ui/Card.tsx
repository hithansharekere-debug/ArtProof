import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "parchment" | "white" | "subtle";
  className?: string;
}

export function Card({
  children,
  variant = "white",
  className = "",
  ...props
}: CardProps) {
  const variantStyles = {
    white: "bg-white border-[#E8E2D5] shadow-[0_2px_8px_-2px_rgba(28,25,23,0.04)]",
    parchment: "bg-[#F7F4EC] border-[#E2DBD0] shadow-none",
    subtle: "bg-white/60 border-[#ECE6DA] backdrop-blur-xs",
  };

  return (
    <div
      className={`rounded-xl border p-5 md:p-6 transition-all duration-200 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
