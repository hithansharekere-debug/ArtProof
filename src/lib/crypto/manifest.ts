import {
  ArtworkProject,
  AttachedEvidence,
  ProvenanceManifest,
  TimelineEvent,
  TimelineEventType,
  VerificationReport,
  VerificationStatus,
} from "@/types/provenance";
import { canonicalStringify } from "./canonical";
import {
  computeSha256FromBuffer,
  computeSha256FromFile,
  computeSha256FromString,
} from "./sha256";
import { APP_CONFIG } from "@/config/app-config";

/**
 * Extracts canonical preimage fields covered by an event's cryptographic digest.
 * Strictly excludes mutable UI flags and caches to ensure cross-platform determinism.
 */
export function getEventDigestPreimage(event: {
  schemaVersion: 1;
  id: string;
  projectId: string;
  sequence: number;
  eventType: TimelineEventType;
  timestamp: string;
  data: unknown;
  previousDigest: string | null;
}) {
  return {
    schemaVersion: event.schemaVersion,
    id: event.id,
    projectId: event.projectId,
    sequence: event.sequence,
    eventType: event.eventType,
    timestamp: event.timestamp,
    data: event.data,
    previousDigest: event.previousDigest,
  };
}

/**
 * Computes the SHA-256 digest of an event's canonical JSON serialization.
 */
export async function calculateEventDigest(event: {
  schemaVersion: 1;
  id: string;
  projectId: string;
  sequence: number;
  eventType: TimelineEventType;
  timestamp: string;
  data: unknown;
  previousDigest: string | null;
}): Promise<string> {
  const preimage = getEventDigestPreimage(event);
  const canonicalJson = canonicalStringify(preimage);
  return computeSha256FromString(canonicalJson);
}

/**
 * Constructs a new verifiable timeline event linked to the predecessor's digest.
 */
export async function createTimelineEvent(params: {
  id?: string;
  projectId: string;
  sequence: number;
  eventType: TimelineEventType;
  timestamp?: string;
  data: {
    title: string;
    description?: string;
    milestonePhase?: "CONCEPT" | "SKETCH" | "BLOCK_IN" | "REFINEMENT" | "FINAL_TOUCHES" | "EXPORT";
    evidence?: AttachedEvidence[];
    primaryArtworkHash?: string;
    notes?: string;
    revisionReason?: string;
    [key: string]: unknown;
  };
  previousDigest: string | null;
}): Promise<TimelineEvent> {
  const id = params.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const timestamp = params.timestamp || new Date().toISOString();

  // Clean evidence objects so raw local dataUrl strings are not committed into immutable event digests
  const sanitizedData = { ...params.data };
  if (Array.isArray(sanitizedData.evidence)) {
    sanitizedData.evidence = sanitizedData.evidence.map((ev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { fileDataUrl, ...rest } = ev;
      return rest as AttachedEvidence;
    });
  }

  const baseEvent = {
    schemaVersion: 1 as const,
    id,
    projectId: params.projectId,
    sequence: params.sequence,
    eventType: params.eventType,
    timestamp,
    data: sanitizedData,
    previousDigest: params.previousDigest,
  };

  const currentDigest = await calculateEventDigest(baseEvent);

  return {
    ...baseEvent,
    currentDigest,
  };
}

/**
 * Builds a portable ProvenanceManifest from a project.
 * Never leaks original heavy artwork image binaries or private paths.
 */
