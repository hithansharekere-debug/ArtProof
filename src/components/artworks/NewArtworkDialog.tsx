"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { storage } from "@/lib/storage/storage-provider";
import { createTimelineEvent } from "@/lib/crypto/manifest";
import { computeSha256FromFile } from "@/lib/crypto/sha256";
import { projectInputSchema, validateArtworkFile, sanitizeFilename } from "@/lib/validation/schemas";
import { ArtworkProject } from "@/types/provenance";

interface NewArtworkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (project: ArtworkProject) => void;
}

export function NewArtworkDialog({ isOpen, onClose, onCreated }: NewArtworkDialogProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("Studio Artist");
  const [medium, setMedium] = useState("");
  const [yearCreated, setYearCreated] = useState<number>(new Date().getFullYear());
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Optional file attachment
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const resetForm = () => {
    setTitle("");
    setArtistName("Studio Artist");
    setMedium("");
    setYearCreated(new Date().getFullYear());
    setDescription("");
    setNotes("");
    setSelectedFile(null);
    setFilePreview("");
    setErrors({});
    setIsSubmitting(false);
    setIsSuccess(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateArtworkFile(file);
    if (!validation.valid) {
      setErrors((prev) => ({ ...prev, file: validation.error || "Invalid file" }));
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isSuccess) return;

    // Validate using Zod schema
    const inputData = {
      title,
      artistName,
      medium,
      yearCreated: Number(yearCreated),
      description,
      notes,
    };

    const parseResult = projectInputSchema.safeParse(inputData);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const fieldName = String(issue.path[0] || "form");
        fieldErrors[fieldName] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Generate stable unique project ID
      const projectId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? `proj_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`
          : `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const now = new Date().toISOString();

      let masterFileHash = "";
      let masterFileName = `${sanitizeFilename(parseResult.data.title, "artwork")}-master.png`;
      let masterMimeType = "image/png";
      let masterSizeBytes = 1024;
      const masterDataUrl = filePreview || undefined;

      if (selectedFile) {
        masterFileName = sanitizeFilename(selectedFile.name, "master.png");
        masterMimeType = selectedFile.type || "application/octet-stream";
        masterSizeBytes = selectedFile.size;
        masterFileHash = await computeSha256FromFile(selectedFile);
      }

      // Genesis event (Sequence #0)
      const genesisEvent = await createTimelineEvent({
        projectId,
        sequence: 0,
        eventType: "PROJECT_CREATED",
        timestamp: now,
        data: {
          title: parseResult.data.title,
          description:
            parseResult.data.description ||
            "Artwork project registered in ArtProof studio ledger.",
          milestonePhase: "CONCEPT",
          notes: parseResult.data.notes || undefined,
          primaryArtworkHash: masterFileHash || undefined,
        },
        previousDigest: null,
      });

      // If no file was attached, anchor to genesis digest
      if (!masterFileHash) {
        masterFileHash = genesisEvent.currentDigest;
      }

      const newProject: ArtworkProject = {
        id: projectId,
        title: parseResult.data.title,
        artistName: parseResult.data.artistName,
        medium: parseResult.data.medium,
        yearCreated: parseResult.data.yearCreated,
        description: parseResult.data.description,
        createdAt: now,
        updatedAt: now,
        primaryArtwork: {
          name: masterFileName,
          mimeType: masterMimeType,
          sizeBytes: masterSizeBytes,
          sha256Hash: masterFileHash,
          dataUrl: masterDataUrl,
        },
        events: [genesisEvent],
        isDemo: false,
      };

      await storage.saveProject(newProject);
      setIsSuccess(true);

      // Invoke optional callback and navigate to new artwork page
      setTimeout(() => {
        onCreated?.(newProject);
        router.push(`/projects/${projectId}`);
        resetForm();
        onClose();
      }, 500);
    } catch (err) {
      setErrors({ form: `Failed to create artwork: ${String(err)}` });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Register New Artwork"
      description="Create a project to record chronological creative milestones and cryptographic SHA-256 evidence."
      maxWidth="lg"
    >
      {isSuccess ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#1C1917]">
            Artwork Registered Successfully
          </h3>
          <p className="text-xs text-[#78716C] max-w-sm mx-auto">
            Genesis milestone node anchored into your local ledger. Navigating to artwork details...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Artwork Title"
                placeholder="e.g. Solitude in Amber, Horizon Study No. 2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <Input
              label="Artist Name / Pseudonym"
              placeholder="e.g. Elena Rostova or Studio Pseudonym"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              error={errors.artistName}
              required
              disabled={isSubmitting}
            />

            <Input
              label="Medium & Technique"
              placeholder="e.g. Oil on Linen, Digital Charcoal"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              error={errors.medium}
              required
              disabled={isSubmitting}
            />

            <div className="sm:col-span-2">
              <Input
                label="Creation Year"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 2}
                value={yearCreated}
                onChange={(e) => setYearCreated(Number(e.target.value))}
                error={errors.yearCreated}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="sm:col-span-2">
              <Textarea
                label="Conceptual Description (Optional)"
                placeholder="Brief notes on the theme, conceptual origin, or intended series..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={errors.description}
                rows={2}
                disabled={isSubmitting}
              />
            </div>

            <div className="sm:col-span-2">
              <Textarea
                label="Genesis Milestone Notes (Optional)"
                placeholder="Initial canvas notes, preliminary ideas, or palette decisions for Sequence #0..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                error={errors.notes}
                rows={2}
                disabled={isSubmitting}
              />
            </div>

            {/* Optional Master Image Upload */}
            <div className="sm:col-span-2 p-3.5 bg-[#FAF7F0] border border-[#E8E2D5] rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#292524] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#B86226]" />
                  Initial Master Artwork Image (Optional)
                </span>
                <span className="text-[11px] text-[#8C827A]">Local-only SHA-256</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="dialogArtworkFile"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif,application/pdf"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="text-xs text-[#57534E] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EFE9DF] file:text-[#1C1917] hover:file:bg-[#E5DDCF] cursor-pointer"
                />
              </div>

              {selectedFile && (
                <p className="text-[11px] text-[#4A6356] font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#4A6356]" />
                  Ready: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}

              {errors.file && <p className="text-[11px] text-red-600 font-medium">{errors.file}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D5]">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
              <Plus className="w-4 h-4 mr-1" />
              Register Artwork
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
