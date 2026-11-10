import { describe, it, expect, beforeEach } from "vitest";
import {
  storage,
  sanitizeProject,
  createGenesisVersion,
  streamlineProjectForLocalStorage,
  importStudioBackup,
} from "../storage-provider";
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

  it("sanitizes unsafe filenames and blocks remote/script data URLs in storage", async () => {
    const dangerousRecord = {
      id: "proj_dangerous_input",
      title: "Attack Test",
      artistName: "Hacker",
      medium: "Digital",
      yearCreated: 2026,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      primaryArtwork: {
        name: "../../etc/passwd",
        mimeType: "image/png",
        sizeBytes: 100,
        sha256Hash: "1111111111111111111111111111111111111111111111111111111111111111",
        dataUrl: "http://malicious-telemetry.example.com/log.png",
      },
      events: [
        {
          schemaVersion: 1,
          id: "evt_1",
          projectId: "proj_dangerous_input",
          sequence: 0,
          eventType: "MILESTONE_LOGGED",
          timestamp: new Date().toISOString(),
          data: {
            title: "Test",
            evidence: [
              {
                id: "evi_1",
                name: "..\\..\\sensitive\\data.txt",
                mimeType: "image/png",
                sizeBytes: 50,
                sha256Hash: "2222222222222222222222222222222222222222222222222222222222222222",
                fileDataUrl: "javascript:alert(document.cookie)",
              },
            ],
          },
          previousDigest: null,
          currentDigest: "3333333333333333333333333333333333333333333333333333333333333333",
        },
      ],
      versions: [
        {
          id: "ver_1",
          projectId: "proj_dangerous_input",
          versionNumber: 1,
          versionLabel: "v1.0",
          createdAt: new Date().toISOString(),
          hasFile: true,
          file: {
            name: "C:\\Windows\\System32\\cmd.exe",
            mimeType: "image/png",
            sizeBytes: 100,
            sha256Hash: "4444444444444444444444444444444444444444444444444444444444444444",
            algorithm: "SHA-256",
            dataUrl: "https://external.leak.site/art.jpg",
          },
        },
      ],
    };

    const sanitized = sanitizeProject(dangerousRecord);
    expect(sanitized).not.toBeNull();
    // Path traversal in filename stripped
    expect(sanitized?.primaryArtwork.name).toBe("etc-passwd");
    // Remote HTTP URL blocked
    expect(sanitized?.primaryArtwork.dataUrl).toBeUndefined();

    // Evidence filename sanitized and javascript: blocked
    const evidenceItem = (sanitized?.events[0].data as Record<string, unknown>).evidence as Array<Record<string, unknown>>;
    expect(evidenceItem[0].name).toBe("sensitive-data.txt");
    expect(evidenceItem[0].fileDataUrl).toBeUndefined();

    // Version file path sanitized and HTTPS URL blocked
    expect(sanitized?.versions?.[0].file?.name).toBe("C-Windows-System32-cmd.exe");
    expect(sanitized?.versions?.[0].file?.dataUrl).toBeUndefined();
  });

  it("initializes v1.0 Genesis version linked to genesis event without duplicating versions", async () => {
    const projectId = "proj_genesis_consistency";
    const now = "2026-10-15T12:00:00.000Z";
    const genesisEvent = await createTimelineEvent({
      id: "evt_genesis_0",
      projectId,
      sequence: 0,
      eventType: "PROJECT_CREATED",
      timestamp: now,
      data: {
        title: "Consistency Study",
        milestonePhase: "CONCEPT",
        primaryArtworkHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      },
      previousDigest: null,
    });

    const primaryArtwork: ArtworkProject["primaryArtwork"] = {
      name: "consistency-master.png",
      mimeType: "image/png",
      sizeBytes: 4096,
      sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    };

    const genesisVersion = createGenesisVersion({
      projectId,
      createdAt: now,
      primaryArtwork,
      genesisEventId: genesisEvent.id,
      hasFile: true,
    });

    expect(genesisVersion.id).toBe(`ver_init_${projectId}`);
    expect(genesisVersion.versionLabel).toBe("v1.0 Genesis");
    expect(genesisVersion.associatedEventId).toBe("evt_genesis_0");
    expect(genesisVersion.hasFile).toBe(true);

    // Explicitly passing duplicate genesis versions should be deduplicated by sanitizeProject
    const projectWithExplicitGenesis: ArtworkProject = {
      id: projectId,
      title: "Consistency Study",
      artistName: "Elena Rostova",
      medium: "Digital Painting",
      yearCreated: 2026,
      description: "Testing explicit genesis version",
      createdAt: now,
      updatedAt: now,
      primaryArtwork,
      events: [genesisEvent],
      versions: [genesisVersion, { ...genesisVersion }],
      isDemo: false,
    };

    await storage.saveProject(projectWithExplicitGenesis);
    const retrieved = await storage.getProject(projectId);
    expect(retrieved?.versions?.length).toBe(1);
    expect(retrieved?.versions?.[0].id).toBe(`ver_init_${projectId}`);
    expect(retrieved?.versions?.[0].associatedEventId).toBe("evt_genesis_0");
  });

  it("strips large top-level and nested version dataUrls for localStorage without mutating original project", () => {
    const smallDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const largeDataUrl = `data:image/png;base64,${"A".repeat(60000)}`;

    const originalProject: ArtworkProject = {
      id: "proj_dataurl_test",
      title: "Data URL Sanitization Study",
      artistName: "Marcus Vance",
      medium: "Oil on Panel",
      yearCreated: 2026,
      description: "Testing both version dataUrl locations",
      createdAt: "2026-10-15T10:00:00.000Z",
      updatedAt: "2026-10-15T10:00:00.000Z",
      primaryArtwork: {
        name: "master.png",
        mimeType: "image/png",
        sizeBytes: 65000,
        sha256Hash: "1111111111111111111111111111111111111111111111111111111111111111",
        dataUrl: largeDataUrl,
      },
      events: [],
      versions: [
        {
          id: "ver_large",
          projectId: "proj_dataurl_test",
          versionNumber: 1,
          versionLabel: "v1.0 Heavy Master",
          createdAt: "2026-10-15T10:00:00.000Z",
          notes: "Large preview in both fields",
          hasFile: true,
          sha256Hash: "1111111111111111111111111111111111111111111111111111111111111111",
          fileName: "master.png",
          fileSizeBytes: 65000,
          isArchivalFinal: true,
          dataUrl: largeDataUrl,
          file: {
            name: "master.png",
            mimeType: "image/png",
            sizeBytes: 65000,
            sha256Hash: "1111111111111111111111111111111111111111111111111111111111111111",
            algorithm: "SHA-256",
            dataUrl: largeDataUrl,
          },
        },
        {
          id: "ver_small",
          projectId: "proj_dataurl_test",
          versionNumber: 2,
          versionLabel: "v1.1 Small Thumbnail",
          createdAt: "2026-10-15T11:00:00.000Z",
          notes: "Compact preview in both fields",
          hasFile: true,
          dataUrl: smallDataUrl,
          file: {
            name: "thumb.png",
            mimeType: "image/png",
            sizeBytes: 120,
            sha256Hash: "2222222222222222222222222222222222222222222222222222222222222222",
            algorithm: "SHA-256",
            dataUrl: smallDataUrl,
          },
        },
      ],
    };

    const streamlined = streamlineProjectForLocalStorage(originalProject);

    // Large dataUrls stripped from both top-level ver.dataUrl and nested ver.file.dataUrl
    expect(streamlined.primaryArtwork.dataUrl).toBeUndefined();
    expect(streamlined.versions?.[0].dataUrl).toBeUndefined();
    expect(streamlined.versions?.[0].file?.dataUrl).toBeUndefined();

    // All other metadata on ver_large preserved intact
    expect(streamlined.versions?.[0].versionLabel).toBe("v1.0 Heavy Master");
    expect(streamlined.versions?.[0].notes).toBe("Large preview in both fields");
    expect(streamlined.versions?.[0].sha256Hash).toBe(
      "1111111111111111111111111111111111111111111111111111111111111111"
    );
    expect(streamlined.versions?.[0].isArchivalFinal).toBe(true);
    expect(streamlined.versions?.[0].file?.name).toBe("master.png");

    // Small dataUrls preserved intact
    expect(streamlined.versions?.[1].dataUrl).toBe(smallDataUrl);
    expect(streamlined.versions?.[1].file?.dataUrl).toBe(smallDataUrl);

    // Original project was not mutated
    expect(originalProject.primaryArtwork.dataUrl).toBe(largeDataUrl);
    expect(originalProject.versions?.[0].dataUrl).toBe(largeDataUrl);
    expect(originalProject.versions?.[0].file?.dataUrl).toBe(largeDataUrl);
  });

  describe("Studio Backup Import Validation", () => {
    it("imports a valid studio backup cleanly", async () => {
      const demo = await generateDemoProject();
      const backupPayload = JSON.stringify({
        app: "ArtProof",
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        projects: [demo],
      });

      const result = await importStudioBackup(backupPayload, storage);
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);

      const stored = await storage.getProject(demo.id);
      expect(stored).not.toBeNull();
      expect(stored?.title).toBe(demo.title);
    });

    it("rejects malformed backup payloads with clear error feedback", async () => {
      const badJson = await importStudioBackup("{not valid json", storage);
      expect(badJson.success).toBe(false);
      expect(badJson.error).toContain("failed to parse JSON");

      const missingProjects = await importStudioBackup({ app: "ArtProof" }, storage);
      expect(missingProjects.success).toBe(false);
      expect(missingProjects.error).toContain("'projects' array not found");

      const badHashRecord = await importStudioBackup(
        {
          app: "ArtProof",
          projects: [
            {
              id: "proj_bad_hash",
              title: "Corrupt Digest",
              artistName: "Artist",
              medium: "Oil",
              yearCreated: 2026,
              description: "Invalid primary hash",
              createdAt: "2026-10-01T00:00:00.000Z",
              updatedAt: "2026-10-01T00:00:00.000Z",
              primaryArtwork: {
                name: "bad.png",
                mimeType: "image/png",
                sizeBytes: 100,
                sha256Hash: "not-a-64-char-hex-hash",
              },
              events: [],
            },
          ],
        },
        storage
      );
      expect(badHashRecord.success).toBe(false);
      expect(badHashRecord.error).toContain("Record #1");
    });

    it("avoids partially importing a backup if a later record is invalid", async () => {
      const demo = await generateDemoProject();
      const invalidSecondProject = {
        id: "proj_second_invalid",
        title: "   ", // Invalid empty title
        artistName: "Artist",
        medium: "Oil",
        yearCreated: 2026,
        primaryArtwork: demo.primaryArtwork,
        events: [],
      };

      const result = await importStudioBackup(
        {
          app: "ArtProof",
          projects: [demo, invalidSecondProject],
        },
        storage
      );

      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
      expect(result.error).toContain("Record #2");

      // First valid record must NOT have been partially imported
      const all = await storage.getProjects();
      expect(all.length).toBe(0);
    });

    it("does not overwrite an unrelated existing user-created project on ID collision", async () => {
      const existingUserProject: ArtworkProject = {
        id: "proj_collision_guard",
        title: "Original User Masterpiece",
        artistName: "Real User",
        medium: "Watercolor",
        yearCreated: 2026,
        description: "Must remain untouched",
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
        primaryArtwork: {
          name: "user.png",
          mimeType: "image/png",
          sizeBytes: 1024,
          sha256Hash: "1111111111111111111111111111111111111111111111111111111111111111",
        },
        events: [],
        isDemo: false,
      };

      await storage.saveProject(existingUserProject);

      const collidingBackupProject = {
        ...existingUserProject,
        title: "Unrelated Conflicting Project",
        createdAt: "2026-10-20T10:00:00.000Z",
      };

      const result = await importStudioBackup(
        {
          app: "ArtProof",
          projects: [collidingBackupProject],
        },
        storage
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("conflicts with an existing unrelated project");

      const preserved = await storage.getProject("proj_collision_guard");
      expect(preserved?.title).toBe("Original User Masterpiece");
    });
  });

  describe("Navigation & Stalled IndexedDB Fallback Regression Suite", () => {
    it("falls back to localStorage without hanging when IndexedDB open is blocked or stalled during page navigation", async () => {
      const demo = await generateDemoProject();
      await storage.saveProject(demo);

      const originalWindow = globalThis.window;
      // Simulate browser window with a blocked/stalled IndexedDB open request
      const mockBlockedIdb = {
        open: () => {
          const req: Record<string, unknown> = {};
          setTimeout(() => {
            if (typeof req.onblocked === "function") {
              (req.onblocked as () => void)();
            }
          }, 5);
          return req;
        },
      };

      Object.defineProperty(globalThis, "window", {
        value: {
          ...(originalWindow || {}),
          indexedDB: mockBlockedIdb,
          localStorage: globalThis.localStorage,
        },
        configurable: true,
        writable: true,
      });

      try {
        // Sequential navigation queries across Dashboard -> Artworks -> Activity -> Detail
        const dashboardList = await storage.getProjects();
        expect(dashboardList.length).toBe(1);
        expect(dashboardList[0].id).toBe(demo.id);

        const activityList = await storage.getProjects();
        expect(activityList.length).toBe(1);

        const detailProject = await storage.getProject(demo.id);
        expect(detailProject).not.toBeNull();
        expect(detailProject?.id).toBe(demo.id);
      } finally {
        Object.defineProperty(globalThis, "window", {
          value: originalWindow,
          configurable: true,
          writable: true,
        });
      }
    });

    it("falls back cleanly when an IndexedDB transaction aborts mid-navigation", async () => {
      const demo = await generateDemoProject();
      await storage.saveProject(demo);

      const originalWindow = globalThis.window;
      const mockAbortingIdb = {
        open: () => {
          const req: Record<string, unknown> = {
            result: {
              objectStoreNames: { contains: () => true },
              transaction: () => {
                const tx: Record<string, unknown> = {
                  error: new Error("Simulated IDB transaction abort"),
                  objectStore: () => ({
                    getAll: () => ({}),
                    get: () => ({}),
                  }),
                };
                setTimeout(() => {
                  if (typeof tx.onabort === "function") {
                    (tx.onabort as () => void)();
                  }
                }, 5);
                return tx;
              },
              close: () => {},
            },
          };
          setTimeout(() => {
            if (typeof req.onsuccess === "function") {
              (req.onsuccess as () => void)();
            }
          }, 2);
          return req;
        },
      };

      Object.defineProperty(globalThis, "window", {
        value: {
          ...(originalWindow || {}),
          indexedDB: mockAbortingIdb,
          localStorage: globalThis.localStorage,
        },
        configurable: true,
        writable: true,
      });

      try {
        const projects = await storage.getProjects();
        expect(projects.length).toBe(1);
        expect(projects[0].id).toBe(demo.id);

        const single = await storage.getProject(demo.id);
        expect(single?.id).toBe(demo.id);
      } finally {
        Object.defineProperty(globalThis, "window", {
          value: originalWindow,
          configurable: true,
          writable: true,
        });
      }
    });
  });
});