export function buildProvenanceManifest(project: ArtworkProject): ProvenanceManifest {
  const sanitizedEvents: TimelineEvent[] = project.events.map((ev) => {
    const cleanData = { ...ev.data };
    if (Array.isArray(cleanData.evidence)) {
      cleanData.evidence = cleanData.evidence.map((item) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fileDataUrl, ...rest } = item;
        return rest as AttachedEvidence;
      });
    }
    return {
      schemaVersion: ev.schemaVersion,
      id: ev.id,
      projectId: ev.projectId,
      sequence: ev.sequence,
      eventType: ev.eventType,
      timestamp: ev.timestamp,
      data: cleanData,
      previousDigest: ev.previousDigest,
      currentDigest: ev.currentDigest,
    };
  });

  const headDigest =
    sanitizedEvents.length > 0
      ? sanitizedEvents[sanitizedEvents.length - 1].currentDigest
      : "0000000000000000000000000000000000000000000000000000000000000000";

  let totalEvidenceFiles = 0;
  sanitizedEvents.forEach((e) => {
    if (Array.isArray(e.data.evidence)) {
      totalEvidenceFiles += e.data.evidence.length;
    }
  });

  return {
    manifestVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    canonicalSpec: "ARTPROOF-SHA256-CHAIN-V1",
    project: {
      id: project.id,
      title: project.title,
      artistName: project.artistName,
      medium: project.medium,
      yearCreated: project.yearCreated,
      description: project.description,
      createdAt: project.createdAt,
      primaryArtwork: {
        name: project.primaryArtwork.name,
        mimeType: project.primaryArtwork.mimeType,
        sizeBytes: project.primaryArtwork.sizeBytes,
        sha256Hash: project.primaryArtwork.sha256Hash,
      },
    },
    eventChain: sanitizedEvents,
    versions: (project.versions || []).map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      versionLabel: v.versionLabel,
      createdAt: v.createdAt,
      notes: v.notes,
      hasFile: v.hasFile,
      sha256Hash: v.file?.sha256Hash || v.sha256Hash,
      fileName: v.file?.name || v.fileName,
      fileSizeBytes: v.file?.sizeBytes || v.fileSizeBytes,
      isArchivalFinal: v.isArchivalFinal,
    })),
    summary: {
      totalEvents: sanitizedEvents.length,
      totalEvidenceFiles,
      totalVersions: (project.versions || []).length,
      headDigest,
    },
    declarations: {
      artistClaim: `The artist "${project.artistName}" recorded these creative milestones for the work titled "${project.title}".`,
      integrityScope:
        "Every event includes a canonical SHA-256 digest linked to its predecessor. File digests are calculated directly from original raw byte buffers.",
      limitationsDisclaimer: APP_CONFIG.disclaimer.corePhilosophy,
    },
  };
}

/**
 * Validates a manifest's cryptographic event chain and optionally compares against inspected artwork bytes.
 */
