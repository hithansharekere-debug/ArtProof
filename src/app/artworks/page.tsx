"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Palette, Sparkles } from "lucide-react";
import { StudioShell } from "@/components/layout/StudioShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ArtworkCard } from "@/components/artworks/ArtworkCard";
import { NewArtworkDialog } from "@/components/artworks/NewArtworkDialog";
import { storage } from "@/lib/storage/storage-provider";
import { generateDemoProject } from "@/lib/storage/demo-data";
import { ArtworkProject } from "@/types/provenance";

export default function MyArtworksPage() {
  const [projects, setProjects] = useState<ArtworkProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedium, setSelectedMedium] = useState("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  useEffect(() => {
    let active = true;
    storage.getProjects().then((all) => {
      if (active) {
        setProjects(all);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const refreshProjects = async () => {
    setLoading(true);
    try {
      const all = await storage.getProjects();
      setProjects(all);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    try {
      const demo = await generateDemoProject();
      await storage.saveProject(demo);
      await refreshProjects();
    } catch (err) {
      console.error("Failed to seed demo:", err);
    } finally {
      setSeedingDemo(false);
    }
  };

  const mediums = Array.from(new Set(projects.map((p) => p.medium))).filter(Boolean);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.medium.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.artistName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMedium = selectedMedium === "ALL" || p.medium === selectedMedium;

    return matchesSearch && matchesMedium;
  });

  return (
    <StudioShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D5] pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
              My Artworks
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C] mt-1">
              Registered artwork records and chronological creative ledgers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              New artwork
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        {projects.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E8E2D5]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C827A]" />
              <input
                type="text"
                placeholder="Search artworks by title or medium..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F0] border border-[#D6CEBE] rounded-lg text-[#1C1917] placeholder:text-[#8C827A] focus:outline-none focus:ring-1 focus:ring-[#B86226]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#8C827A] font-medium">Medium:</span>
              <select
                value={selectedMedium}
                onChange={(e) => setSelectedMedium(e.target.value)}
                className="text-xs py-1.5 px-2 bg-[#FAF7F0] border border-[#D6CEBE] rounded-lg text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#B86226]"
              >
                <option value="ALL">All Mediums</option>
                {mediums.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {loading ? (
          <LoadingState message="Loading artwork catalog..." />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon={Palette}
            title={searchQuery || selectedMedium !== "ALL" ? "No matching artworks" : "No artworks in studio yet"}
            description={
              searchQuery || selectedMedium !== "ALL"
                ? "No artworks match your search or filter criteria. Try resetting filters."
                : "Register an artwork project to record underpaintings, color glazes, and archival master exports."
            }
            action={
              searchQuery || selectedMedium !== "ALL" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedMedium("ALL");
                  }}
                >
                  Reset filters
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Register Artwork
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSeedDemo}
                    isLoading={seedingDemo}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#B86226] mr-1" />
                    Load Demo Study
                  </Button>
                </div>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((proj) => (
              <ArtworkCard key={proj.id} project={proj} />
            ))}
          </div>
        )}
      </div>

      <NewArtworkDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreated={() => refreshProjects()}
      />
    </StudioShell>
  );
}
