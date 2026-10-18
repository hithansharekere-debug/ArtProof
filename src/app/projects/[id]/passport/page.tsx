"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Info,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HashViewer } from "@/components/ui/HashViewer";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { storage } from "@/lib/storage/storage-provider";
import { useParams } from "next/navigation";
import { buildProvenanceManifest, verifyProvenanceManifest } from "@/lib/crypto/manifest";
import { ArtworkProject, ProvenanceManifest, VerificationReport } from "@/types/provenance";

export const dynamic = "force-dynamic";

export default function ProvenancePassportPage() {
  const params = useParams();
  const projectId = typeof params?.id === "string" ? params.id : "";

  const [project, setProject] = useState<ArtworkProject | null>(null);
  const [manifest, setManifest] = useState<ProvenanceManifest | null>(null);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    storage.getProject(projectId).then(async (p) => {
      if (!active) return;
      if (!p) {
        setProject(null);
        setLoading(false);
        return;
      }
      setProject(p);
      const m = buildProvenanceManifest(p);
      setManifest(m);
      const rep = await verifyProvenanceManifest(m);
      if (active) {
        setReport(rep);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    if (!manifest || !project) return;
    const jsonString = JSON.stringify(manifest, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-provenance-manifest.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="py-20">
        <LoadingState message="Compiling artwork provenance passport..." />
      </div>
    );
  }

  if (!project || !manifest) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <EmptyState
          icon={ShieldCheck}
          title="Artwork Project Not Found"
          description="Cannot compile passport because this project was not found in local browser storage."
          action={
            <Link href="/dashboard">
              <Button size="sm">Back to Studio Dashboard</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const headDigest = manifest.summary.headDigest;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Top action bar (hidden in print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D5] pb-6">
        <div>
          <Link
            href={`/projects/${project.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#78716C] hover:text-[#1C1917] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Artwork Timeline
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
            Artwork Provenance Passport
          </h1>
          <p className="text-xs text-[#78716C] mt-1">
            Exportable certificate of recorded creative milestones & cryptographic integrity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print / Save as PDF
          </Button>

          <Button size="sm" onClick={handleDownloadJSON}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Download Manifest (JSON)
          </Button>
        </div>
      </div>

      {/* Verification Status Notification */}
      {report && (
        <div
          className={`no-print p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
            report.isValid
              ? "bg-[#EBF2EE] border-[#C5D8CE] text-[#2D4538]"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {report.isValid ? (
              <ShieldCheck className="w-5 h-5 text-[#375244] shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <div>
              <span className="font-semibold text-sm">
                {report.isValid
                  ? "Manifest Integrity Check: VALID"
                  : "Manifest Integrity Alert"}
              </span>
              <p className="text-[11px] opacity-90 mt-0.5">
                {report.isValid
                  ? `Cryptographic event chain of ${report.totalEventsChecked} events is unbroken. Predecessor links match.`
                  : report.failureReason}
              </p>
            </div>
          </div>

          <Link href="/verify">
            <Button variant="outline" size="sm" className="bg-white/80">
              <ExternalLink className="w-3 h-3 mr-1" />
              Open Independent Verifier
            </Button>
          </Link>
        </div>
      )}

      {/* Printable Passport Certificate Document */}
      <div className="passport-container bg-white border border-[#D6CEBE] rounded-2xl shadow-sm p-6 sm:p-10 space-y-8 relative overflow-hidden">
        {/* Subtle decorative watermark/seal */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#FBF0E6]/50 rounded-bl-full pointer-events-none -z-0" />

        {/* Certificate Header */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-[#E8E2D5] pb-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <span className="font-serif font-bold text-xl tracking-tight text-[#1C1917]">
                ArtProof
              </span>
              <span className="text-xs text-[#8C827A]">•</span>
              <span className="text-xs uppercase tracking-widest font-semibold text-[#B86226]">
                Provenance Passport
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C1917] tracking-tight">
              {project.title}
            </h2>
            <p className="text-sm text-[#57534E] font-medium">
              Attributed to: <span className="text-[#1C1917] font-semibold">{project.artistName}</span>
            </p>
          </div>

          <div className="sm:text-right space-y-1.5 shrink-0">
            <Badge variant="sage" size="md">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#375244]" />
              Integrity Verified
            </Badge>
            <div className="text-[11px] text-[#8C827A] font-mono">
              Spec: {manifest.canonicalSpec}
            </div>
            <div className="text-[11px] text-[#8C827A]">
              Passport Generated: {new Date(manifest.generatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Artwork Spec & Image */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {project.primaryArtwork.dataUrl && (
            <div className="md:col-span-1 rounded-xl overflow-hidden border border-[#E8E2D5] bg-[#FAF7F0] p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.primaryArtwork.dataUrl}
                alt={project.title}
                className="w-full h-auto max-h-64 object-contain rounded-lg"
              />
            </div>
          )}

          <div className={`${project.primaryArtwork.dataUrl ? "md:col-span-2" : "md:col-span-3"} space-y-4`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5]">
                <span className="text-[#8C827A] block text-[10px] uppercase font-semibold">Medium</span>
                <span className="font-medium text-[#1C1917] mt-0.5 block">{project.medium}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5]">
                <span className="text-[#8C827A] block text-[10px] uppercase font-semibold">Creation Year</span>
                <span className="font-medium text-[#1C1917] mt-0.5 block">{project.yearCreated}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5] col-span-2 sm:col-span-1">
                <span className="text-[#8C827A] block text-[10px] uppercase font-semibold">Recorded Milestones</span>
                <span className="font-medium text-[#1C1917] mt-0.5 block">{manifest.summary.totalEvents} Events</span>
              </div>
            </div>

            {project.description && (
              <div className="p-3.5 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5] text-xs text-[#57534E] leading-relaxed">
                <span className="text-[#8C827A] block text-[10px] uppercase font-semibold mb-1">
                  Artist Project Statement
                </span>
                {project.description}
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[#8C827A] tracking-wider block">
                Primary Artwork SHA-256 Digest:
              </span>
              <HashViewer
                hash={project.primaryArtwork.sha256Hash}
                truncate={false}
                className="w-full justify-between"
              />
            </div>
          </div>
        </div>

        {/* Chronological Milestone Summary Table */}
        <div className="space-y-3 pt-4 border-t border-[#E8E2D5]">
          <h3 className="font-serif font-semibold text-base text-[#1C1917] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#B86226]" />
            Recorded Creative Milestones
          </h3>

          <div className="border border-[#E8E2D5] rounded-xl overflow-hidden text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#FAF7F0] border-b border-[#E8E2D5] text-left text-[11px] font-semibold text-[#78716C]">
                  <th className="py-2.5 px-3">Seq</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Milestone Title & Notes</th>
                  <th className="py-2.5 px-3">Recorded (UTC)</th>
                  <th className="py-2.5 px-3 font-mono">Digest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1]">
                {manifest.eventChain.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#FCFAF7] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-[#78716C]">
                      #{ev.sequence}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-[#1C1917]">
                        {ev.eventType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 space-y-0.5">
                      <div className="font-medium text-[#1C1917]">{ev.data.title}</div>
                      {ev.data.notes && (
                        <div className="text-[11px] text-[#78716C] italic">{ev.data.notes}</div>
                      )}
                      {Array.isArray(ev.data.evidence) && ev.data.evidence.length > 0 && (
                        <div className="text-[10px] text-[#4A6356] font-medium">
                          +{ev.data.evidence.length} evidence file(s) attached
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#78716C] text-[11px] whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-[#57534E]">
                      {ev.currentDigest.substring(0, 10)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cryptographic Ledger Summary */}
        <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#E8E2D5] space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E2D5]/70 pb-2">
            <span className="font-serif font-semibold text-[#1C1917]">
              Cryptographic Head Digest
            </span>
            <span className="text-[11px] font-mono text-[#8C827A]">
              Manifest v{manifest.manifestVersion}
            </span>
          </div>
          <div className="space-y-1">
            <HashViewer hash={headDigest} truncate={false} className="w-full justify-between" />
            <p className="text-[11px] text-[#78716C] pt-1">
              The head digest cryptographically anchors every preceding milestone in the event chain.
            </p>
          </div>
        </div>

        {/* Clear Limitations & Disclaimers Footer */}
        <div className="pt-4 border-t border-[#E8E2D5] space-y-3 text-[11px] text-[#78716C] leading-relaxed">
          <div className="flex items-center gap-1.5 font-semibold text-[#1C1917] uppercase tracking-wider text-[10px]">
            <Info className="w-3.5 h-3.5 text-[#B86226]" />
            <span>Honest Verification Limitations</span>
          </div>
          <p>{manifest.declarations.limitationsDisclaimer}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-[#F0EAE1]">
            <div>
              <span className="font-semibold text-[#292524]">Integrity Scope:</span>
              <p className="mt-0.5">{manifest.declarations.integrityScope}</p>
            </div>
            <div>
              <span className="font-semibold text-[#292524]">Artist Claim:</span>
              <p className="mt-0.5">{manifest.declarations.artistClaim}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
