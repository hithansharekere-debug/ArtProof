import { z } from "zod";
import { APP_CONFIG } from "@/config/app-config";

// Project creation / editing schema
export const projectInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(APP_CONFIG.limits.maxProjectTitleLength, `Title cannot exceed ${APP_CONFIG.limits.maxProjectTitleLength} characters`),
  artistName: z
    .string()
    .trim()
    .min(1, "Artist name or pseudonym is required")
    .max(80, "Artist name cannot exceed 80 characters"),
  medium: z
    .string()
    .trim()
    .min(1, "Medium is required")
    .max(80, "Medium cannot exceed 80 characters"),
  yearCreated: z
    .number()
    .int()
    .min(1900, "Year must be 1900 or later")
    .max(new Date().getFullYear() + 2, "Year cannot be in the far future"),
  description: z
    .string()
    .trim()
    .max(APP_CONFIG.limits.maxDescriptionLength, `Description cannot exceed ${APP_CONFIG.limits.maxDescriptionLength} characters`)
    .default(""),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes cannot exceed 2000 characters")
    .optional()
    .default(""),
});

// Milestone / Event addition schema
export const milestoneInputSchema = z.object({
  title: z.string().trim().min(1, "Milestone title is required").max(120),
  description: z.string().trim().max(1000).optional(),
  milestonePhase: z.enum([
    "CONCEPT",
    "SKETCH",
    "BLOCK_IN",
    "REFINEMENT",
    "FINAL_TOUCHES",
    "EXPORT",
  ]),
  notes: z.string().trim().max(2000).optional(),
  revisionReason: z.string().trim().max(500).optional(),
});

// File validation helper
export function validateArtworkFile(file: File): { valid: boolean; error?: string } {
  if (file.size > APP_CONFIG.limits.maxFileSizeBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${APP_CONFIG.limits.maxFileSizeDisplay}.`,
    };
  }

  // Type check
  const mime = file.type.toLowerCase();
  const allowed = APP_CONFIG.limits.allowedMimeTypes.map((m) => m.toLowerCase());
  if (!allowed.includes(mime)) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type || 'unknown'}". Supported types: PNG, JPEG, WebP, SVG, AVIF, PDF.`,
    };
  }

  return { valid: true };
}

// Provenance Manifest Schema for untrusted JSON imports
export const manifestImportSchema = z.object({
  manifestVersion: z.literal("1.0.0"),
  generatedAt: z.string(),
  canonicalSpec: z.string(),
  project: z.object({
    id: z.string(),
    title: z.string(),
    artistName: z.string(),
    medium: z.string(),
    yearCreated: z.number(),
    description: z.string().optional().default(""),
    createdAt: z.string(),
    primaryArtwork: z.object({
      name: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
      sha256Hash: z.string().regex(/^[a-fA-F0-9]{64}$/, "Invalid SHA-256 hash"),
    }),
  }),
  eventChain: z.array(
    z.object({
      schemaVersion: z.literal(1),
      id: z.string(),
      projectId: z.string(),
      sequence: z.number().int().min(0),
      eventType: z.enum([
        "PROJECT_CREATED",
        "MILESTONE_LOGGED",
        "EVIDENCE_ATTACHED",
        "ARTWORK_REVISED",
        "NOTE_RECORDED",
      ]),
      timestamp: z.string(),
      data: z.record(z.string(), z.unknown()),
      previousDigest: z.string().nullable(),
      currentDigest: z.string().regex(/^[a-fA-F0-9]{64}$/, "Invalid SHA-256 digest format"),
    })
  ),
  summary: z.object({
    totalEvents: z.number(),
    totalEvidenceFiles: z.number(),
    headDigest: z.string(),
  }),
  declarations: z.object({
    artistClaim: z.string(),
    integrityScope: z.string(),
    limitationsDisclaimer: z.string(),
  }),
});
