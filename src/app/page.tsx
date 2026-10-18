"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Layers,
  FileCheck,
  FileCode,
  ShieldCheck,
  Sparkles,
  Lock,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DisclaimerBanner } from "@/components/ui/DisclaimerBanner";
import { storage } from "@/lib/storage/storage-provider";
import { generateDemoProject } from "@/lib/storage/demo-data";

export default function LandingPage() {
  const router = useRouter();
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      const demoProject = await generateDemoProject();
      await storage.saveProject(demoProject);
      router.push(`/projects/${demoProject.id}`);
    } catch (err) {
      console.error("Failed to seed demo project:", err);
      setLoadingDemo(false);
    }
  };

  const scrollToHowItWorks = () => {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-16 md:space-y-24 py-8 md:py-16">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3EFE6] border border-[#E2DBD0] text-xs font-medium text-[#78716C]">
          <Sparkles className="w-3.5 h-3.5 text-[#B86226]" />
          <span>Verifiable Artwork Provenance Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-[#1C1917] tracking-tight max-w-3xl mx-auto leading-[1.15]">
          Every artwork has a story. <br />
          <span className="italic font-normal text-[#B86226]">Preserve the proof.</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-[#57534E] max-w-2xl mx-auto font-sans leading-relaxed">
          Document your creative process, preserve important milestones, and share verifiable evidence of your artwork&apos;s recorded history.
        </p>

        {/* Primary Call to Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/dashboard">
            <Button size="lg" className="shadow-xs">
              <span>Open your studio</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>

          <Button
            variant="outline"
            size="lg"
            onClick={scrollToHowItWorks}
          >
            <span>See how it works</span>
            <ChevronDown className="w-4 h-4 ml-1 text-[#8C827A]" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={handleLoadDemo}
            isLoading={loadingDemo}
          >
            <Sparkles className="w-4 h-4 text-[#B86226] mr-1" />
            <span>Sample Demo Artwork</span>
          </Button>
        </div>

        {/* Clear Philosophical Boundary Banner */}
        <div className="max-w-2xl mx-auto pt-4 text-left">
          <DisclaimerBanner />
        </div>
      </section>

      {/* 3-Step Process Section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="text-center space-y-2 mb-12">
          <Badge variant="copper">The ArtProof Workflow</Badge>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
            How It Works in Three Steps
          </h2>
          <p className="text-xs sm:text-sm text-[#78716C] max-w-md mx-auto">
            A restrained, local-first system designed for artists, collectors, and galleries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <Card className="bg-white flex flex-col justify-between space-y-4 relative">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[#F5EFE6] text-[#B86226] flex items-center justify-center font-serif font-bold text-sm">
                1
              </div>
              <h3 className="font-serif font-semibold text-lg text-[#1C1917]">
                Document your creative process
              </h3>
              <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                Log concepts, initial sketches, value passes, underpaintings, and creative decisions. Each milestone is recorded chronologically with explicit timestamps and immutable sequence ordering.
              </p>
            </div>
            <div className="pt-2 border-t border-[#F0EAE1] flex items-center gap-1.5 text-[11px] text-[#8C827A] font-mono">
              <Layers className="w-3.5 h-3.5 text-[#B86226]" />
              <span>Chronological Milestones</span>
            </div>
          </Card>

          {/* Step 2 */}
          <Card className="bg-white flex flex-col justify-between space-y-4 relative">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[#EBF2EE] text-[#375244] flex items-center justify-center font-serif font-bold text-sm">
                2
              </div>
              <h3 className="font-serif font-semibold text-lg text-[#1C1917]">
                Preserve versions and evidence
              </h3>
              <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                Attach process scans, sketches, or revised master files. Cryptographic SHA-256 digests are calculated locally on raw bytes via the Web Crypto API, creating an unbroken tamper-evident link to predecessors.
              </p>
            </div>
            <div className="pt-2 border-t border-[#F0EAE1] flex items-center gap-1.5 text-[11px] text-[#8C827A] font-mono">
              <FileCheck className="w-3.5 h-3.5 text-[#375244]" />
              <span>SHA-256 Byte Verification</span>
            </div>
          </Card>

          {/* Step 3 */}
          <Card className="bg-white flex flex-col justify-between space-y-4 relative">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[#F3EFE6] text-[#292524] flex items-center justify-center font-serif font-bold text-sm">
                3
              </div>
              <h3 className="font-serif font-semibold text-lg text-[#1C1917]">
                Share a provenance passport
              </h3>
              <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                Export a clean, printable passport and JSON manifest. Viewers and collectors can independently verify file integrity without installing software or creating accounts.
              </p>
            </div>
            <div className="pt-2 border-t border-[#F0EAE1] flex items-center gap-1.5 text-[11px] text-[#8C827A] font-mono">
              <FileCode className="w-3.5 h-3.5 text-[#292524]" />
              <span>Portable Manifest Export</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Honest Scope and Philosophy Card */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FAF7F0] border border-[#E8E2D5] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="ink">Authenticity Standard</Badge>
            <span className="text-xs font-semibold text-[#57534E] uppercase tracking-wider">
              Verification Scope & Honest Principles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-[#57534E]">
            <div className="space-y-2.5">
              <h4 className="font-serif font-semibold text-[#1C1917] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                What ArtProof Verifies
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-xs leading-relaxed">
                <li>Whether an artwork file byte hash matches the recorded manifest.</li>
                <li>Whether chronological timeline event hashes have been altered.</li>
                <li>Predecessor digest link integrity across each recorded milestone.</li>
                <li>Local-first security: files never leave your device without export.</li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-serif font-semibold text-[#1C1917] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#B86226] shrink-0" />
                What ArtProof Does Not Claim
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-xs leading-relaxed">
                <li>ArtProof is NOT an AI detector.</li>
                <li>Does not certify that a human created an artwork.</li>
                <li>Does not certify copyright ownership or artistic uniqueness.</li>
                <li>Local device timestamps are recorded milestones, not third-party notary stamps.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <h3 className="font-serif font-bold text-2xl text-[#1C1917]">
          Ready to record your artwork&apos;s story?
        </h3>
        <p className="text-xs sm:text-sm text-[#78716C]">
          No accounts, external databases, or subscription keys required.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link href="/dashboard">
            <Button size="md">
              <span>Open your studio</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link href="/verify">
            <Button variant="outline" size="md">
              <ShieldCheck className="w-4 h-4 text-[#375244] mr-1" />
              <span>Verify a manifest</span>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
