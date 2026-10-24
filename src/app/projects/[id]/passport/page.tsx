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
  History,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HashViewer } from "@/components/ui/HashViewer";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { storage } from "@/lib/storage/storage-provider";
import { useParams } from "next/navigation";
import { buildProvenanceManifest, verifyProvenanceManifest } from "@/lib/crypto/manifest";
import { manifestImportSchema, sanitizeFilename } from "@/lib/validation/schemas";
import { ArtworkProject, ProvenanceManifest, VerificationReport } from "@/types/provenance";

export const dynamic = "force-dynamic";

export default function ProvenancePassportPage() {
  const params = useParams();
  const projectId = typeof params?.id === "string" ? params.id : "";

  const [project, setProject] = useState<ArtworkProject | null>(null);
  const [manifest, setManifest] = useState<ProvenanceManifest | null>(null);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

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
    try {
      const val = manifestImportSchema.safeParse(manifest);
      if (!val.success) {
        console.error("Manifest schema validation error:", val.error);
      }
      const jsonString = JSON.stringify(manifest, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = sanitizeFilename(project.title, "artwork");
      a.download = `${safeName}-provenance-manifest.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadNotice("Validated manifest downloaded successfully. Temporary URLs cleared.");
      setTimeout(() => setDownloadNotice(null), 4000);
    } catch (err) {
      console.error("Failed to export manifest JSON:", err);
    }
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

      {downloadNotice && (
        <div className="no-print p-3 bg-[#EBF2EE] border border-[#C5D8CE] rounded-xl text-xs text-[#2D4538] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
        </div>
      )}

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
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-sm text-[#57534E] font-medium">
                Attributed Artist: <span className="text-[#1C1917] font-semibold">{project.artistName}</span>
              </span>
              <Badge variant="parchment" size="sm">
                Artist-Reported Claim
              </Badge>
            </div>
          </div>

          <div className="sm:text-right space-y-1.5 shrink-0">
            <Badge variant="sage" size="md">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#375244]" />
              Hash Chain Verified
            </Badge>
            <div className="text-[11px] text-[#8C827A] font-mono">
              Spec: {manifest.canonicalSpec}
            </div>
            <div className="text-[11px] text-[#8C827A]">
              Generated: {new Date(manifest.generatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Section 1: Artist-Provided Curatorial Claims */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E2D5]/70 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              <FileCheck className="w-4 h-4 text-[#B86226]" />
              <span>1. Curatorial Attributions & Metadata</span>
            </div>
            <Badge variant="parchment" size="sm">
              Self-Reported by Artist
            </Badge>
          </div>

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
                  <span className="text-[#8C827A] block text-[10px] uppercase font-semibold">Provenance Records</span>
                  <span className="font-medium text-[#1C1917] mt-0.5 block">
                    {manifest.summary.totalEvents} Events • {manifest.summary.totalVersions || (manifest.versions?.length || 1)} Versions
                  </span>
                </div>
              </div>

              {project.description && (
                <div className="p-3.5 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5] text-xs text-[#57534E] leading-relaxed">
                  <span className="text-[#8C827A] block text-[10px] uppercase font-semibold mb-1">
                    Artist Statement
                  </span>
                  {project.description}
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-[#8C827A] tracking-wider block">
                  Primary Artwork Registered SHA-256 Digest:
                </span>
                <HashViewer
                  hash={project.primaryArtwork.sha256Hash}
                  truncate={false}
                  className="w-full justify-between"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Recorded Artwork Versions */}
        {Array.isArray(manifest.versions) && manifest.versions.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-[#E8E2D5]">
            <div className="flex items-center justify-between border-b border-[#E8E2D5]/70 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#78716C] uppercase tracking-wider">
                <History className="w-4 h-4 text-[#B86226]" />
                <span>2. Recorded Artwork Versions ({manifest.versions.length})</span>
              </div>
              <Badge variant="sage" size="sm">
                Byte-Hashed Milestones
              </Badge>
            </div>

            <div className="border border-[#E8E2D5] rounded-xl overflow-hidden text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F0] border-b border-[#E8E2D5] text-left text-[11px] font-semibold text-[#78716C]">
                    <th className="py-2.5 px-3">Version</th>
                    <th className="py-2.5 px-3">File Name & Size</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 font-mono">SHA-256 Digest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE1]">
                  {manifest.versions.map((ver) => (
                    <tr key={ver.id} className="hover:bg-[#FCFAF7] transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#1C1917]">
                        {ver.versionLabel}
                      </td>
                      <td className="py-2.5 px-3 text-[#57534E]">
                        <span className="font-medium text-[#1C1917]">
                          {ver.fileName || "Version File"}
                        </span>
                        <span className="text-[10px] text-[#8C827A] block">
                          {(((ver.fileSizeBytes || 0) / 1024).toFixed(1))} KB
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {ver.isArchivalFinal ? (
                          <Badge variant="copper" size="sm">Archival Master</Badge>
                        ) : (
                          <Badge variant="parchment" size="sm">Progression</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#78716C] text-[11px] italic">
                        {ver.notes || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-[#57534E]">
                        <HashViewer hash={ver.sha256Hash || ""} truncate={true} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 3: Chronological Process Milestones */}
        <div className="space-y-3 pt-4 border-t border-[#E8E2D5]">
          <div className="flex items-center justify-between border-b border-[#E8E2D5]/70 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#78716C] uppercase tracking-wider">
              <Layers className="w-4 h-4 text-[#B86226]" />
              <span>3. Recorded Process Milestones ({manifest.eventChain.length})</span>
            </div>
            <Badge variant="sage" size="sm">
              Cryptographic Hash Chain
            </Badge>
          </div>

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

        {/* Section 4: Cryptographic Ledger Anchor */}
        <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#E8E2D5] space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E2D5]/70 pb-2">
            <span className="font-serif font-semibold text-[#1C1917]">
              4. Cryptographic Head Anchor & Specification
            </span>
            <span className="text-[11px] font-mono text-[#8C827A]">
              Manifest v{manifest.manifestVersion} • {manifest.canonicalSpec}
            </span>
          </div>
          <div className="space-y-1">
            <HashViewer hash={headDigest} truncate={false} className="w-full justify-between" />
            <p className="text-[11px] text-[#78716C] pt-1">
              The head digest cryptographically anchors every preceding milestone in the event chain.
              Verify independently using any SHA-256 tool or the ArtProof offline client.
            </p>
          </div>
        </div>

        {/* Section 5: Clear Limitations & Disclaimers Footer */}
        <div className="pt-4 border-t border-[#E8E2D5] space-y-3 text-[11px] text-[#78716C] leading-relaxed">
          <div className="flex items-center gap-1.5 font-semibold text-[#1C1917] uppercase tracking-wider text-[10px]">
            <Info className="w-3.5 h-3.5 text-[#B86226]" />
            <span>Honest Verification Limitations & Scope</span>
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

      {/* Print stylesheet helper */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, header, footer, nav {
            display: none !important;
          }
          .passport-container {
            border: 1px solid #d6cebe !important;
            box-shadow: none !important;
            padding: 1.5rem !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
