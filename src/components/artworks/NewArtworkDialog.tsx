"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { storage } from "@/lib/storage/storage-provider";
import { createTimelineEvent } from "@/lib/crypto/manifest";
import { ArtworkProject } from "@/types/provenance";

interface NewArtworkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (project: ArtworkProject) => void;
}

export function NewArtworkDialog({ isOpen, onClose, onCreated }: NewArtworkDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [medium, setMedium] = useState("");
  const [description, setDescription] = useState("");
  const [artistName, setArtistName] = useState("Studio Artist");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = "Artwork title is required.";
    }
    if (!medium.trim()) {
      newErrors.medium = "Artwork medium is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      // Genesis event
      const genesisEvent = await createTimelineEvent({
        projectId,
        sequence: 0,
        eventType: "PROJECT_CREATED",
        timestamp: now,
        data: {
          title: title.trim(),
          description: description.trim() || "Project registered in ArtProof studio ledger.",
          milestonePhase: "CONCEPT",
        },
        previousDigest: null,
      });

      const newProject: ArtworkProject = {
        id: projectId,
        title: title.trim(),
        artistName: artistName.trim() || "Studio Artist",
        medium: medium.trim(),
        yearCreated: new Date().getFullYear(),
        description: description.trim(),
        createdAt: now,
        updatedAt: now,
        primaryArtwork: {
          name: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-master.png`,
          mimeType: "image/png",
          sizeBytes: 1024,
          sha256Hash: genesisEvent.currentDigest,
        },
        events: [genesisEvent],
      };

      await storage.saveProject(newProject);

      // Reset
      setTitle("");
      setMedium("");
      setDescription("");
      onClose();

      if (onCreated) {
        onCreated(newProject);
      } else {
        router.push(`/projects/${projectId}`);
      }
    } catch (err) {
      setErrors({ form: `Failed to create artwork: ${String(err)}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Artwork"
      description="Create a project to begin recording chronological creative milestones and evidence."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {errors.form && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {errors.form}
          </div>
        )}

        <Input
          label="Artwork Title"
          placeholder="e.g. Amber Reverie, Horizon Study No. 2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          required
          autoFocus
        />

        <Input
          label="Medium & Technique"
          placeholder="e.g. Oil on Linen, Digital Charcoal & Pastel"
          value={medium}
          onChange={(e) => setMedium(e.target.value)}
          error={errors.medium}
          required
        />

        <Input
          label="Artist Name / Pseudonym"
          placeholder="e.g. Elena Rostova or Studio Name"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          hint="Will appear on the generated Provenance Passport."
        />

        <Textarea
          label="Conceptual Description (Optional)"
          placeholder="Brief notes on the concept, theme, or intended series..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D5]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            <Plus className="w-4 h-4 mr-1" />
            Create Project
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