export async function verifyProvenanceManifest(
  manifest: ProvenanceManifest,
  artworkBytesOrFile?: ArrayBuffer | Uint8Array | File
): Promise<VerificationReport> {
  const checkedAt = new Date().toISOString();
  const messages: string[] = [];

  // 1. Structure and version checks
  if (!manifest || typeof manifest !== "object") {
    return {
      status: "MALFORMED_MANIFEST",
      isValid: false,
      chainValid: false,
      artworkMatch: null,
      headDigest: "",
      totalEventsChecked: 0,
      checkedAt,
      messages: ["Manifest is null or not a valid JSON object."],
    };
  }

  if (manifest.manifestVersion && manifest.manifestVersion !== "1.0.0") {
    return {
      status: "UNSUPPORTED_FORMAT",
      isValid: false,
      chainValid: false,
      artworkMatch: null,
      headDigest: "",
      totalEventsChecked: 0,
      checkedAt,
      messages: [
        `Unsupported manifest version "${String(manifest.manifestVersion)}". Supported version is "1.0.0".`,
      ],
    };
  }

  if (
    manifest.manifestVersion !== "1.0.0" ||
    !manifest.project ||
    typeof manifest.project !== "object" ||
    !manifest.project.primaryArtwork ||
    typeof manifest.project.primaryArtwork !== "object" ||
    typeof manifest.project.primaryArtwork.sha256Hash !== "string" ||
    !Array.isArray(manifest.eventChain)
  ) {
    return {
      status: "MALFORMED_MANIFEST",
      isValid: false,
      chainValid: false,
      artworkMatch: null,
      headDigest: "",
      totalEventsChecked: 0,
      checkedAt,
      messages: ["Manifest is missing required header fields, project object, or valid primary artwork record."],
    };
  }

  const events = manifest.eventChain;
  if (events.length === 0) {
    return {
      status: "INSUFFICIENT_DATA",
      isValid: false,
      chainValid: false,
      artworkMatch: null,
      headDigest: "",
      totalEventsChecked: 0,
      checkedAt,
      messages: ["Manifest contains zero recorded events in the chain."],
    };
  }

  // 2. Event chain verification
  for (let i = 0; i < events.length; i++) {
    const current = events[i];

    // Event object structure check
    if (
      !current ||
      typeof current !== "object" ||
      typeof current.sequence !== "number" ||
      typeof current.currentDigest !== "string"
    ) {
      return {
        status: "MALFORMED_MANIFEST",
        isValid: false,
        chainValid: false,
        artworkMatch: null,
        headDigest: manifest.summary?.headDigest || "",
        totalEventsChecked: i,
        failingEventIndex: i,
        failureReason: `Malformed event record at index ${i}.`,
        checkedAt,
        messages: [`Chain corrupted: event at index ${i} is missing required fields or is malformed.`],
      };
    }

    // Sequence continuity check
    if (current.sequence !== i) {
      return {
        status: "FAILED_CHAIN_INTEGRITY",
        isValid: false,
        chainValid: false,
        artworkMatch: null,
        headDigest: manifest.summary?.headDigest || "",
        totalEventsChecked: i,
        failingEventIndex: i,
        failureReason: `Sequence break at event index ${i}: expected sequence ${i}, found ${current.sequence}.`,
        checkedAt,
        messages: [`Chain corrupted: event order or sequence numbering is discontinuous at index ${i}.`],
      };
    }

    // Predecessor digest linking check
    if (i === 0) {
      if (current.previousDigest !== null) {
        return {
          status: "FAILED_CHAIN_INTEGRITY",
          isValid: false,
          chainValid: false,
          artworkMatch: null,
          headDigest: manifest.summary?.headDigest || "",
          totalEventsChecked: 0,
          failingEventIndex: 0,
          failureReason: "Genesis event (sequence 0) must have a null previousDigest.",
          checkedAt,
          messages: ["Genesis event integrity check failed."],
        };
      }
    } else {
      const predecessor = events[i - 1];
      if (current.previousDigest !== predecessor.currentDigest) {
        return {
          status: "FAILED_CHAIN_INTEGRITY",
          isValid: false,
          chainValid: false,
          artworkMatch: null,
          headDigest: manifest.summary?.headDigest || "",
          totalEventsChecked: i,
          failingEventIndex: i,
          failureReason: `Digest link break at event index ${i}: previousDigest does not match event ${i - 1}'s currentDigest.`,
          checkedAt,
          messages: [`Event link broken between sequence ${i - 1} and ${i}.`],
        };
      }
    }

    // Recompute current event digest from preimage
    const calculatedDigest = await calculateEventDigest(current);
    if (calculatedDigest !== current.currentDigest) {
      const eventTitle =
        current.data && typeof current.data === "object" && "title" in current.data
          ? String((current.data as Record<string, unknown>).title)
          : current.eventType;
      return {
        status: "FAILED_CHAIN_INTEGRITY",
        isValid: false,
        chainValid: false,
        artworkMatch: null,
        headDigest: manifest.summary?.headDigest || "",
        totalEventsChecked: i,
        failingEventIndex: i,
        failureReason: `Digest mismatch at event sequence ${i}: recorded ${current.currentDigest}, recomputed ${calculatedDigest}. Event content has been modified.`,
        checkedAt,
        messages: [`Data modification detected in event ${i} ("${eventTitle}").`],
      };
    }
  }

  // Head digest consistency
  const lastEvent = events[events.length - 1];
  if (manifest.summary?.headDigest && manifest.summary.headDigest !== lastEvent.currentDigest) {
    return {
      status: "FAILED_CHAIN_INTEGRITY",
      isValid: false,
      chainValid: false,
      artworkMatch: null,
      headDigest: lastEvent.currentDigest,
      totalEventsChecked: events.length,
      failureReason: "Summary headDigest does not match the final event's computed digest.",
      checkedAt,
      messages: ["Manifest summary header mismatch with verified chain tail."],
    };
  }

  messages.push(`All ${events.length} chronological events verified with cryptographic hash chain integrity.`);

  // 3. Artwork Byte Verification (if file is supplied by viewer)
  let artworkMatch: boolean | null = null;
  let testedArtworkHash: string | undefined;
  const expectedArtworkHash = manifest.project.primaryArtwork.sha256Hash;

  if (artworkBytesOrFile) {
    const computedHash =
      artworkBytesOrFile instanceof File
        ? await computeSha256FromFile(artworkBytesOrFile)
        : await computeSha256FromBuffer(artworkBytesOrFile);

    testedArtworkHash = computedHash;
    artworkMatch = computedHash.toLowerCase() === expectedArtworkHash.toLowerCase();

    if (!artworkMatch) {
      return {
        status: "FAILED_FILE_MISMATCH",
        isValid: false,
        chainValid: true,
        artworkMatch: false,
        testedArtworkHash: computedHash,
        expectedArtworkHash,
        headDigest: lastEvent.currentDigest,
        totalEventsChecked: events.length,
        checkedAt,
        messages: [
          ...messages,
          `Artwork file mismatch: Provided file SHA-256 (${computedHash.substring(0, 12)}...) differs from recorded manifest hash (${expectedArtworkHash.substring(0, 12)}...).`,
        ],
      };
    } else {
      messages.push(`Primary artwork file verified: Byte SHA-256 matches recorded manifest.`);
    }
  } else {
    messages.push("Artwork file was not provided for direct byte comparison (Chain verified independently).");
  }

  const status: VerificationStatus = "PASSED";

  return {
    status,
    isValid: true,
    chainValid: true,
    artworkMatch,
    testedArtworkHash,
    expectedArtworkHash,
    headDigest: lastEvent.currentDigest,
    totalEventsChecked: events.length,
    checkedAt,
    messages,
  };
}
