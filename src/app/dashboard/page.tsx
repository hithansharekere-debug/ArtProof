"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Sparkles,
  Search,
  Layers,
  Palette,
  Activity,
  ShieldCheck,
  Clock,
  ArrowRight,
} from "lucide-react";
import { StudioShell } from "@/components/layout/StudioShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ArtworkCard } from "@/components/artworks/ArtworkCard";
import { NewArtworkDialog } from "@/components/artworks/NewArtworkDialog";
import { storage } from "@/lib/storage/storage-provider";
import { generateDemoProject } from "@/lib/storage/demo-data";
import { ArtworkProject, TimelineEvent } from "@/types/provenance";

export default function DashboardPage() {
  const [projects, setProjects] = useState<ArtworkProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.medium.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.artistName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Extract recent milestones across all projects
  const recentActivities: { project: ArtworkProject; event: TimelineEvent }[] = [];
  projects.forEach((proj) => {
    proj.events.forEach((ev) => {
      recentActivities.push({ project: proj, event: ev });
    });
  });
  recentActivities.sort(
    (a, b) => new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime()
  );
  const displayedActivities = recentActivities.slice(0, 5);

  const totalMilestones = projects.reduce((acc, p) => acc + (p.events ? p.events.length : 0), 0);

  return (
    <StudioShell>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D5] pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
              Studio Overview
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C] mt-1">
              Manage your registered artwork projects, chronological milestones, and provenance ledgers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {projects.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedDemo}
                isLoading={seedingDemo}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B86226] mr-1" />
                Seed Sample Study
              </Button>
            )}

            <Link href="/projects/new">
              <Button variant="outline" size="sm">
                Full Registration Flow
              </Button>
            </Link>

            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              New artwork
            </Button>
          </div>
        </div>

        {/* Studio Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 bg-white space-y-1">
            <span className="text-[11px] font-semibold text-[#8C827A] uppercase tracking-wider block">
              Active Projects
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif font-bold text-2xl text-[#1C1917]">
                {loading ? "..." : projects.length}
              </span>
              <Palette className="w-4 h-4 text-[#B86226]" />
            </div>
            <p className="text-[11px] text-[#78716C]">
              {projects.length === 1 ? "1 artwork ledger" : `${projects.length} artwork ledgers`} in browser storage
            </p>
          </Card>

          <Card className="p-4 bg-white space-y-1">
            <span className="text-[11px] font-semibold text-[#8C827A] uppercase tracking-wider block">
              Recorded Milestones
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif font-bold text-2xl text-[#1C1917]">
                {loading ? "..." : totalMilestones}
              </span>
              <Layers className="w-4 h-4 text-[#375244]" />
            </div>
            <p className="text-[11px] text-[#78716C]">
              Linked with SHA-256 predecessor digests
            </p>
          </Card>

          <Card className="p-4 bg-white space-y-1">
            <span className="text-[11px] font-semibold text-[#8C827A] uppercase tracking-wider block">
              Privacy & Storage Mode
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-serif font-bold text-base text-[#1C1917]">
                Local IndexedDB
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[11px] text-[#78716C]">
              Zero cloud uploads &bull; 100% private
            </p>
          </Card>
        </div>

        {/* Artwork Projects Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-serif font-bold text-lg text-[#1C1917]">
                Artwork Projects
              </h2>
              <p className="text-xs text-[#78716C]">
                Explore your registered studio canvases, studies, and prints.
              </p>
            </div>

            {projects.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C827A]" />
                <input
                  type="text"
                  placeholder="Search title, artist, medium..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D6CEBE] rounded-lg text-[#1C1917] placeholder:text-[#8C827A] focus:outline-none focus:ring-1 focus:ring-[#B86226]"
                />
              </div>
            )}
          </div>

          {/* Project Cards Grid / Empty State */}
          {loading ? (
            <LoadingState message="Loading studio projects..." />
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={Palette}
              title={searchQuery ? "No matching artworks found" : "No registered artworks yet"}
              description={
                searchQuery
                  ? `No artworks matched "${searchQuery}". Try clearing your search filter.`
                  : "Start documenting your creative process by registering your first artwork project."
              }
              action={
                searchQuery ? (
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                    Clear search
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Create artwork
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSeedDemo}
                      isLoading={seedingDemo}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#B86226] mr-1" />
                      Seed Demo Study
                    </Button>
                  </div>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ArtworkCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-4 pt-4 border-t border-[#E8E2D5]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif font-bold text-lg text-[#1C1917] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#B86226]" />
                Recent Studio Activity
              </h2>
              <p className="text-xs text-[#78716C]">
                Chronological log of recorded milestones and integrity events.
              </p>
            </div>
            {displayedActivities.length > 0 && (
              <Link
                href="/activity"
                className="text-xs font-semibold text-[#B86226] hover:text-[#9E521F] flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {displayedActivities.length === 0 ? (
            <div className="p-6 rounded-xl border border-[#E8E2D5] bg-[#FAF7F0]/40 text-center text-xs text-[#78716C]">
              No milestone events logged yet. Once you record an artwork or milestone, it will appear here.
            </div>
          ) : (
            <div className="border border-[#E8E2D5] rounded-xl divide-y divide-[#F0EAE1] bg-white overflow-hidden">
              {displayedActivities.map(({ project, event }) => (
                <div
                  key={`${project.id}-${event.id}`}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAF7F0] transition-colors text-xs"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <Badge
                      variant={event.sequence === 0 ? "ink" : "parchment"}
                      size="sm"
                    >
                      Seq #{event.sequence}
                    </Badge>
                    <div>
                      <div className="font-medium text-[#1C1917] flex items-center gap-1.5">
                        <span>{event.data.title}</span>
                        <span className="text-[#A8A29E]">&bull;</span>
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-[#B86226] hover:underline"
                        >
                          {project.title}
                        </Link>
                      </div>
                      {event.data.description && (
                        <p className="text-[11px] text-[#78716C] line-clamp-1 mt-0.5">
                          {event.data.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#8C827A] shrink-0 font-mono">
                    <Clock className="w-3 h-3 text-[#A8A29E]" />
                    <span>{new Date(event.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NewArtworkDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreated={() => refreshProjects()}
      />
    </StudioShell>
  );
}
