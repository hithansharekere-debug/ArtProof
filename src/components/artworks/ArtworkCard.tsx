"use client";

import React from "react";
import Link from "next/link";
import { Clock, Layers, ArrowUpRight, Palette, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ArtworkProject } from "@/types/provenance";

interface ArtworkCardProps {
  project: ArtworkProject;
  onDelete?: (id: string) => void;
}

export function ArtworkCard({ project }: ArtworkCardProps) {
  const milestoneCount = project.events ? project.events.length : 0;
  const recentEvents = (project.events || []).slice(-2);
  const formattedDate = new Date(project.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col justify-between h-full bg-white border border-[#E8E2D5] rounded-xl p-5 hover:border-[#C5BCAB] hover:shadow-xs transition-all duration-200 group">
      <div className="space-y-4">
        {/* Top Header: Badge & Date */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant={project.isDemo ? "copper" : "neutral"} size="sm">
            {project.isDemo ? "Demo Project" : "Studio Ledger"}
          </Badge>
          <span className="text-[11px] text-[#8C827A] flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-[#A8A29E]" />
            {formattedDate}
          </span>
        </div>

        {/* Thumbnail or Architectural Clean Placeholder */}
        <Link href={`/projects/${project.id}`} className="block focus:outline-none">
          {project.primaryArtwork?.dataUrl ? (
            <div className="w-full h-44 rounded-lg overflow-hidden bg-[#FAF7F0] border border-[#E8E2D5] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.primaryArtwork.dataUrl}
                alt={project.title}
                className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="w-full h-44 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5] flex flex-col items-center justify-center text-center p-4">
              <div className="w-10 h-10 rounded-full bg-[#F3EFE6] text-[#B86226] flex items-center justify-center mb-2">
                <Palette className="w-5 h-5" />
              </div>
              <span className="text-xs font-serif font-medium text-[#57534E]">
                {project.primaryArtwork?.name || "Original Artwork Master"}
              </span>
              <span className="text-[10px] text-[#8C827A] mt-0.5 font-mono">
                {project.primaryArtwork?.mimeType || "image/png"}
              </span>
            </div>
          )}
        </Link>

        {/* Title, Artist & Medium */}
        <div className="space-y-1">
          <h3 className="font-serif font-bold text-base text-[#1C1917] group-hover:text-[#B86226] transition-colors line-clamp-1">
            <Link href={`/projects/${project.id}`}>{project.title}</Link>
          </h3>
          <p className="text-xs text-[#57534E]">
            {project.artistName} <span className="text-[#A8A29E]">&bull;</span> {project.yearCreated}
          </p>
          <p className="text-xs text-[#78716C] font-mono line-clamp-1">
            Medium: {project.medium}
          </p>
        </div>

        {/* Relevant Milestones Snippet */}
        <div className="pt-2 border-t border-[#F0EAE1] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#57534E]">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#B86226]" />
              <span className="font-medium">{milestoneCount} Milestones</span>
            </span>
            <span className="text-[11px] text-[#8C827A] font-mono">
              Seq #{milestoneCount > 0 ? milestoneCount - 1 : 0}
            </span>
          </div>

          {recentEvents.length > 0 && (
            <div className="space-y-1">
              {recentEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between text-[11px] text-[#78716C] bg-[#FAF7F0] px-2 py-1 rounded border border-[#ECE6DA]"
                >
                  <span className="truncate max-w-[170px]">{ev.data.title}</span>
                  <span className="text-[10px] text-[#A8A29E] font-mono shrink-0">
                    {ev.data.milestonePhase || ev.eventType.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Open Action */}
      <div className="pt-4 mt-4 border-t border-[#F0EAE1] flex items-center justify-between">
        <span className="text-[11px] text-[#4A6356] flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          Digest linked
        </span>

        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1C1917] hover:text-[#B86226] transition-colors"
        >
          <span>Open artwork</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
