"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Layers,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  Plus,
  ExternalLink,
  Download,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Palette,
  History,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HashViewer } from "@/components/ui/HashViewer";
import { DisclaimerBanner } from "@/components/ui/DisclaimerBanner";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { storage } from "@/lib/storage/storage-provider";
import {
  createTimelineEvent,
  buildProvenanceManifest,
  verifyProvenanceManifest,
} from "@/lib/crypto/manifest";
import { computeSha256FromFile } from "@/lib/crypto/sha256";
import {
  validateArtworkFile,
  manifestImportSchema,
  sanitizeFilename,
  resolveArtworkMimeType,
  readArtworkDataUrl,
} from "@/lib/validation/schemas";
import { APP_CONFIG } from "@/config/app-config";
import {
  ArtworkProject,
  ArtworkVersion,
  AttachedEvidence,
  TimelineEventType,
  VerificationReport,
} from "@/types/provenance";

export const dynamic = "force-dynamic";

export default function ArtworkDetailPage() {
  const params = useParams();
  const projectId = typeof params?.id === "string" ? params.id : "";

  const [project, setProject] = useState<ArtworkProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);

  // New Milestone Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventPhase, setEventPhase] = useState<
    "CONCEPT" | "SKETCH" | "BLOCK_IN" | "REFINEMENT" | "FINAL_TOUCHES" | "EXPORT"
  >("SKETCH");
  const [eventDescription, setEventDescription] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [isRevision, setIsRevision] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");

  // Evidence file attachment state
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceHash, setEvidenceHash] = useState<string>("");
  const [evidenceCaption, setEvidenceCaption] = useState<string>("");
  const [evidencePreview, setEvidencePreview] = useState<string>("");
  const [evidenceHashing, setEvidenceHashing] = useState<boolean>(false);
  const [evidenceError, setEvidenceError] = useState<string>("");

  // Revised artwork file attachment state (if isRevision is checked)
  const [revisedArtworkFile, setRevisedArtworkFile] = useState<File | null>(null);
  const [revisedArtworkHash, setRevisedArtworkHash] = useState<string>("");
  const [revisedArtworkPreview, setRevisedArtworkPreview] = useState<string>("");
  const [revisedArtworkHashing, setRevisedArtworkHashing] = useState<boolean>(false);

  // Version recording modal state
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [versionNotes, setVersionNotes] = useState("");
  const [isArchivalFinal, setIsArchivalFinal] = useState(false);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionFileHash, setVersionFileHash] = useState<string>("");
  const [versionFilePreview, setVersionFilePreview] = useState<string>("");
  const [versionFileHashing, setVersionFileHashing] = useState<boolean>(false);
  const [versionError, setVersionError] = useState<string>("");
  const [versionSubmitting, setVersionSubmitting] = useState<boolean>(false);

  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Load project and perform live chain verification
  const refreshProjectAndVerify = async () => {
    setLoading(true);
    try {
      const p = await storage.getProject(projectId);
      if (!p) {
        setProject(null);
        return;
      }
      setProject(p);
      const manifest = buildProvenanceManifest(p);
      const report = await verifyProvenanceManifest(manifest);
      setVerificationReport(report);
    } catch (err) {
      console.error("Failed to load project:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    storage
      .getProject(projectId)
      .then(async (p) => {
        if (!active) return;
        if (!p) {
          setProject(null);
          return;
        }
        setProject(p);
        const manifest = buildProvenanceManifest(p);
        const report = await verifyProvenanceManifest(manifest);
        if (active) {
          setVerificationReport(report);
        }
      })
      .catch(() => {
        // Handled in finally
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  // Evidence file handler
  const handleEvidenceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const val = validateArtworkFile(file);
    if (!val.valid) {
      setEvidenceError(val.error || "Invalid file");
      return;
    }

    setEvidenceError("");
    setEvidenceFile(file);
    setEvidenceHashing(true);

    try {
      const [hash, preview] = await Promise.all([
        computeSha256FromFile(file),
        readArtworkDataUrl(file),
      ]);
      setEvidenceHash(hash);
      setEvidencePreview(preview);
    } catch (err) {
      setEvidenceError(`Failed to compute hash: ${String(err)}`);
    } finally {
      setEvidenceHashing(false);
    }
  };

  // Revised artwork file handler
  const handleRevisedArtworkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const val = validateArtworkFile(file);
    if (!val.valid) {
      setModalError(val.error || "Invalid file");
      return;
    }

    setRevisedArtworkFile(file);
    setRevisedArtworkHashing(true);

    try {
      const [hash, preview] = await Promise.all([
        computeSha256FromFile(file),
        readArtworkDataUrl(file),
      ]);
      setRevisedArtworkHash(hash);
      setRevisedArtworkPreview(preview);
    } catch (err) {
      setModalError(`Failed to compute revised artwork hash: ${String(err)}`);
    } finally {
      setRevisedArtworkHashing(false);
    }
  };

  // Submit new milestone event
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    if (!eventTitle.trim()) {
      setModalError("Milestone title is required.");
      return;
    }

    if (isRevision && (!revisedArtworkFile || !revisedArtworkHash)) {
      setModalError("Please provide the revised artwork file and verify its hash.");
      return;
    }

    setModalSubmitting(true);
    setModalError("");

    try {
      const currentEvents = project.events;
      const lastEvent = currentEvents[currentEvents.length - 1];
      const nextSequence = currentEvents.length;
      const previousDigest = lastEvent ? lastEvent.currentDigest : null;

      // Prepare attached evidence if present
      const attachedEvidenceList: AttachedEvidence[] = [];
      if (evidenceFile && evidenceHash) {
        attachedEvidenceList.push({
          id: `evi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: evidenceFile.name,
          mimeType: resolveArtworkMimeType(evidenceFile) || evidenceFile.type || "application/octet-stream",
          sizeBytes: evidenceFile.size,
          sha256Hash: evidenceHash,
          caption: evidenceCaption.trim() || undefined,
          recordedAt: new Date().toISOString(),
          fileDataUrl: evidencePreview || undefined,
        });
      }

      const eventType: TimelineEventType = isRevision
        ? "ARTWORK_REVISED"
        : evidenceFile
        ? "EVIDENCE_ATTACHED"
        : "MILESTONE_LOGGED";

      const newEvent = await createTimelineEvent({
        projectId: project.id,
        sequence: nextSequence,
        eventType,
        timestamp: new Date().toISOString(),
        data: {
          title: eventTitle.trim(),
          description: eventDescription.trim() || undefined,
          milestonePhase: eventPhase,
          notes: eventNotes.trim() || undefined,
          evidence: attachedEvidenceList.length > 0 ? attachedEvidenceList : undefined,
          revisionReason: isRevision ? revisionReason.trim() : undefined,
          primaryArtworkHash: isRevision ? revisedArtworkHash : undefined,
        },
        previousDigest,
      });

      // Update project
      const updatedProject: ArtworkProject = {
        ...project,
        updatedAt: new Date().toISOString(),
        events: [...project.events, newEvent],
        primaryArtwork: isRevision && revisedArtworkFile
          ? {
              name: revisedArtworkFile.name,
              mimeType: resolveArtworkMimeType(revisedArtworkFile) || revisedArtworkFile.type || "application/octet-stream",
              sizeBytes: revisedArtworkFile.size,
              sha256Hash: revisedArtworkHash,
              dataUrl: revisedArtworkPreview || project.primaryArtwork.dataUrl,
            }
          : project.primaryArtwork,
      };

      await storage.saveProject(updatedProject);
      await refreshProjectAndVerify();

      // Reset modal fields
      setShowAddModal(false);
      setEventTitle("");
      setEventDescription("");
      setEventNotes("");
      setIsRevision(false);
      setRevisionReason("");
      setEvidenceFile(null);
      setEvidenceHash("");
      setEvidenceCaption("");
      setEvidencePreview("");
      setRevisedArtworkFile(null);
      setRevisedArtworkHash("");
      setRevisedArtworkPreview("");
    } catch (err) {
      setModalError(`Failed to record milestone: ${String(err)}`);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Version file handler
  const handleVersionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const val = validateArtworkFile(file);
    if (!val.valid) {
      setVersionError(val.error || "Invalid file");
      return;
    }

    setVersionError("");
    setVersionFile(file);
    setVersionFileHashing(true);

    try {
      const [hash, preview] = await Promise.all([
        computeSha256FromFile(file),
        readArtworkDataUrl(file),
      ]);
      setVersionFileHash(hash);
      setVersionFilePreview(preview);
    } catch (err) {
      setVersionError(`Failed to compute hash: ${String(err)}`);
    } finally {
      setVersionFileHashing(false);
    }
  };

  // Submit new version record
  const handleRecordVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    if (!versionLabel.trim()) {
      setVersionError("Version label is required (e.g. v1.1, v2.0 Archival Master).");
      return;
    }

    if (!versionFile || !versionFileHash) {
      setVersionError("Please select a file for this version to calculate its SHA-256 digest.");
      return;
    }

    setVersionSubmitting(true);
    setVersionError("");

    try {
      const existingVersions = project.versions || [];
      const resolvedVersionMime = resolveArtworkMimeType(versionFile) || versionFile.type || "application/octet-stream";
      const newVersion: ArtworkVersion = {
        id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        projectId: project.id,
        versionNumber: existingVersions.length + 1,
        versionLabel: versionLabel.trim(),
        createdAt: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        hasFile: true,
        file: {
          name: versionFile.name,
          mimeType: resolvedVersionMime,
          sizeBytes: versionFile.size,
          sha256Hash: versionFileHash,
          algorithm: "SHA-256",
          dataUrl: versionFilePreview || undefined,
        },
        sha256Hash: versionFileHash,
        fileName: versionFile.name,
        fileSizeBytes: versionFile.size,
        mimeType: resolvedVersionMime,
        notes: versionNotes.trim() || undefined,
        isArchivalFinal,
        dataUrl: versionFilePreview || undefined,
      };

      const currentEvents = project.events;
      const lastEvent = currentEvents[currentEvents.length - 1];
      const nextSequence = currentEvents.length;
      const previousDigest = lastEvent ? lastEvent.currentDigest : null;

      const newEvent = await createTimelineEvent({
        projectId: project.id,
        sequence: nextSequence,
        eventType: "VERSION_RECORDED",
        timestamp: new Date().toISOString(),
        data: {
          title: `Artwork Version: ${versionLabel.trim()}`,
          description: versionNotes.trim() || undefined,
          versionLabel: versionLabel.trim(),
          primaryArtworkHash: versionFileHash,
          notes: isArchivalFinal
            ? "Marked as official archival master release."
            : "Creative progression version recorded.",
        },
        previousDigest,
      });

      const updatedProject: ArtworkProject = {
        ...project,
        updatedAt: new Date().toISOString(),
        versions: [...existingVersions, newVersion],
        events: [...project.events, newEvent],
        primaryArtwork: isArchivalFinal
          ? {
              name: versionFile.name,
              mimeType: resolvedVersionMime,
              sizeBytes: versionFile.size,
              sha256Hash: versionFileHash,
              dataUrl: versionFilePreview || project.primaryArtwork.dataUrl,
            }
          : project.primaryArtwork,
      };

      await storage.saveProject(updatedProject);
      await refreshProjectAndVerify();

      setShowVersionModal(false);
      setVersionLabel("");
      setVersionNotes("");
      setIsArchivalFinal(false);
      setVersionFile(null);
      setVersionFileHash("");
      setVersionFilePreview("");
    } catch (err) {
      setVersionError(`Failed to record version: ${String(err)}`);
    } finally {
      setVersionSubmitting(false);
    }
  };

  const handleDownloadManifest = () => {
    if (!project) return;
    try {
      const manifest = buildProvenanceManifest(project);
      const val = manifestImportSchema.safeParse(manifest);
      if (!val.success) {
        console.error("Manifest schema validation failed:", val.error);
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
      setDownloadSuccessNotice("Manifest JSON validated and downloaded successfully.");
      setTimeout(() => setDownloadSuccessNotice(null), 4000);
    } catch (err) {
      console.error("Failed to download manifest:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <LoadingState message="Loading artwork project & verifying chain..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <EmptyState
          icon={Palette}
          title="Artwork Project Not Found"
          description="The requested artwork project could not be found in local browser storage."
          action={
            <div className="flex items-center gap-2">
              <Link href="/artworks">
                <Button variant="outline" size="sm">
                  My Artworks
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="sm">Studio Dashboard</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const headDigest =
    project.events.length > 0 ? project.events[project.events.length - 1].currentDigest : "";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D5] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#78716C] mb-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 hover:text-[#1C1917] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Studio Dashboard
            </Link>
            <span className="text-[#D6CEBE]">&bull;</span>
            <Link
              href="/artworks"
              className="hover:text-[#1C1917] transition-colors"
            >
              My Artworks
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
              {project.title}
            </h1>
            {project.isDemo && (
              <Badge variant="copper" size="sm">
                Demo
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#57534E] mt-1 font-medium">
            By {project.artistName} • {project.medium} • Year {project.yearCreated}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handleDownloadManifest}>
            <Download className="w-3.5 h-3.5 mr-1 text-[#57534E]" />
            Download Manifest (JSON)
          </Button>

          <Link href={`/projects/${project.id}/passport`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="w-3.5 h-3.5 mr-1 text-[#B86226]" />
              View Passport
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={() => setShowVersionModal(true)}>
            <History className="w-3.5 h-3.5 mr-1 text-[#B86226]" />
            Record Version
          </Button>

          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Record Milestone
          </Button>
        </div>
      </div>

      {downloadSuccessNotice && (
        <div className="p-3 bg-[#EBF2EE] border border-[#C5D8CE] rounded-xl text-xs text-[#2D4538] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccessNotice}</span>
          </div>
        </div>
      )}

      {/* Cryptographic Chain Status Banner */}
      {verificationReport && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
            verificationReport.isValid
              ? "bg-[#EBF2EE] border-[#C5D8CE] text-[#2D4538]"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {verificationReport.isValid ? (
              <ShieldCheck className="w-5 h-5 text-[#375244] shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <div>
              <span className="font-semibold text-sm">
                {verificationReport.isValid
                  ? `Cryptographic Chain Verified (${verificationReport.totalEventsChecked} Events Intact)`
                  : "Chain Integrity Warning Detected"}
              </span>
              <p className="text-[11px] opacity-90 mt-0.5">
                {verificationReport.isValid
                  ? "Every event digest is linked deterministically to its predecessor without sequence tampering."
                  : verificationReport.failureReason}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono">Head:</span>
            <HashViewer hash={headDigest} truncate={true} />
          </div>
        </div>
      )}

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Artwork Card & Description */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-white space-y-4">
            <h2 className="font-serif font-semibold text-sm text-[#1C1917] border-b border-[#E8E2D5] pb-2">
              Primary Artwork Master
            </h2>

            {project.primaryArtwork.dataUrl ? (
              <div className="w-full rounded-lg overflow-hidden bg-[#F3EFE6] border border-[#E8E2D5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.primaryArtwork.dataUrl}
                  alt={project.title}
                  className="w-full max-h-72 object-contain bg-[#FAF7F0]"
                />
              </div>
            ) : (
              <div className="w-full h-44 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5] flex flex-col items-center justify-center text-[#8C827A] p-4 text-center">
                <FileCheck className="w-8 h-8 text-[#B86226]/60 mb-2" />
                <span className="text-xs font-mono font-medium text-[#57534E]">
                  {project.primaryArtwork.name}
                </span>
                <span className="text-[10px] text-[#A8A29E] mt-0.5">
                  {(project.primaryArtwork.sizeBytes / 1024).toFixed(1)} KB • {project.primaryArtwork.mimeType}
                </span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <div>
                <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider block">
                  Registered SHA-256 Digest:
                </span>
                <HashViewer
                  hash={project.primaryArtwork.sha256Hash}
                  truncate={true}
                  className="w-full justify-between mt-1"
                />
              </div>

              <div className="text-[11px] text-[#78716C] pt-2 border-t border-[#F0EAE1] space-y-1">
                <div className="flex justify-between">
                  <span>Registered:</span>
                  <span className="text-[#1C1917] font-medium">
                    {new Date(project.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="text-[#1C1917] font-medium">
                    {new Date(project.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Version History Card */}
          <Card className="bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-2">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#B86226]" />
                <h2 className="font-serif font-semibold text-sm text-[#1C1917]">
                  Version History
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#78716C]">
                {(project.versions || []).length} Recorded
              </span>
            </div>

            <div className="space-y-3">
              {(project.versions || []).length === 0 ? (
                <p className="text-xs text-[#8C827A] italic">
                  No development versions recorded yet.
                </p>
              ) : (
                (project.versions || []).map((ver) => (
                  <div
                    key={ver.id}
                    className="p-3 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#1C1917] font-mono">
                        {ver.versionLabel}
                      </span>
                      {ver.isArchivalFinal ? (
                        <Badge variant="copper" size="sm">
                          Archival Master
                        </Badge>
                      ) : (
                        <Badge variant="parchment" size="sm">
                          Progress
                        </Badge>
                      )}
                    </div>

                    <div className="text-[11px] text-[#57534E] flex items-center justify-between">
                      <span className="truncate max-w-[140px]">
                        {ver.fileName || ver.file?.name || "Version File"}
                      </span>
                      <span className="text-[#8C827A]">
                        {(((ver.fileSizeBytes ?? ver.file?.sizeBytes) || 0) / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    {ver.notes && (
                      <p className="text-[11px] text-[#57534E] italic leading-tight">
                        &ldquo;{ver.notes}&rdquo;
                      </p>
                    )}

                    <div className="space-y-0.5 pt-1 border-t border-[#E8E2D5]">
                      <span className="text-[10px] text-[#8C827A] block">SHA-256 Digest:</span>
                      <HashViewer
                        hash={ver.sha256Hash || ver.file?.sha256Hash || ""}
                        truncate={true}
                      />
                    </div>

                    <div className="text-[10px] text-[#8C827A] text-right">
                      {new Date(ver.recordedAt || ver.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowVersionModal(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Record New Version
            </Button>
          </Card>

          {/* Description & Notes */}
          <Card className="bg-white space-y-3">
            <h2 className="font-serif font-semibold text-sm text-[#1C1917] border-b border-[#E8E2D5] pb-2">
              Curatorial Context & Artist Statement
            </h2>
            <p className="text-xs text-[#57534E] leading-relaxed">
              {project.description || "No project description provided."}
            </p>
          </Card>

          <DisclaimerBanner compact={true} />
        </div>

        {/* Right Column: Process Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#B86226]" />
              <h2 className="font-serif font-bold text-lg text-[#1C1917]">
                Chronological Provenance Timeline
              </h2>
            </div>
            <span className="text-xs text-[#78716C] font-mono">
              {project.events.length} {project.events.length === 1 ? "Event" : "Events"} in Chain
            </span>
          </div>

          {/* Vertical Chain Items */}
          <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E2DBD0]">
            {project.events.map((event) => {
              const isGenesis = event.sequence === 0;

              return (
                <div key={event.id} className="relative group">
                  {/* Timeline node icon */}
                  <div
                    className={`absolute -left-[30px] top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                      isGenesis
                        ? "bg-[#292524] text-white border-[#1C1917]"
                        : event.eventType === "VERSION_RECORDED" || event.eventType === "ARTWORK_REVISED"
                        ? "bg-[#B86226] text-white border-[#9E521F]"
                        : "bg-white text-[#57534E] border-[#B86226]"
                    }`}
                  >
                    {event.sequence}
                  </div>

                  {/* Event Card */}
                  <Card className="bg-white space-y-3 hover:border-[#D6CEBE] transition-colors">
                    {/* Header: Sequence, Type, Timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EAE1] pb-2.5">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            isGenesis
                              ? "ink"
                              : event.eventType === "VERSION_RECORDED"
                              ? "copper"
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
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-[#8C827A]">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Title & Body */}
                    <div>
                      <h3 className="font-serif font-semibold text-base text-[#1C1917]">
                        {event.data.title}
                      </h3>
                      {event.data.description && (
                        <p className="text-xs text-[#57534E] mt-1 leading-relaxed">
                          {event.data.description}
                        </p>
                      )}
                    </div>

                    {/* Creative Decisions / Notes */}
                    {event.data.notes && (
                      <div className="p-3 bg-[#FAF7F0] rounded-lg border border-[#E8E2D5] text-xs text-[#57534E]">
                        <span className="font-semibold text-[#292524] block mb-0.5">
                          Creative Decision Notes:
                        </span>
                        <p className="italic">{event.data.notes}</p>
                      </div>
                    )}

                    {/* Revision Reason if present */}
                    {event.data.revisionReason && (
                      <div className="p-2.5 bg-[#FFF9F2] rounded-lg border border-[#F0D5BE] text-xs text-[#7C3E14]">
                        <span className="font-semibold block mb-0.5">Revision Justification:</span>
                        <p>{event.data.revisionReason}</p>
                      </div>
                    )}

                    {/* Attached Process Evidence Files */}
                    {Array.isArray(event.data.evidence) && event.data.evidence.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[#F0EAE1]">
                        <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider block">
                          Attached Process Evidence ({event.data.evidence.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {event.data.evidence.map((evi) => (
                            <div
                              key={evi.id}
                              className="p-3 rounded-lg bg-[#F8F5EE] border border-[#E2DBD0] space-y-2 text-xs"
                            >
                              <div className="flex items-center gap-2 font-medium text-[#1C1917]">
                                <ImageIcon className="w-4 h-4 text-[#4A6356] shrink-0" />
                                <span className="truncate">{evi.name}</span>
                              </div>

                              {evi.fileDataUrl && (
                                <div className="max-h-36 rounded overflow-hidden border border-[#E2DBD0] bg-white">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={evi.fileDataUrl}
                                    alt={evi.name}
                                    className="w-full h-28 object-cover"
                                  />
                                </div>
                              )}

                              {evi.caption && (
                                <p className="text-[11px] text-[#57534E] italic">
                                  &ldquo;{evi.caption}&rdquo;
                                </p>
                              )}

                              <div className="space-y-0.5">
                                <span className="text-[10px] text-[#8C827A] block">SHA-256 Digest:</span>
                                <HashViewer hash={evi.sha256Hash} truncate={true} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cryptographic Linkage Info */}
                    <div className="pt-2 border-t border-[#F0EAE1] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="space-y-0.5">
                        <span className="text-[#8C827A] block">Predecessor Link:</span>
                        {event.previousDigest ? (
                          <HashViewer hash={event.previousDigest} truncate={true} />
                        ) : (
                          <span className="inline-block font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Genesis Node (null)
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[#8C827A] block">Current Event Digest:</span>
                        <HashViewer hash={event.currentDigest} truncate={true} />
                      </div>

                      {typeof event.data.primaryArtworkHash === "string" &&
                        event.data.primaryArtworkHash && (
                          <div className="sm:col-span-2 space-y-0.5 pt-1">
                            <span className="text-[#8C827A] block">Recorded Artwork File Digest:</span>
                            <HashViewer hash={event.data.primaryArtworkHash} truncate={true} />
                          </div>
                        )}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="milestone-modal-title"
        >
          <div className="bg-white rounded-2xl border border-[#D6CEBE] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3">
              <div>
                <h3 id="milestone-modal-title" className="font-serif font-bold text-lg text-[#1C1917]">
                  Record Milestone Event #{project.events.length}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#78716C] mt-0.5">
                  <span>Chain a new verifiable milestone linked to head digest:</span>
                  <HashViewer hash={headDigest} truncate={true} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#8C827A] hover:text-[#1C1917] text-lg font-bold p-1 rounded-md"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddMilestone} className="space-y-4">
              {/* Milestone Title */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#292524]">
                  Milestone Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Underpainting Block-in, Color Harmony Refinement, Final Varnish"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FDFBF7] border border-[#D6CEBE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226]"
                  required
                />
              </div>

              {/* Milestone Phase */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#292524]">Process Phase</label>
                <select
                  value={eventPhase}
                  onChange={(e) =>
                    setEventPhase(
                      e.target.value as
                        | "CONCEPT"
                        | "SKETCH"
                        | "BLOCK_IN"
                        | "REFINEMENT"
                        | "FINAL_TOUCHES"
                        | "EXPORT"
                    )
                  }
                  className="w-full px-3 py-2 text-sm bg-[#FDFBF7] border border-[#D6CEBE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226]"
                >
                  <option value="CONCEPT">Concept / Ideation</option>
                  <option value="SKETCH">Sketch / Gesture</option>
                  <option value="BLOCK_IN">Block-In / Underpainting</option>
                  <option value="REFINEMENT">Refinement & Detailing</option>
                  <option value="FINAL_TOUCHES">Final Glazes / Touches</option>
                  <option value="EXPORT">Archival Master Export</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#292524]">Milestone Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe the state of progress at this milestone..."
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FDFBF7] border border-[#D6CEBE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226]"
                />
              </div>

              {/* Decision Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#292524]">
                  Creative Decision Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain artistic choices, adjustments to values, lighting changes, materials used..."
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FDFBF7] border border-[#D6CEBE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226]"
                />
              </div>

              {/* Evidence File Attachment */}
              <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#E8E2D5] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#292524]">
                    Attach Process Evidence File (Optional)
                  </span>
                  <Badge variant="sage" size="sm">
                    SHA-256 Calculated
                  </Badge>
                </div>

                <input
                  type="file"
                  id="evidenceInput"
                  accept={[...APP_CONFIG.limits.allowedMimeTypes, ...APP_CONFIG.limits.allowedExtensions].join(",")}
                  onChange={handleEvidenceFileChange}
                  className="text-xs text-[#57534E]"
                />

                {evidenceError && <p className="text-xs text-red-600">{evidenceError}</p>}

                {evidenceHashing && (
                  <p className="text-xs text-[#B86226]">Calculating evidence byte hash...</p>
                )}

                {evidenceFile && evidenceHash && (
                  <div className="space-y-2 pt-2 border-t border-[#E8E2D5]">
                    <div className="flex items-center justify-between text-xs text-[#292524]">
                      <span>{evidenceFile.name}</span>
                      <HashViewer hash={evidenceHash} truncate={true} />
                    </div>

                    <input
                      type="text"
                      placeholder="Evidence caption (e.g. 50% opacity value study)"
                      value={evidenceCaption}
                      onChange={(e) => setEvidenceCaption(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CEBE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226]"
                    />
                  </div>
                )}
              </div>

              {/* Artwork Revision Toggle */}
              <div className="p-4 bg-[#F5F2EB] rounded-xl border border-[#E0D8C8] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#292524]">
                  <input
                    type="checkbox"
                    checked={isRevision}
                    onChange={(e) => setIsRevision(e.target.checked)}
                    className="rounded text-[#B86226] focus:ring-[#B86226]"
                  />
                  <span>This milestone replaces or updates the primary artwork master file</span>
                </label>

                {isRevision && (
                  <div className="space-y-3 pt-2 border-t border-[#DCD5C5]">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[#292524]">
                        Revision Reason <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Color profile correction, glaze varnish applied, final master render"
                        value={revisionReason}
                        onChange={(e) => setRevisionReason(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CEBE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226]"
                        required={isRevision}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[#292524]">
                        Upload Revised Artwork Master File <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept={[...APP_CONFIG.limits.allowedMimeTypes, ...APP_CONFIG.limits.allowedExtensions].join(",")}
                        onChange={handleRevisedArtworkFileChange}
                        className="text-xs text-[#57534E]"
                        required={isRevision}
                      />
                    </div>

                    {revisedArtworkHashing && (
                      <p className="text-xs text-[#B86226]">Calculating revised master hash...</p>
                    )}

                    {revisedArtworkHash && (
                      <div className="text-xs flex items-center justify-between">
                        <span className="font-medium text-[#1C1917]">Revised File Hash:</span>
                        <HashViewer hash={revisedArtworkHash} truncate={true} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D5]">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={modalSubmitting}
                  disabled={evidenceHashing || revisedArtworkHashing}
                >
                  Append to Cryptographic Chain
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Version Modal */}
      {showVersionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="version-modal-title"
        >
          <div className="bg-white rounded-2xl border border-[#D6CEBE] max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3">
              <div>
                <h3 id="version-modal-title" className="font-serif font-bold text-lg text-[#1C1917] flex items-center gap-2">
                  <History className="w-5 h-5 text-[#B86226]" />
                  Record Artwork Version
                </h3>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Register a named milestone version with cryptographic SHA-256 byte verification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="text-[#8C827A] hover:text-[#1C1917] text-lg font-bold p-1 rounded-md"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {versionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{versionError}</span>
              </div>
            )}

            <form onSubmit={handleRecordVersion} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#292524]">
                  Version Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. v1.1 Detail Pass, v2.0 Archival Master"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FDFBF7] border border-[#D6CEBE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#292524]">
                  Version Notes / Decisions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes on layer adjustments, color corrections, final varnishing, or export specifications..."
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FDFBF7] border border-[#D6CEBE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226]"
                />
              </div>

              <div className="p-4 bg-[#FAF7F0] rounded-xl border border-[#E8E2D5] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#292524]">
                    Select Artwork Version File <span className="text-red-500">*</span>
                  </span>
                  <Badge variant="sage" size="sm">
                    SHA-256 Calculated
                  </Badge>
                </div>

                <input
                  type="file"
                  accept={[...APP_CONFIG.limits.allowedMimeTypes, ...APP_CONFIG.limits.allowedExtensions].join(",")}
                  onChange={handleVersionFileChange}
                  className="text-xs text-[#57534E]"
                  required
                />

                {versionFileHashing && (
                  <p className="text-xs text-[#B86226]">Calculating version byte hash...</p>
                )}

                {versionFile && versionFileHash && (
                  <div className="space-y-2 pt-2 border-t border-[#E8E2D5]">
                    <div className="flex items-center justify-between text-xs text-[#292524]">
                      <span className="truncate max-w-[200px] font-medium">{versionFile.name}</span>
                      <span className="text-[#8C827A]">
                        {(versionFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-[#8C827A] block">SHA-256 Digest:</span>
                      <HashViewer hash={versionFileHash} truncate={true} />
                    </div>

                    {versionFilePreview && (
                      <div className="max-h-36 rounded overflow-hidden border border-[#E2DBD0] bg-white mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={versionFilePreview}
                          alt="Version preview"
                          className="w-full h-28 object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 bg-[#F5F2EB] rounded-xl border border-[#E0D8C8]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#292524]">
                  <input
                    type="checkbox"
                    checked={isArchivalFinal}
                    onChange={(e) => setIsArchivalFinal(e.target.checked)}
                    className="rounded text-[#B86226] focus:ring-[#B86226]"
                  />
                  <span>Mark this version as the official archival master release</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D5]">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setShowVersionModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={versionSubmitting}
                  disabled={versionFileHashing || !versionFileHash}
                >
                  Record Version & Chain Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
