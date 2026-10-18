// Core domain types for ArtProof provenance, artwork projects, event chains, and verification.

export type TimelineEventType =
  | "PROJECT_CREATED"
  | "MILESTONE_LOGGED"
  | "EVIDENCE_ATTACHED"
  | "ARTWORK_REVISED"
  | "NOTE_RECORDED";

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

export interface TimelineEventData {
  title: string;
  description?: string;
  milestonePhase?: "CONCEPT" | "SKETCH" | "BLOCK_IN" | "REFINEMENT" | "FINAL_TOUCHES" | "EXPORT";
  evidence?: AttachedEvidence[];
  primaryArtworkHash?: string;
  notes?: string;
  revisionReason?: string;
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
  summary: {
    totalEvents: number;
    totalEvidenceFiles: number;
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
  | "INSUFFICIENT_DATA";

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
