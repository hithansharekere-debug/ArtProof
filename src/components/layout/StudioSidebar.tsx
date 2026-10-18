"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Palette,
  Activity,
  Settings,
  ShieldCheck,
  Plus,
  Database,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NewArtworkDialog } from "@/components/artworks/NewArtworkDialog";

interface StudioSidebarProps {
  className?: string;
}

export function StudioSidebar({ className = "" }: StudioSidebarProps) {
  const pathname = usePathname();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      label: "My artworks",
      href: "/artworks",
      icon: Palette,
      active: pathname === "/artworks" || pathname.startsWith("/projects"),
    },
    {
      label: "Activity",
      href: "/activity",
      icon: Activity,
      active: pathname === "/activity",
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      active: pathname === "/settings",
    },
    {
      label: "Verify Manifest",
      href: "/verify",
      icon: ShieldCheck,
      active: pathname === "/verify",
    },
  ];

  return (
    <>
      <aside
        className={`w-64 bg-[#FAF7F0] border-r border-[#E8E2D5] flex flex-col justify-between p-4 shrink-0 h-full ${className}`}
      >
        <div className="space-y-6">
          {/* Logo & Studio Brand */}
          <div className="px-2 pt-1 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#292524] text-[#FDFBF7] flex items-center justify-center font-serif font-bold text-base group-hover:bg-[#B86226] transition-colors shadow-xs">
                AP
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-base text-[#1C1917] tracking-tight leading-none">
                  ArtProof
                </span>
                <span className="text-[10px] text-[#8C827A] mt-1 font-mono uppercase tracking-wider">
                  Studio Space
                </span>
              </div>
            </Link>
          </div>

          {/* Quick Action: New Artwork */}
          <div className="px-1">
            <Button
              size="sm"
              className="w-full justify-center shadow-xs"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New artwork
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    item.active
                      ? "bg-[#F3EFE6] text-[#B86226] border border-[#E2DBD0]"
                      : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F1EA]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.active ? "text-[#B86226]" : "text-[#8C827A]"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Privacy & Storage Indicator */}
        <div className="pt-4 border-t border-[#E8E2D5] space-y-3">
          <div className="p-3 bg-white/70 border border-[#E8E2D5] rounded-xl space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#1C1917] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#4A6356]" />
                Local Storage
              </span>
              <Badge variant="sage" size="sm">
                Active
              </Badge>
            </div>
            <p className="text-[10px] text-[#78716C] leading-snug">
              IndexedDB local-first mode. Private files never leave your browser.
            </p>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#8C827A] px-1">
            <span>ArtProof v1.0.0</span>
            <Link href="/" className="hover:text-[#B86226] flex items-center gap-0.5">
              <span>Landing</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </aside>

      <NewArtworkDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </>
  );
}
