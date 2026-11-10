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
  versionLabel: z.string().trim().max(40).optional(),
});

// Version recording schema
export const versionInputSchema = z.object({
  versionLabel: z
    .string()
    .trim()
    .min(1, "Version label is required")
    .max(40, "Version label cannot exceed 40 characters"),
  notes: z
    .string()
    .trim()
    .max(2000, "Version notes cannot exceed 2000 characters")
    .optional()
    .default(""),
  milestonePhase: z
    .enum([
      "CONCEPT",
      "SKETCH",
      "BLOCK_IN",
      "REFINEMENT",
      "FINAL_TOUCHES",
      "EXPORT",
    ])
    .default("REFINEMENT"),
  hasFile: z.boolean().default(false),
  fileHash: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, "File digest must be a valid 64-character SHA-256 hex string")
    .optional(),
});

const MIME_ALIASES: Record<string, string> = {
  "image/png": "image/png",
  "image/x-png": "image/png",
  "image/x-citrix-png": "image/png",
  "image/apng": "image/png",
  "application/png": "image/png",
  "application/x-png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-citrix-jpeg": "image/jpeg",
  "image/jfif": "image/jpeg",
  "application/jpg": "image/jpeg",
  "application/x-jpg": "image/jpeg",
  "image/webp": "image/webp",
  "image/svg+xml": "image/svg+xml",
  "image/svg": "image/svg+xml",
  "image/avif": "image/avif",
  "application/pdf": "application/pdf",
};

const EXTENSION_MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jpe": "image/jpeg",
  ".jfif": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
};

const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".vbs",
  ".msi",
  ".com",
  ".scr",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".html",
  ".htm",
  ".php",
  ".py",
  ".rb",
  ".jar",
]);

/**
 * Resolves the canonical artwork MIME type from a File's reported MIME type and filename extension.
 * Handles common browser/OS MIME aliases (e.g. image/jpg, image/pjpeg, image/x-png) and falls back
 * to extension inspection when the browser reports an empty type or application/octet-stream.
 */
export function resolveArtworkMimeType(file: Pick<File, "name" | "type">): string | null {
  const fileName = typeof file.name === "string" ? file.name.trim().toLowerCase() : "";
  const dotIndex = fileName.lastIndexOf(".");
  const ext = dotIndex !== -1 ? fileName.slice(dotIndex) : "";

  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    return null;
  }

  const rawMime =
    typeof file.type === "string" ? file.type.trim().toLowerCase().split(";")[0].trim() : "";
  const allowedMimes = new Set(APP_CONFIG.limits.allowedMimeTypes.map((m) => m.toLowerCase()));

  if (rawMime && rawMime !== "application/octet-stream") {
    const normalized = MIME_ALIASES[rawMime] || rawMime;
    if (allowedMimes.has(normalized)) {
      return normalized;
    }
    return null;
  }

  if (ext) {
    const mappedMime = EXTENSION_MIME_MAP[ext];
    if (mappedMime && allowedMimes.has(mappedMime)) {
      return mappedMime;
    }
  }

  return null;
}

/**
 * Reads an image artwork File into a canonical base64 data URL for local preview and storage.
 * Ensures the resulting data URL uses a normalized image MIME prefix even if the browser omitted file.type.
 */
export async function readArtworkDataUrl(file: File): Promise<string> {
  const resolvedMime = resolveArtworkMimeType(file) || file.type || "";
  if (!resolvedMime.startsWith("image/")) {
    return "";
  }

  if (typeof FileReader !== "undefined") {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(typeof reader.result === "string" ? reader.result : "");
        };
        reader.onerror = () => resolve("");
        const targetBlob =
          file.type === resolvedMime ? file : new Blob([file], { type: resolvedMime });
        reader.readAsDataURL(targetBlob);
      } catch {
        resolve("");
      }
    });
  }

  if (typeof file.arrayBuffer === "function") {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 =
        typeof btoa === "function"
          ? btoa(binary)
          : Buffer.from(buffer).toString("base64");
      return `data:${resolvedMime};base64,${base64}`;
    } catch {
      return "";
    }
  }

  return "";
}

