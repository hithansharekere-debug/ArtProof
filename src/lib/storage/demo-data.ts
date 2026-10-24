import { ArtworkProject } from "@/types/provenance";
import { createTimelineEvent } from "../crypto/manifest";

/**
 * High-quality, realistic demo artwork project for InnovArt 2027 hackathon demonstration.
 * Pre-computes valid cryptographic event chain hashes so that verification passes cleanly out of the box.
 */
export async function generateDemoProject(): Promise<ArtworkProject> {
  const projectId = "art_demo_solitude_amber";
  const now = new Date("2026-09-15T14:30:00Z");

  // Genesis event: Project registered
  const event0 = await createTimelineEvent({
    id: "evt_demo_0_genesis",
    projectId,
    sequence: 0,
    eventType: "PROJECT_CREATED",
    timestamp: "2026-09-15T14:30:00.000Z",
    data: {
      title: "Solitude in Amber (Study No. 4)",
      description: "Project registered for mixed digital and physical egg tempera study.",
      milestonePhase: "CONCEPT",
      primaryArtworkHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      notes: "Exploring atmospheric depth through historical glazing techniques combined with contemporary digital value staging.",
    },
    previousDigest: null,
  });

  // Event 1: Value Study & Composition Sketch
  const event1 = await createTimelineEvent({
    id: "evt_demo_1_sketch",
    projectId,
    sequence: 1,
    eventType: "MILESTONE_LOGGED",
    timestamp: "2026-09-18T10:15:00.000Z",
    data: {
      title: "Compositional Value Hierarchy & Wireframe",
      milestonePhase: "SKETCH",
      description: "Established 3-tier value grouping and perspective anchor points.",
      notes: "Decided to lower focal horizon by 15% to increase psychological weight of negative sky.",
      evidence: [
        {
          id: "evi_sketch_01",
          name: "sketch_value_pass_v1.png",
          mimeType: "image/png",
          sizeBytes: 1245000,
          sha256Hash: "8f434346648f6b96df89dda901c5176b10e6d83961dd3c1ac88b59b2dc327aa4",
          caption: "Preliminary 3-value charcoal gesture pass",
          recordedAt: "2026-09-18T10:15:00.000Z",
        },
      ],
    },
    previousDigest: event0.currentDigest,
  });

  // Event 2: Underpainting / Imprimatura
  const event2 = await createTimelineEvent({
    id: "evt_demo_2_underpainting",
    projectId,
    sequence: 2,
    eventType: "MILESTONE_LOGGED",
    timestamp: "2026-09-24T16:40:00.000Z",
    data: {
      title: "Verdaccio Underpainting & Raw Umber Glaze",
      milestonePhase: "BLOCK_IN",
      description: "Monochrome tempera block-in with raw umber ground wash.",
      notes: "Preserving cool undertones to bounce off subsequent warm amber glaze.",
      evidence: [
        {
          id: "evi_underpaint_01",
          name: "verdaccio_blockin_scan.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 2840000,
          sha256Hash: "3b9a7c81d2e5b4a0f6718429e7135012a9cbf41983e9f521b667823e59a721df",
          caption: "Underpainting pass before warm glazes",
          recordedAt: "2026-09-24T16:40:00.000Z",
        },
      ],
    },
    previousDigest: event1.currentDigest,
  });

  // Event 3: Final Glaze and Varnish Export
  const event3 = await createTimelineEvent({
    id: "evt_demo_3_final",
    projectId,
    sequence: 3,
    eventType: "ARTWORK_REVISED",
    timestamp: "2026-10-02T18:00:00.000Z",
    data: {
      title: "Final Glazing, Spectral Calibration & Archive Master",
      milestonePhase: "FINAL_TOUCHES",
      description: "Dammar varnish layer applied; final 300 DPI museum archival scan captured.",
      primaryArtworkHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      notes: "Master file finalized. Preserved color gamut in Adobe RGB 1998.",
      revisionReason: "Final archival export of physical/digital work.",
    },
    previousDigest: event2.currentDigest,
  });

  return {
    id: projectId,
    title: "Solitude in Amber (Study No. 4)",
    artistName: "Elena Rostova",
    medium: "Tempera & Digital Glazes on Linen Panel",
    yearCreated: 2026,
    description:
      "A contemplative study examining silence and warmth across mixed analog and digital workflows. Recorded milestone events document underpainting, color staging, and archival scan preservation.",
    createdAt: now.toISOString(),
    updatedAt: "2026-10-02T18:00:00.000Z",
    primaryArtwork: {
      name: "solitude_in_amber_master.png",
      mimeType: "image/png",
      sizeBytes: 4892010,
      sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
    events: [event0, event1, event2, event3],
    versions: [
      {
        id: "ver_demo_1",
        projectId,
        versionNumber: 1,
        versionLabel: "v1.0 Compositional Gesture",
        createdAt: "2026-09-18T10:15:00.000Z",
        notes: "Preliminary gesture and 3-value wireframe staging.",
        hasFile: true,
        file: {
          name: "sketch_value_pass_v1.png",
          mimeType: "image/png",
          sizeBytes: 1245000,
          sha256Hash: "8f434346648f6b96df89dda901c5176b10e6d83961dd3c1ac88b59b2dc327aa4",
          algorithm: "SHA-256",
        },
        associatedEventId: "evt_demo_1_sketch",
      },
      {
        id: "ver_demo_2",
        projectId,
        versionNumber: 2,
        versionLabel: "v2.0 Archival Master",
        createdAt: "2026-10-02T18:00:00.000Z",
        notes: "Dammar varnish layer applied; final 300 DPI museum archival scan captured.",
        hasFile: true,
        file: {
          name: "solitude_in_amber_master.png",
          mimeType: "image/png",
          sizeBytes: 4892010,
          sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          algorithm: "SHA-256",
        },
        associatedEventId: "evt_demo_3_final",
      },
    ],
    isDemo: true,
  };
}
