"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Plus,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  Palette,
  Activity,
} from "lucide-react";
import { Badge } from "../ui/Badge";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/artworks", label: "My artworks", icon: Palette },
    { href: "/activity", label: "Activity", icon: Activity },
    { href: "/verify", label: "Verify", icon: ShieldCheck },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#E8E2D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#292524] text-[#FDFBF7] flex items-center justify-center font-serif font-bold text-lg shadow-sm group-hover:bg-[#B86226] transition-colors">
                AP
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-semibold text-lg text-[#1C1917] tracking-tight flex items-center gap-2">
                  ArtProof
                  <Badge variant="parchment" size="sm" className="hidden sm:inline-flex">
                    InnovArt 2027
                  </Badge>
                </span>
                <span className="text-[10px] text-[#78716C] -mt-1 hidden sm:block">
                  Verifiable Creative Provenance
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-[#B86226] bg-[#F5EFE6]"
                      : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F1EA]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 bg-[#B86226] hover:bg-[#9E521F] active:bg-[#854519] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Artwork Project
            </Link>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3EFE6] rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8E2D5] bg-[#FDFBF7] px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? "text-[#B86226] bg-[#F5EFE6]"
                    : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F1EA]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2">
            <Link
              href="/projects/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 bg-[#B86226] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Artwork Project
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