// File validation helper
export function validateArtworkFile(file: File): {
  valid: boolean;
  error?: string;
  mimeType?: string;
} {
  if (file.size > APP_CONFIG.limits.maxFileSizeBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${APP_CONFIG.limits.maxFileSizeDisplay}.`,
    };
  }

  const resolvedMime = resolveArtworkMimeType(file);
  if (!resolvedMime) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type || file.name || "unknown"}". Supported types: PNG, JPEG, WebP, SVG, AVIF, PDF.`,
    };
  }

  return { valid: true, mimeType: resolvedMime };
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
        "VERSION_RECORDED",
      ]),
      timestamp: z.string(),
      data: z.record(z.string(), z.unknown()),
      previousDigest: z.string().nullable(),
      currentDigest: z.string().regex(/^[a-fA-F0-9]{64}$/, "Invalid SHA-256 digest format"),
    })
  ),
  versions: z
    .array(
      z.object({
        id: z.string(),
        versionNumber: z.number().int().min(1),
        versionLabel: z.string(),
        createdAt: z.string(),
        notes: z.string().optional(),
        hasFile: z.boolean(),
        sha256Hash: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
      })
    )
    .optional(),
  summary: z.object({
    totalEvents: z.number(),
    totalEvidenceFiles: z.number(),
    totalVersions: z.number().optional(),
    headDigest: z.string(),
  }),
  declarations: z.object({
    artistClaim: z.string(),
    integrityScope: z.string(),
    limitationsDisclaimer: z.string(),
  }),
});

/**
 * Strips path traversal characters, invalid OS characters, and control codes from filenames.
 * Enforces a maximum safe length and falls back to a safe default if input is empty or invalid.
 */
export function sanitizeFilename(name: string, fallback = "artwork"): string {
  if (!name || typeof name !== "string") {
    return fallback;
  }

  // Strip path traversal sequences like ../ and ..\
  let cleaned = name
    .replace(/\.{2,}[/\\]+/g, "") // strip leading or embedded ../ or ..\
    .replace(/[/\\]+/g, "-") // convert remaining directory separators to dash
    .replace(/[<>:"|?*\x00-\x1f\x7f-\x9f]/g, "") // strip invalid file and control chars
    .replace(/\.{2,}/g, ".") // collapse consecutive dots
    .replace(/\s+/g, "-") // convert spaces to dash
    .replace(/[-_]{2,}/g, "-") // collapse repeated dashes
    .trim()
    .replace(/^[.\s\-_]+|[.\s\-_]+$/g, ""); // strip leading/trailing dots, dashes, underscores

  // Enforce max length of 64 characters
  if (cleaned.length > 64) {
    const extMatch = cleaned.match(/\.([a-zA-Z0-9]{1,8})$/);
    if (extMatch) {
      const ext = extMatch[0];
      cleaned = cleaned.substring(0, 64 - ext.length) + ext;
    } else {
      cleaned = cleaned.substring(0, 64);
    }
  }

  // If sanitized result is empty or just dashes/dots
  if (!cleaned || /^[.\-_]+$/.test(cleaned)) {
    return fallback;
  }

  return cleaned;
}

/**
 * Validates that a string is a strictly local, safe image or document data URL.
 * Rejects remote schemes (http/https), executable protocols (javascript/vbscript),
 * and malformed payloads.
 */
export function isSafeDataUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url.startsWith("data:")) {
    return false;
  }

  // Strictly allow only verified image types and pdf
  const safePrefixRegex =
    /^data:(image\/(png|x-png|apng|jpeg|jpg|pjpeg|jfif|webp|svg\+xml|avif)|application\/pdf)(;[a-zA-Z0-9\-_=.]+)*;base64,[A-Za-z0-9+/=\s]+$/;
  return safePrefixRegex.test(url);
}

/**
 * Sanitizes an untrusted data URL, returning undefined if invalid or remote.
 */
export function sanitizeDataUrl(url: unknown): string | undefined {
  return isSafeDataUrl(url) ? url : undefined;
}
