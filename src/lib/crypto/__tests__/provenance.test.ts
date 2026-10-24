import { describe, it, expect } from "vitest";
import { canonicalStringify } from "../canonical";
import { computeSha256FromString, computeSha256FromBuffer } from "../sha256";
import {
  createTimelineEvent,
  buildProvenanceManifest,
  verifyProvenanceManifest,
} from "../manifest";
import { ArtworkProject, ProvenanceManifest } from "@/types/provenance";

describe("ArtProof Cryptographic Suite", () => {
  describe("Canonical JSON Serialization", () => {
    it("should deterministically sort object keys regardless of original insertion order", () => {
      const objA = { z: 1, a: 2, m: { nestedB: "val", nestedA: true } };
      const objB = { a: 2, m: { nestedA: true, nestedB: "val" }, z: 1 };

      const jsonA = canonicalStringify(objA);
      const jsonB = canonicalStringify(objB);

      expect(jsonA).toBe(jsonB);
      expect(jsonA).toBe('{"a":2,"m":{"nestedA":true,"nestedB":"val"},"z":1}');
    });

    it("should preserve array order and format null values properly", () => {
      const payload = { tags: ["sketch", "charcoal"], active: null };
      expect(canonicalStringify(payload)).toBe('{"active":null,"tags":["sketch","charcoal"]}');
    });
  });

  describe("NIST SHA-256 Known Test Vectors", () => {
    it("matches empty string vector", async () => {
      const hash = await computeSha256FromString("");
      expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    it("matches standard test vectors", async () => {
      const hashHello = await computeSha256FromString("hello");
      expect(hashHello).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");

      const hashFox = await computeSha256FromString("The quick brown fox jumps over the lazy dog");
      expect(hashFox).toBe("d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592");
    });

    it("computes identical hashes from buffer and string", async () => {
      const str = "ArtProof InnovArt 2027";
      const hashStr = await computeSha256FromString(str);
      const buffer = new TextEncoder().encode(str);
      const hashBuf = await computeSha256FromBuffer(buffer);
      expect(hashBuf).toBe(hashStr);
    });
  });

  describe("Provenance Chain Verification", () => {
    async function createTestProject(): Promise<ArtworkProject> {
      const projectId = "proj_test_01";
      const ev0 = await createTimelineEvent({
        id: "evt_0",
        projectId,
        sequence: 0,
        eventType: "PROJECT_CREATED",
        timestamp: "2026-10-01T10:00:00Z",
        data: { title: "Initial Concept", milestonePhase: "CONCEPT" },
        previousDigest: null,
      });

      const ev1 = await createTimelineEvent({
        id: "evt_1",
        projectId,
        sequence: 1,
        eventType: "MILESTONE_LOGGED",
        timestamp: "2026-10-02T10:00:00Z",
        data: { title: "Pencil Sketch", milestonePhase: "SKETCH" },
        previousDigest: ev0.currentDigest,
      });

      const ev2 = await createTimelineEvent({
        id: "evt_2",
        projectId,
        sequence: 2,
        eventType: "ARTWORK_REVISED",
        timestamp: "2026-10-03T10:00:00Z",
        data: { title: "Final Glazing", milestonePhase: "FINAL_TOUCHES" },
        previousDigest: ev1.currentDigest,
      });

      return {
        id: projectId,
        title: "Test Canvas",
        artistName: "Test Artist",
        medium: "Oil on Canvas",
        yearCreated: 2026,
        description: "Test description",
        createdAt: "2026-10-01T10:00:00Z",
        updatedAt: "2026-10-03T10:00:00Z",
        primaryArtwork: {
          name: "test_master.png",
          mimeType: "image/png",
          sizeBytes: 1024,
          sha256Hash: "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592", // Matches "The quick brown fox jumps over the lazy dog"
        },
        events: [ev0, ev1, ev2],
      };
    }

    it("verifies a legitimate unadulterated manifest and artwork buffer", async () => {
      const project = await createTestProject();
      const manifest = buildProvenanceManifest(project);

      const rawArtworkBytes = new TextEncoder().encode("The quick brown fox jumps over the lazy dog");
      const report = await verifyProvenanceManifest(manifest, rawArtworkBytes);

      expect(report.isValid).toBe(true);
      expect(report.chainValid).toBe(true);
      expect(report.artworkMatch).toBe(true);
      expect(report.status).toBe("PASSED");
      expect(report.totalEventsChecked).toBe(3);
    });

    it("detects tampered event content (e.g. title edited after hash recorded)", async () => {
      const project = await createTestProject();
      const manifest = buildProvenanceManifest(project);

      // Malicious modification of event 1 title
      manifest.eventChain[1].data.title = "Subtly Altered Title";

      const report = await verifyProvenanceManifest(manifest);
      expect(report.isValid).toBe(false);
      expect(report.chainValid).toBe(false);
      expect(report.status).toBe("FAILED_CHAIN_INTEGRITY");
      expect(report.failingEventIndex).toBe(1);
    });

    it("detects missing or reordered events", async () => {
      const project = await createTestProject();
      const manifest = buildProvenanceManifest(project);

      // Remove middle event
      manifest.eventChain.splice(1, 1);

      const report = await verifyProvenanceManifest(manifest);
      expect(report.isValid).toBe(false);
      expect(report.chainValid).toBe(false);
      expect(report.status).toBe("FAILED_CHAIN_INTEGRITY");
    });

    it("detects altered primary artwork bytes", async () => {
      const project = await createTestProject();
      const manifest = buildProvenanceManifest(project);

      const tamperedBytes = new TextEncoder().encode("Different modified artwork content");
      const report = await verifyProvenanceManifest(manifest, tamperedBytes);

      expect(report.isValid).toBe(false);
      expect(report.chainValid).toBe(true); // Chain is internally fine
      expect(report.artworkMatch).toBe(false); // But file doesn't match
      expect(report.status).toBe("FAILED_FILE_MISMATCH");
    });

    it("rejects unsupported format when manifest version is not 1.0.0", async () => {
      const unsupportedManifest = { manifestVersion: "2.0.0" } as unknown as ProvenanceManifest;
      const report = await verifyProvenanceManifest(unsupportedManifest);

      expect(report.isValid).toBe(false);
      expect(report.status).toBe("UNSUPPORTED_FORMAT");
      expect(report.messages[0]).toContain('Unsupported manifest version "2.0.0"');
    });

    it("rejects malformed manifest objects missing project or event chain", async () => {
      const malformedManifest = { manifestVersion: "1.0.0" } as unknown as ProvenanceManifest;
      const report = await verifyProvenanceManifest(malformedManifest);

      expect(report.isValid).toBe(false);
      expect(report.status).toBe("MALFORMED_MANIFEST");
    });

    it("reports insufficient data when event chain contains zero events", async () => {
      const emptyChainManifest = {
        manifestVersion: "1.0.0",
        generatedAt: "2026-10-01T00:00:00Z",
        canonicalSpec: "ARTPROOF-SHA256-CHAIN-V1",
        project: {
          id: "proj_empty",
          title: "Empty Project",
          artistName: "Artist",
          medium: "Digital",
          yearCreated: 2026,
          createdAt: "2026-10-01T00:00:00Z",
          primaryArtwork: {
            name: "art.png",
            mimeType: "image/png",
            sizeBytes: 100,
            sha256Hash: "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
          },
        },
        eventChain: [],
      } as unknown as ProvenanceManifest;

      const report = await verifyProvenanceManifest(emptyChainManifest);
      expect(report.isValid).toBe(false);
      expect(report.status).toBe("INSUFFICIENT_DATA");
    });

    it("prevents spoofed or self-reported status bypass attempt", async () => {
      const project = await createTestProject();
      const manifest = buildProvenanceManifest(project);

      // Maliciously modify event title, but inject fake status claiming it's valid
      manifest.eventChain[0].data.title = "Attacker Altered Title";
      (manifest as unknown as Record<string, unknown>).status = "PASSED";
      (manifest as unknown as Record<string, unknown>).isValid = true;

      // The independent verifier ignores self-reported tags and recalculates all hashes
      const report = await verifyProvenanceManifest(manifest);
      expect(report.isValid).toBe(false);
      expect(report.status).toBe("FAILED_CHAIN_INTEGRITY");
    });

    it("verifies manifest containing recorded versions and VERSION_RECORDED events", async () => {
      const project = await createTestProject();
      const lastEvent = project.events[project.events.length - 1];

      const versionEvent = await createTimelineEvent({
        projectId: project.id,
        sequence: project.events.length,
        eventType: "VERSION_RECORDED",
        timestamp: "2026-10-04T12:00:00Z",
        data: {
          title: "Version Recorded: v2.0 Archival Master",
          versionLabel: "v2.0 Archival Master",
          primaryArtworkHash: "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
        },
        previousDigest: lastEvent.currentDigest,
      });

      project.events.push(versionEvent);
      project.versions = [
        {
          id: "ver_1",
          projectId: project.id,
          versionNumber: 1,
          versionLabel: "v1.0 Genesis",
          createdAt: "2026-10-01T10:00:00Z",
          recordedAt: "2026-10-01T10:00:00Z",
          sha256Hash: "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
          fileName: "test_master.png",
          fileSizeBytes: 1024,
          mimeType: "image/png",
          hasFile: true,
          isArchivalFinal: false,
        },
        {
          id: "ver_2",
          projectId: project.id,
          versionNumber: 2,
          versionLabel: "v2.0 Archival Master",
          createdAt: "2026-10-04T12:00:00Z",
          recordedAt: "2026-10-04T12:00:00Z",
          sha256Hash: "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
          fileName: "archival_master.png",
          fileSizeBytes: 2048,
          mimeType: "image/png",
          hasFile: true,
          isArchivalFinal: true,
        },
      ];

      const manifest = buildProvenanceManifest(project);
      expect(manifest.versions).toBeDefined();
      expect(manifest.versions?.length).toBe(2);
      expect(manifest.summary.totalVersions).toBe(2);

      const report = await verifyProvenanceManifest(manifest);
      expect(report.isValid).toBe(true);
      expect(report.status).toBe("PASSED");
      expect(report.totalEventsChecked).toBe(4);
    });

    it("gracefully catches malformed manifest missing primaryArtwork without throwing", async () => {
      const malformed = {
        manifestVersion: "1.0.0",
        generatedAt: "2026-10-01T00:00:00Z",
        canonicalSpec: "ARTPROOF-SHA256-CHAIN-V1",
        project: {
          id: "proj_no_art",
          title: "Corrupt Artwork",
          artistName: "Unknown",
          medium: "Digital",
          yearCreated: 2026,
          createdAt: "2026-10-01T00:00:00Z",
          // missing primaryArtwork
        },
        eventChain: [
          {
            schemaVersion: 1,
            id: "e1",
            projectId: "proj_no_art",
            sequence: 0,
            eventType: "PROJECT_CREATED",
            timestamp: "2026-10-01T00:00:00Z",
            data: { title: "Genesis" },
            previousDigest: null,
            currentDigest: "0000000000000000000000000000000000000000000000000000000000000000",
          },
        ],
      } as unknown as ProvenanceManifest;

      const report = await verifyProvenanceManifest(malformed);
      expect(report.isValid).toBe(false);
      expect(report.status).toBe("MALFORMED_MANIFEST");
    });

    it("gracefully catches manifest with malformed non-object event record in chain", async () => {
      const project = await createTestProject();
      const manifest = buildProvenanceManifest(project);

      // Inject corrupt non-object item into event chain
      (manifest.eventChain as unknown as unknown[])[1] = "corrupted_non_object_entry";

      const report = await verifyProvenanceManifest(manifest);
      expect(report.isValid).toBe(false);
      expect(report.status).toBe("MALFORMED_MANIFEST");
      expect(report.failureReason).toContain("Malformed event record at index 1");
    });

    it("rejects chain where genesis event does not have sequence 0 or null previousDigest", async () => {
      const project = await createTestProject();
      const manifest = buildProvenanceManifest(project);

      // Tamper genesis previousDigest
      manifest.eventChain[0].previousDigest = "a".repeat(64);

      const report = await verifyProvenanceManifest(manifest);
      expect(report.isValid).toBe(false);
      expect(report.status).toBe("FAILED_CHAIN_INTEGRITY");
      expect(report.failureReason).toContain("Genesis event (sequence 0) must have a null previousDigest");
    });
  });
});
