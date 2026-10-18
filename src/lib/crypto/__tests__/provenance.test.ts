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

    it("rejects malformed manifest objects", async () => {
      const brokenManifest = { manifestVersion: "2.0.0" } as unknown as ProvenanceManifest;
      const report = await verifyProvenanceManifest(brokenManifest);

      expect(report.isValid).toBe(false);
      expect(report.status).toBe("MALFORMED_MANIFEST");
    });
  });
});
