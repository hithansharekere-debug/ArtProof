import React from "react";
import Link from "next/link";
import { Shield, Sparkles } from "lucide-react";
import { APP_CONFIG } from "@/config/app-config";

export function Footer() {
  return (
    <footer className="no-print mt-auto border-t border-[#E8E2D5] bg-[#F7F4EC] text-[#57534E] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Column 1: Philosophy */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[#1C1917] font-semibold text-sm">
              <Shield className="w-4 h-4 text-[#B86226]" />
              <span>Verifiable Provenance Architecture</span>
            </div>
            <p className="text-[#78716C] leading-relaxed">
              ArtProof documents real creative milestones and byte-level SHA-256 digests. It never claims to detect AI or prove subjective human authorship.
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div className="space-y-2">
            <h4 className="font-semibold text-[#1C1917] text-xs tracking-wider uppercase">Application Navigation</h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/dashboard" className="hover:text-[#B86226] transition-colors">
                  Studio Projects & Timeline
                </Link>
              </li>
              <li>
                <Link href="/projects/new" className="hover:text-[#B86226] transition-colors">
                  Register Artwork
                </Link>
              </li>
              <li>
                <Link href="/verify" className="hover:text-[#B86226] transition-colors">
                  Public Manifest Verifier
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-[#B86226] transition-colors">
                  Local-First Privacy & Export
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Event & Specs */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-[#1C1917] text-xs tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#B86226]" />
              <span>{APP_CONFIG.hackathonNote}</span>
            </div>
            <p className="text-[#78716C] leading-relaxed">
              Built with client-side Web Crypto SHA-256 chains, RFC-canonical JSON serialization, and IndexedDB local-first storage. No external data telemetry.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-[#E8E2D5] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#A8A29E]">
          <p>© 2027 ArtProof • InnovArt Hackathon Entry • Local-First Privacy Compliant</p>
          <div className="flex items-center gap-4">
            <Link href="/settings" className="hover:text-[#57534E]">Privacy Statement</Link>
            <span className="text-[#D6CEBE]">•</span>
            <Link href="/verify" className="hover:text-[#57534E]">Manifest Verification</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
