import { describe, it, expect, beforeEach } from "vitest";
import { storage, sanitizeProject } from "../storage-provider";
import { generateDemoProject } from "../demo-data";
import {
  verifyProvenanceManifest,
  buildProvenanceManifest,
  createTimelineEvent,
} from "@/lib/crypto/manifest";
import { ArtworkProject } from "@/types/provenance";

describe("Storage Provider & Demo Data Suite", () => {
  beforeEach(async () => {
    await storage.clearAllProjects();
  });

  it("saves and retrieves artwork project correctly", async () => {
    const demo = await generateDemoProject();
    await storage.saveProject(demo);

    const retrieved = await storage.getProject(demo.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(demo.id);
    expect(retrieved?.title).toBe(demo.title);
    expect(retrieved?.events.length).toBe(4);
  });

  it("lists all saved projects", async () => {
    const demo = await generateDemoProject();
    await storage.saveProject(demo);

    const all = await storage.getProjects();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(demo.id);
  });

  it("returns null for non-existent or invalid project IDs", async () => {
    const notFound = await storage.getProject("non_existent_proj_99999");
    expect(notFound).toBeNull();

    const emptyId = await storage.getProject("");
    expect(emptyId).toBeNull();
  });

  it("deletes a project cleanly", async () => {
    const demo = await generateDemoProject();
    await storage.saveProject(demo);

    await storage.deleteProject(demo.id);
    const retrieved = await storage.getProject(demo.id);
    expect(retrieved).toBeNull();

    const all = await storage.getProjects();
    expect(all.length).toBe(0);
  });

  it("generated demo project produces a 100% valid cryptographic provenance manifest", async () => {
    const demo = await generateDemoProject();
    const manifest = buildProvenanceManifest(demo);
    const report = await verifyProvenanceManifest(manifest);

    expect(report.isValid).toBe(true);
    expect(report.chainValid).toBe(true);
    expect(report.totalEventsChecked).toBe(4);
    expect(report.status).toBe("PASSED");
  });

  it("persists a user-created artwork project with genesis event end-to-end", async () => {
    const projectId = "proj_test_user_unique_123";
    const now = new Date().toISOString();

    const genesisEvent = await createTimelineEvent({
      projectId,
      sequence: 0,
      eventType: "PROJECT_CREATED",
      timestamp: now,
      data: {
        title: "Nocturne in Ultramarine",
        description: "Initial user canvas ledger",
        milestonePhase: "CONCEPT",
        notes: "Glazing test on Belgian linen",
      },
      previousDigest: null,
    });

    const userProject: ArtworkProject = {
      id: projectId,
      title: "Nocturne in Ultramarine",
      artistName: "Marcus Vance",
      medium: "Oil on Linen",
      yearCreated: 2026,
      description: "A dark atmospheric composition exploring twilight values.",
      createdAt: now,
      updatedAt: now,
      primaryArtwork: {
        name: "nocturne-master.png",
        mimeType: "image/png",
        sizeBytes: 2048,
        sha256Hash: genesisEvent.currentDigest,
      },
      events: [genesisEvent],
      isDemo: false,
    };

    await storage.saveProject(userProject);

    const retrieved = await storage.getProject(projectId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(projectId);
    expect(retrieved?.title).toBe("Nocturne in Ultramarine");
    expect(retrieved?.artistName).toBe("Marcus Vance");
    expect(retrieved?.isDemo).toBe(false);
    expect(retrieved?.events.length).toBe(1);
    expect(retrieved?.events[0].data.notes).toBe("Glazing test on Belgian linen");

    // Verify manifest for this user-created project
    const manifest = buildProvenanceManifest(retrieved!);
    const report = await verifyProvenanceManifest(manifest);
    expect(report.isValid).toBe(true);
    expect(report.chainValid).toBe(true);
  });

  it("protects user-created projects from being overwritten by demo project seeds", async () => {
    const targetId = "art_shared_collision_id";
    const now = new Date().toISOString();

    const userProject: ArtworkProject = {
      id: targetId,
      title: "User Sacred Work",
      artistName: "Real Artist",
      medium: "Pastel on Archival Paper",
      yearCreated: 2026,
      description: "User original work that should never be overwritten.",
      createdAt: now,
      updatedAt: now,
      primaryArtwork: {
        name: "user_sacred.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        sha256Hash: "1111111111111111111111111111111111111111111111111111111111111111",
      },
      events: [],
      isDemo: false,
    };

    // Save the real user project
    await storage.saveProject(userProject);

    // Attempt to seed demo project with colliding ID
    const collidingDemo: ArtworkProject = {
      id: targetId,
      title: "Demo Override Attempt",
      artistName: "Demo Impostor",
      medium: "Digital",
      yearCreated: 2026,
      description: "Should be blocked.",
      createdAt: now,
      updatedAt: now,
      primaryArtwork: {
        name: "demo.png",
        mimeType: "image/png",
        sizeBytes: 512,
        sha256Hash: "2222222222222222222222222222222222222222222222222222222222222222",
      },
      events: [],
      isDemo: true,
    };

    await storage.saveProject(collidingDemo);

    const retrieved = await storage.getProject(targetId);
    expect(retrieved?.title).toBe("User Sacred Work");
    expect(retrieved?.artistName).toBe("Real Artist");
    expect(retrieved?.isDemo).toBe(false);
  });

  it("sanitizes corrupted and partial records safely without crashing", () => {
    // Null / non-objects
    expect(sanitizeProject(null)).toBeNull();
    expect(sanitizeProject(undefined)).toBeNull();
    expect(sanitizeProject("corrupted string")).toBeNull();
    expect(sanitizeProject(12345)).toBeNull();

    // Missing required identifiers
    expect(sanitizeProject({ title: "No ID" })).toBeNull();
    expect(sanitizeProject({ id: "no_title" })).toBeNull();
    expect(sanitizeProject({ id: "   ", title: "Blank ID" })).toBeNull();

    // Partial record missing events array: should recover safely with events: []
    const partialRecord = {
      id: "part_01",
      title: "Salvaged Sketch",
      artistName: "Elena",
      medium: "Charcoal",
      yearCreated: 2026,
      // missing events & primaryArtwork
    };

    const sanitized = sanitizeProject(partialRecord);
    expect(sanitized).not.toBeNull();
    expect(sanitized?.id).toBe("part_01");
    expect(sanitized?.title).toBe("Salvaged Sketch");
    expect(sanitized?.events).toEqual([]);
    expect(sanitized?.primaryArtwork).toBeDefined();
    expect(sanitized?.primaryArtwork.sha256Hash).toBeDefined();
  });

  it("orders projects chronologically by updatedAt descending", async () => {
    const now = Date.now();

    const olderProject: ArtworkProject = {
      id: "proj_older",
      title: "Older Canvas",
      artistName: "Artist",
      medium: "Oil",
      yearCreated: 2025,
      description: "Old work",
      createdAt: new Date(now - 10000).toISOString(),
      updatedAt: new Date(now - 10000).toISOString(),
      primaryArtwork: {
        name: "old.png",
        mimeType: "image/png",
        sizeBytes: 100,
        sha256Hash: "3333333333333333333333333333333333333333333333333333333333333333",
      },
      events: [],
    };

    const newerProject: ArtworkProject = {
      id: "proj_newer",
      title: "Newer Canvas",
      artistName: "Artist",
      medium: "Tempera",
      yearCreated: 2026,
      description: "New work",
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      primaryArtwork: {
        name: "new.png",
        mimeType: "image/png",
        sizeBytes: 100,
        sha256Hash: "4444444444444444444444444444444444444444444444444444444444444444",
      },
      events: [],
    };

    await storage.saveProject(olderProject);
    await storage.saveProject(newerProject);

    const all = await storage.getProjects();
    expect(all.length).toBe(2);
    expect(all[0].id).toBe("proj_newer");
    expect(all[1].id).toBe("proj_older");
  });
});
