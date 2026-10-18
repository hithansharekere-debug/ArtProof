import React from "react";
import { Info, ShieldAlert } from "lucide-react";
import { APP_CONFIG } from "@/config/app-config";

interface DisclaimerBannerProps {
  variant?: "info" | "warning";
  title?: string;
  className?: string;
  compact?: boolean;
}

export function DisclaimerBanner({
  variant = "info",
  title = "Important Provenance & Verification Notice",
  className = "",
  compact = false,
}: DisclaimerBannerProps) {
  const isInfo = variant === "info";

  return (
    <aside
      aria-label="Provenance verification limitations"
      className={`rounded-xl border p-4 text-xs leading-relaxed ${
        isInfo
          ? "bg-[#FAF7F0] border-[#E5DEC9] text-[#57534E]"
          : "bg-[#FFF9F2] border-[#F0D5BE] text-[#7C3E14]"
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {isInfo ? (
          <Info className="w-4 h-4 text-[#8C827A] shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-[#B86226] shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <p className="font-semibold text-[#292524]">{title}</p>
          <p className="text-[#57534E]">{APP_CONFIG.disclaimer.corePhilosophy}</p>
          {!compact && (
            <div className="mt-2 pt-2 border-t border-[#E8E2D5]/70 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-[#78716C]">
              <div>
                <span className="font-medium text-[#292524]">Verified:</span> Raw byte SHA-256 hash matches and deterministic sequence link integrity.
              </div>
              <div>
                <span className="font-medium text-[#292524]">Not Claimed:</span> Proof of human authorship, non-AI origin, or legal copyright ownership.
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
