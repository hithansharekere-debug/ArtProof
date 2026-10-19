"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  ArrowLeft,
  FileCheck,
  AlertCircle,
  Shield,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HashViewer } from "@/components/ui/HashViewer";
import { DisclaimerBanner } from "@/components/ui/DisclaimerBanner";
import { APP_CONFIG } from "@/config/app-config";
import { projectInputSchema, validateArtworkFile } from "@/lib/validation/schemas";
import { computeSha256FromFile } from "@/lib/crypto/sha256";
import { createTimelineEvent } from "@/lib/crypto/manifest";
import { storage } from "@/lib/storage/storage-provider";
import { ArtworkProject } from "@/types/provenance";

export default function NewProjectPage() {
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [medium, setMedium] = useState("");
  const [yearCreated, setYearCreated] = useState<number>(new Date().getFullYear());
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>("");
  const [filePreview, setFilePreview] = useState<string>("");
  const [hashingFile, setHashingFile] = useState<boolean>(false);

  // Status & error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file properties
    const fileValidation = validateArtworkFile(file);
    if (!fileValidation.valid) {
      setErrors((prev) => ({ ...prev, file: fileValidation.error || "Invalid file" }));
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });

    setSelectedFile(file);
    setHashingFile(true);

    try {
      // Calculate SHA-256 digest from actual raw bytes
      const hash = await computeSha256FromFile(file);
      setFileHash(hash);

      // Create preview if it is an image
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview("");
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, file: `Failed to calculate hash: ${String(err)}` }));
    } finally {
      setHashingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const inputData = {
      title,
      artistName,
      medium,
      yearCreated: Number(yearCreated),
      description,
    };

    const result = projectInputSchema.safeParse(inputData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = String(issue.path[0] || "form");
        fieldErrors[fieldName] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!selectedFile || !fileHash) {
      setErrors((prev) => ({ ...prev, file: "Primary artwork file is required to calculate genesis hash." }));
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const projectId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? `proj_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`
          : `proj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();

      // Create genesis event: PROJECT_CREATED
      const genesisEvent = await createTimelineEvent({
        projectId,
        sequence: 0,
        eventType: "PROJECT_CREATED",
        timestamp: now,
        data: {
          title: result.data.title,
          description: result.data.description || "Artwork project registered in ArtProof ledger.",
          milestonePhase: "CONCEPT",
          primaryArtworkHash: fileHash,
          notes: notes.trim() || undefined,
        },
        previousDigest: null,
      });

      const newProject: ArtworkProject = {
        id: projectId,
        title: result.data.title,
        artistName: result.data.artistName,
        medium: result.data.medium,
        yearCreated: result.data.yearCreated,
        description: result.data.description,
        createdAt: now,
        updatedAt: now,
        primaryArtwork: {
          name: selectedFile.name,
          mimeType: selectedFile.type || "application/octet-stream",
          sizeBytes: selectedFile.size,
          sha256Hash: fileHash,
          dataUrl: filePreview || undefined,
        },
        events: [genesisEvent],
        isDemo: false,
      };

      await storage.saveProject(newProject);
      setIsSuccess(true);
      setTimeout(() => {
        router.push(`/projects/${projectId}`);
      }, 500);
    } catch (err) {
      setErrors({ form: `Failed to create project: ${String(err)}` });
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Back button and Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-[#78716C] hover:text-[#1C1917] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Studio Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="copper" size="sm">
            Milestone Genesis
          </Badge>
          <span className="text-xs text-[#8C827A]">Sequence #0</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] mt-1">
          Register Artwork Project
        </h1>
        <p className="text-sm text-[#78716C] mt-1">
          Record your artwork&apos;s initial state and anchor its cryptographic SHA-256 byte digest into a local-first chain.
        </p>
      </div>

      <DisclaimerBanner compact={true} />

      {isSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Artwork ledger successfully registered with genesis digest! Navigating to artwork studio...</span>
        </div>
      )}

      {errors.form && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Artwork Metadata */}
        <Card className="space-y-5 bg-white">
          <div className="border-b border-[#E8E2D5] pb-3">
            <h2 className="font-serif font-semibold text-base text-[#1C1917]">
              Artwork Information
            </h2>
            <p className="text-xs text-[#78716C]">
              Artist-declared metadata for identification and provenance passports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="title" className="block text-xs font-semibold text-[#292524]">
                Artwork Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                disabled={submitting || isSuccess}
                placeholder="e.g. Solitude in Amber, Horizon Study No. 3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3.5 py-2 text-sm bg-[#FDFBF7] border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226] disabled:opacity-60 disabled:cursor-not-allowed ${
                  errors.title ? "border-red-500" : "border-[#D6CEBE]"
                }`}
              />
              {errors.title && <p className="text-[11px] text-red-600">{errors.title}</p>}
            </div>

            {/* Artist Name */}
            <div className="space-y-1.5">
              <label htmlFor="artistName" className="block text-xs font-semibold text-[#292524]">
                Artist Name or Pseudonym <span className="text-red-500">*</span>
              </label>
              <input
                id="artistName"
                type="text"
                disabled={submitting || isSuccess}
                placeholder="e.g. Elena Rostova or Studio Pseudonym"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className={`w-full px-3.5 py-2 text-sm bg-[#FDFBF7] border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226] disabled:opacity-60 disabled:cursor-not-allowed ${
                  errors.artistName ? "border-red-500" : "border-[#D6CEBE]"
                }`}
              />
              {errors.artistName && <p className="text-[11px] text-red-600">{errors.artistName}</p>}
            </div>

            {/* Medium */}
            <div className="space-y-1.5">
              <label htmlFor="medium" className="block text-xs font-semibold text-[#292524]">
                Medium / Technique <span className="text-red-500">*</span>
              </label>
              <input
                id="medium"
                type="text"
                disabled={submitting || isSuccess}
                placeholder="e.g. Oil on Linen, Digital Charcoal & Tempera"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                className={`w-full px-3.5 py-2 text-sm bg-[#FDFBF7] border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226] disabled:opacity-60 disabled:cursor-not-allowed ${
                  errors.medium ? "border-red-500" : "border-[#D6CEBE]"
                }`}
              />
              {errors.medium && <p className="text-[11px] text-red-600">{errors.medium}</p>}
            </div>

            {/* Year */}
            <div className="space-y-1.5">
              <label htmlFor="yearCreated" className="block text-xs font-semibold text-[#292524]">
                Creation Year <span className="text-red-500">*</span>
              </label>
              <input
                id="yearCreated"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 2}
                disabled={submitting || isSuccess}
                value={yearCreated}
                onChange={(e) => setYearCreated(Number(e.target.value))}
                className={`w-full px-3.5 py-2 text-sm bg-[#FDFBF7] border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226] disabled:opacity-60 disabled:cursor-not-allowed ${
                  errors.yearCreated ? "border-red-500" : "border-[#D6CEBE]"
                }`}
              />
              {errors.yearCreated && <p className="text-[11px] text-red-600">{errors.yearCreated}</p>}
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="description" className="block text-xs font-semibold text-[#292524]">
                Project Concept & Context
              </label>
              <textarea
                id="description"
                rows={3}
                disabled={submitting || isSuccess}
                placeholder="Describe the conceptual background, themes, or intended scope of this body of work..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[#FDFBF7] border border-[#D6CEBE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </Card>

        {/* Section 2: File Upload & Cryptographic Hashing */}
        <Card className="space-y-5 bg-white">
          <div className="border-b border-[#E8E2D5] pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif font-semibold text-base text-[#1C1917]">
                  Primary Artwork Master File
                </h2>
                <p className="text-xs text-[#78716C]">
                  Direct client-side SHA-256 byte digest calculated via Web Crypto API.
                </p>
              </div>
              <Badge variant="sage" size="sm">
                Local-Only Hashing
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                selectedFile ? "border-[#B86226]/50 bg-[#FDFBF7]" : "border-[#D6CEBE] hover:border-[#B86226]/40 bg-[#FAF7F0]/40"
              }`}
            >
              <input
                id="artworkFileInput"
                type="file"
                accept={APP_CONFIG.limits.allowedExtensions.join(",")}
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="artworkFileInput"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <div className="w-12 h-12 rounded-full bg-[#F5EFE6] text-[#B86226] flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-[#1C1917]">
                    {selectedFile ? "Change artwork file" : "Upload artwork file to digest"}
                  </span>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Supported: PNG, JPEG, WebP, SVG, AVIF, PDF (Max {APP_CONFIG.limits.maxFileSizeDisplay})
                  </p>
                </div>
              </label>
            </div>

            {errors.file && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.file}</span>
              </div>
            )}

            {/* Digest Result Box */}
            {hashingFile && (
              <div className="p-4 bg-[#F5F2EB] rounded-lg border border-[#E0D8C8] flex items-center gap-3 text-xs text-[#57534E]">
                <div className="w-4 h-4 border-2 border-[#B86226] border-t-transparent animate-spin rounded-full" />
                <span>Reading raw bytes and computing SHA-256 hash...</span>
              </div>
            )}

            {selectedFile && !hashingFile && fileHash && (
              <div className="p-4 bg-[#F8F5EE] border border-[#E2DBD0] rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-medium text-[#1C1917]">
                    <FileCheck className="w-4 h-4 text-[#375244]" />
                    <span>{selectedFile.name}</span>
                    <span className="text-[#8C827A]">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Badge variant="sage" size="sm">
                    SHA-256 Digested
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider block">
                    Calculated File Digest:
                  </span>
                  <HashViewer hash={fileHash} truncate={false} className="w-full justify-between" />
                </div>

                {filePreview && (
                  <div className="mt-3 pt-3 border-t border-[#E8E2D5]">
                    <span className="text-[11px] text-[#78716C] block mb-2 font-medium">Local Canvas Preview:</span>
                    <div className="max-h-48 max-w-xs rounded-lg overflow-hidden border border-[#E8E2D5]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={filePreview} alt="Artwork preview" className="object-cover max-h-48 w-auto" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Section 3: Genesis Event Milestone Notes */}
        <Card className="space-y-4 bg-white">
          <div className="border-b border-[#E8E2D5] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#B86226]" />
              <h2 className="font-serif font-semibold text-base text-[#1C1917]">
                Genesis Milestone Notes (Optional)
              </h2>
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">
              These initial notes become part of the immutable sequence #0 milestone event data.
            </p>
          </div>

          <div className="space-y-1.5">
            <textarea
              rows={2}
              disabled={submitting || isSuccess}
              placeholder="e.g. Initial canvas dimensions, underlying color palette intentions, reference sketches used..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-[#FDFBF7] border border-[#D6CEBE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226] disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Link href="/dashboard">
            <Button variant="ghost" type="button" disabled={submitting || isSuccess}>
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            size="lg"
            isLoading={submitting}
            disabled={!selectedFile || !fileHash || hashingFile || submitting || isSuccess}
          >
            <Shield className="w-4 h-4 mr-1.5" />
            Initialize Artwork Ledger
          </Button>
        </div>
      </form>
    </div>
  );
}
