"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Plus,
  LayoutDashboard,
  Palette,
  Activity,
  Settings,
  ShieldCheck,
  Database,
} from "lucide-react";
import { StudioSidebar } from "./StudioSidebar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NewArtworkDialog } from "@/components/artworks/NewArtworkDialog";

interface StudioShellProps {
  children: React.ReactNode;
}

export function StudioShell({ children }: StudioShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My artworks", href: "/artworks", icon: Palette },
    { label: "Activity", href: "/activity", icon: Activity },
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "Verify", href: "/verify", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#FDFBF7]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <StudioSidebar className="min-h-full sticky top-16" />
      </div>

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#E8E2D5] bg-[#FAF7F0] sticky top-16 z-30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-[#57534E] hover:bg-[#F3EFE6] transition-colors"
            aria-label="Toggle studio menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-serif font-bold text-sm text-[#1C1917]">Artist Studio</span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="text-xs py-1 px-2.5">
            <Plus className="w-3.5 h-3.5 mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8E2D5] bg-[#FAF7F0] px-4 py-3 space-y-2 z-30 animate-in slide-in-from-top-2">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-[#F3EFE6] text-[#B86226]"
                      : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F1EA]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-[#E8E2D5] flex items-center justify-between text-[11px] text-[#78716C] px-2">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-[#4A6356]" />
              Local IndexedDB
            </span>
            <Badge variant="sage" size="sm">
              Protected
            </Badge>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>

      <NewArtworkDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </div>
  );
}
