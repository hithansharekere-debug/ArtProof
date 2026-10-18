"use client";

import React, { useState } from "react";
import { Check, Copy, Hash } from "lucide-react";

interface HashViewerProps {
  hash: string;
  label?: string;
  truncate?: boolean;
  className?: string;
}

export function HashViewer({
  hash,
  label,
  truncate = true,
  className = "",
}: HashViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!truncate);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const displayHash =
    truncate && !isExpanded && hash.length > 16
      ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
      : hash;

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-[#F5F2EB] hover:bg-[#EFEAE0] border border-[#E0D8C8] px-2.5 py-1 rounded-md text-xs text-[#44403C] transition-colors ${className}`}
    >
      <Hash className="w-3.5 h-3.5 text-[#8C827A] shrink-0" />
      {label && <span className="text-[#78716C] font-sans font-medium">{label}:</span>}
      <code
        onClick={() => truncate && setIsExpanded(!isExpanded)}
        className="font-mono text-[11px] tracking-tight cursor-pointer hover:text-[#1C1917] select-all break-all"
        title="Click to toggle full hash"
      >
        {displayHash}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy hash"
        className="p-1 hover:text-[#B86226] text-[#78716C] transition-colors ml-0.5 rounded"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}
