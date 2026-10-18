import { describe, it, expect, beforeEach } from "vitest";
import { storage } from "../storage-provider";
import { generateDemoProject } from "../demo-data";
import { verifyProvenanceManifest, buildProvenanceManifest } from "@/lib/crypto/manifest";

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
});
