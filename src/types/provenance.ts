// Core domain types for ArtProof provenance, artwork projects, event chains, versions, and verification.

export type TimelineEventType =
  | "PROJECT_CREATED"
  | "MILESTONE_LOGGED"
  | "EVIDENCE_ATTACHED"
  | "ARTWORK_REVISED"
  | "NOTE_RECORDED"
  | "VERSION_RECORDED";

export interface AttachedEvidence {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
  caption?: string;
  recordedAt: string; // ISO 8601 UTC
  fileDataUrl?: string; // Stored locally in IndexedDB / local-first, omitted in minimal manifests
}

export interface ArtworkVersion {
  id: string; // Stable unique version ID (e.g. "ver_...")
  projectId: string; // Parent artwork ID
  versionNumber: number; // 1, 2, 3...
  versionLabel: string; // e.g. "v1.0 Genesis", "v1.1 Sketch Pass", "v2.0 Archival Master"
  createdAt: string; // ISO 8601 UTC
  notes?: string; // Optional change notes or creative justification
  hasFile: boolean; // True when user supplied a file, false when conceptual/structural
  file?: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    sha256Hash: string; // Hex SHA-256 byte digest
    algorithm: "SHA-256";
    dataUrl?: string; // Local storage preview
  };
  associatedEventId?: string; // Links to the sequence TimelineEvent in the provenance chain
  // Convenience fields for flat usage, display, and export
  sha256Hash?: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  isArchivalFinal?: boolean;
  recordedAt?: string;
  dataUrl?: string;
}

export interface TimelineEventData {
  title: string;
  description?: string;
  milestonePhase?: "CONCEPT" | "SKETCH" | "BLOCK_IN" | "REFINEMENT" | "FINAL_TOUCHES" | "EXPORT";
  evidence?: AttachedEvidence[];
  primaryArtworkHash?: string;
  notes?: string;
  revisionReason?: string;
  versionId?: string;
  versionLabel?: string;
  versionNumber?: number;
  [key: string]: unknown;
}

export interface TimelineEvent {
  schemaVersion: 1;
  id: string;
  projectId: string;
  sequence: number; // strictly 0, 1, 2, ...
  eventType: TimelineEventType;
  timestamp: string; // ISO 8601 UTC
  data: TimelineEventData;
  previousDigest: string | null; // Hex SHA-256 of predecessor event; null for sequence 0
  currentDigest: string; // Hex SHA-256 of canonical serialization of this event's canonical fields
}

export interface ArtworkProject {
  id: string;
  title: string;
  artistName: string; // Artist-declared public name or pseudonym
  medium: string; // e.g. "Oil on Canvas", "Digital Illustration", "Charcoal & Pastel"
  yearCreated: number;
  description: string;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  primaryArtwork: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    sha256Hash: string;
    dataUrl?: string; // Local storage preview
  };
  events: TimelineEvent[];
  versions?: ArtworkVersion[];
  isDemo?: boolean;
}

export interface ProvenanceManifest {
  manifestVersion: "1.0.0";
  generatedAt: string; // ISO 8601 UTC
  canonicalSpec: "ARTPROOF-SHA256-CHAIN-V1";
  project: {
    id: string;
    title: string;
    artistName: string;
    medium: string;
    yearCreated: number;
    description: string;
    createdAt: string;
    primaryArtwork: {
      name: string;
      mimeType: string;
      sizeBytes: number;
      sha256Hash: string;
    };
  };
  eventChain: TimelineEvent[];
  versions?: {
    id: string;
    versionNumber: number;
    versionLabel: string;
    createdAt: string;
    notes?: string;
    hasFile: boolean;
    sha256Hash?: string;
    fileName?: string;
    fileSizeBytes?: number;
    isArchivalFinal?: boolean;
  }[];
  summary: {
    totalEvents: number;
    totalEvidenceFiles: number;
    totalVersions?: number;
    headDigest: string;
  };
  declarations: {
    artistClaim: string;
    integrityScope: string;
    limitationsDisclaimer: string;
  };
}

export type VerificationStatus =
  | "PASSED"
  | "FAILED_CHAIN_INTEGRITY"
  | "FAILED_FILE_MISMATCH"
  | "MALFORMED_MANIFEST"
  | "INSUFFICIENT_DATA"
  | "UNSUPPORTED_FORMAT";

export interface VerificationReport {
  status: VerificationStatus;
  isValid: boolean;
  chainValid: boolean;
  artworkMatch: boolean | null; // null if no artwork file provided to verify
  testedArtworkHash?: string;
  expectedArtworkHash?: string;
  headDigest: string;
  totalEventsChecked: number;
  failingEventIndex?: number;
  failureReason?: string;
  checkedAt: string;
  messages: string[];
}
