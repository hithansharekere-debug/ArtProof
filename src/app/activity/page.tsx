"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Layers,
  Clock,
  Sparkles,
  ArrowRight,
  FileCheck,
  Palette,
} from "lucide-react";
import { StudioShell } from "@/components/layout/StudioShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HashViewer } from "@/components/ui/HashViewer";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { storage } from "@/lib/storage/storage-provider";
import { generateDemoProject } from "@/lib/storage/demo-data";
import { ArtworkProject, TimelineEvent } from "@/types/provenance";

export default function ActivityPage() {
  const [projects, setProjects] = useState<ArtworkProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
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

  const refreshData = async () => {
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
      await refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setSeedingDemo(false);
    }
  };

  // Compile flat list of all milestone events with their parent project
  const allEvents: { project: ArtworkProject; event: TimelineEvent }[] = [];
  projects.forEach((proj) => {
    proj.events.forEach((ev) => {
      allEvents.push({ project: proj, event: ev });
    });
  });

  // Sort descending by timestamp
  allEvents.sort(
    (a, b) => new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime()
  );

  const filteredEvents = allEvents.filter(({ event }) => {
    if (filterType === "ALL") return true;
    return event.eventType === filterType;
  });

  return (
    <StudioShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D5] pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#B86226]" />
              Studio Activity Feed
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C] mt-1">
              Chronological log of recorded milestones, evidence attachments, and cryptographic ledger updates.
            </p>
          </div>

          {allEvents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#8C827A] font-medium">Filter:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs py-1.5 px-2 bg-white border border-[#D6CEBE] rounded-lg text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#B86226]"
              >
                <option value="ALL">All Event Types</option>
                <option value="PROJECT_CREATED">Project Genesis</option>
                <option value="MILESTONE_LOGGED">Milestone Logged</option>
                <option value="EVIDENCE_ATTACHED">Evidence Attached</option>
                <option value="ARTWORK_REVISED">Artwork Revised</option>
              </select>
            </div>
          )}
        </div>

        {/* Feed List */}
        {loading ? (
          <LoadingState message="Loading studio milestones..." />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={filterType !== "ALL" ? "No matching events" : "No milestones recorded yet"}
            description={
              filterType !== "ALL"
                ? "No events found for this filter type. Try resetting to all event types."
                : "Milestones logged on your artworks will appear in this chronological activity stream."
            }
            action={
              filterType !== "ALL" ? (
                <Button variant="outline" size="sm" onClick={() => setFilterType("ALL")}>
                  Show all events
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Link href="/dashboard">
                    <Button size="sm">Go to Dashboard</Button>
                  </Link>
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
          <div className="space-y-4">
            {filteredEvents.map(({ project, event }) => {
              const isGenesis = event.sequence === 0;

              return (
                <Card
                  key={`${project.id}-${event.id}`}
                  className="bg-white p-5 hover:border-[#C5BCAB] transition-colors space-y-3"
                >
                  {/* Top metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EAE1] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          isGenesis
                            ? "ink"
                            : event.eventType === "ARTWORK_REVISED"
                            ? "copper"
                            : event.eventType === "EVIDENCE_ATTACHED"
                            ? "sage"
                            : "parchment"
                        }
                        size="sm"
                      >
                        {event.eventType.replace("_", " ")}
                      </Badge>

                      {event.data.milestonePhase && (
                        <Badge variant="parchment" size="sm">
                          Phase: {event.data.milestonePhase}
                        </Badge>
                      )}

                      <span className="text-xs text-[#8C827A] font-mono">
                        Seq #{event.sequence}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#8C827A]">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Body & Associated Artwork */}
                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <h3 className="font-serif font-bold text-base text-[#1C1917]">
                        {event.data.title}
                      </h3>
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-xs font-medium text-[#B86226] hover:underline flex items-center gap-1"
                      >
                        <Palette className="w-3 h-3" />
                        <span>Artwork: {project.title}</span>
                      </Link>
                    </div>

                    {event.data.description && (
                      <p className="text-xs text-[#57534E] leading-relaxed">
                        {event.data.description}
                      </p>
                    )}
                  </div>

                  {/* Notes snippet */}
                  {event.data.notes && (
                    <div className="p-2.5 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5] text-xs text-[#57534E] italic">
                      &ldquo;{event.data.notes}&rdquo;
                    </div>
                  )}

                  {/* Evidence attachment indicator */}
                  {Array.isArray(event.data.evidence) && event.data.evidence.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-[#375244] font-medium">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>
                        {event.data.evidence.length} evidence file(s) attached & digested
                      </span>
                    </div>
                  )}

                  {/* Hash linkage */}
                  <div className="pt-2 border-t border-[#F0EAE1] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#8C827A]">Digest:</span>
                      <HashViewer hash={event.currentDigest} truncate={true} />
                    </div>

                    <Link
                      href={`/projects/${project.id}`}
                      className="text-xs font-semibold text-[#1C1917] hover:text-[#B86226] inline-flex items-center gap-1 self-end"
                    >
                      <span>Inspect timeline</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudioShell>
  );
}
