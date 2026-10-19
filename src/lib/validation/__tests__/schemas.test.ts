import { describe, it, expect } from "vitest";
import {
  projectInputSchema,
  milestoneInputSchema,
  validateArtworkFile,
  manifestImportSchema,
} from "../schemas";

describe("Validation Schemas Suite", () => {
  describe("Project Input Validation", () => {
    it("accepts valid project details", () => {
      const valid = {
        title: "Solitude in Amber",
        artistName: "Elena Rostova",
        medium: "Tempera on Linen",
        yearCreated: 2026,
        description: "Study in tempera glazing",
      };
      const result = projectInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects empty title or artist name", () => {
      const invalid = {
        title: "   ",
        artistName: "",
        medium: "Oil",
        yearCreated: 2026,
        description: "",
      };
      const result = projectInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("title"))).toBe(true);
        expect(result.error.issues.some((i) => i.path.includes("artistName"))).toBe(true);
      }
    });

    it("rejects invalid years", () => {
      const oldYear = {
        title: "Ancient Canvas",
        artistName: "Unknown",
        medium: "Fresco",
        yearCreated: 1850,
      };
      const res = projectInputSchema.safeParse(oldYear);
      expect(res.success).toBe(false);
    });

    it("accepts valid project details with optional notes", () => {
      const validWithNotes = {
        title: "Horizon Nocturne",
        artistName: "Marcus Vance",
        medium: "Oil on Belgian Linen",
        yearCreated: 2026,
        description: "Twilight study",
        notes: "Detailed underpainting with raw umber and mineral spirits",
      };
      const res = projectInputSchema.safeParse(validWithNotes);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.notes).toBe("Detailed underpainting with raw umber and mineral spirits");
      }
    });

    it("rejects missing medium or excessive notes length", () => {
      const missingMedium = {
        title: "Study",
        artistName: "Artist",
        medium: "   ",
        yearCreated: 2026,
      };
      expect(projectInputSchema.safeParse(missingMedium).success).toBe(false);

      const excessiveNotes = {
        title: "Study",
        artistName: "Artist",
        medium: "Oil",
        yearCreated: 2026,
        notes: "a".repeat(2001),
      };
      expect(projectInputSchema.safeParse(excessiveNotes).success).toBe(false);
    });
  });

  describe("Milestone Input Validation", () => {
    it("accepts valid milestone inputs", () => {
      const valid = {
        title: "Underpainting Ground Pass",
        milestonePhase: "BLOCK_IN",
        description: "Initial raw umber wash",
        notes: "Kept thin to dry quickly",
      };
      const res = milestoneInputSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("rejects empty milestone titles", () => {
      const invalid = {
        title: "   ",
        milestonePhase: "SKETCH",
      };
      const res = milestoneInputSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe("File Validation", () => {
    it("accepts valid image file under limit", () => {
      const mockFile = new File(["dummy artwork bytes"], "master.png", {
        type: "image/png",
      });
      const check = validateArtworkFile(mockFile);
      expect(check.valid).toBe(true);
    });

    it("rejects file exceeding size limit", () => {
      // Mock file larger than 20MB limit
      const oversizedFile = {
        name: "huge_scan.tiff",
        size: 25 * 1024 * 1024,
        type: "image/png",
      } as unknown as File;

      const check = validateArtworkFile(oversizedFile);
      expect(check.valid).toBe(false);
      expect(check.error).toContain("exceeds maximum allowed limit");
    });

    it("rejects unsupported MIME types", () => {
      const executableFile = new File(["echo 1"], "script.exe", {
        type: "application/x-msdownload",
      });
      const check = validateArtworkFile(executableFile);
      expect(check.valid).toBe(false);
      expect(check.error).toContain("Unsupported file type");
    });
  });

  describe("Manifest Import Schema", () => {
    it("validates well-formed manifest structure", () => {
      const sampleManifest = {
        manifestVersion: "1.0.0",
        generatedAt: "2026-10-12T10:00:00Z",
        canonicalSpec: "ARTPROOF-SHA256-CHAIN-V1",
        project: {
          id: "p1",
          title: "Test Work",
          artistName: "Test Artist",
          medium: "Digital",
          yearCreated: 2026,
          description: "Sample",
          createdAt: "2026-10-12T10:00:00Z",
          primaryArtwork: {
            name: "art.png",
            mimeType: "image/png",
            sizeBytes: 1024,
            sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          },
        },
        eventChain: [
          {
            schemaVersion: 1,
            id: "ev1",
            projectId: "p1",
            sequence: 0,
            eventType: "PROJECT_CREATED",
            timestamp: "2026-10-12T10:00:00Z",
            data: { title: "Genesis" },
            previousDigest: null,
            currentDigest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          },
        ],
        summary: {
          totalEvents: 1,
          totalEvidenceFiles: 0,
          headDigest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
        declarations: {
          artistClaim: "Artist claim",
          integrityScope: "Integrity scope",
          limitationsDisclaimer: "Limitations disclaimer",
        },
      };

      const res = manifestImportSchema.safeParse(sampleManifest);
      expect(res.success).toBe(true);
    });

    it("rejects invalid hash formats in manifest", () => {
      const invalidHashManifest = {
        manifestVersion: "1.0.0",
        generatedAt: "2026-10-12T10:00:00Z",
        canonicalSpec: "ARTPROOF-SHA256-CHAIN-V1",
        project: {
          id: "p1",
          title: "Test Work",
          artistName: "Test Artist",
          medium: "Digital",
          yearCreated: 2026,
          createdAt: "2026-10-12T10:00:00Z",
          primaryArtwork: {
            name: "art.png",
            mimeType: "image/png",
            sizeBytes: 1024,
            sha256Hash: "not-a-valid-sha-256",
          },
        },
        eventChain: [],
        summary: {
          totalEvents: 0,
          totalEvidenceFiles: 0,
          headDigest: "000",
        },
        declarations: {
          artistClaim: "Artist claim",
          integrityScope: "Integrity scope",
          limitationsDisclaimer: "Limitations disclaimer",
        },
      };

      const res = manifestImportSchema.safeParse(invalidHashManifest);
      expect(res.success).toBe(false);
    });
  });
});
