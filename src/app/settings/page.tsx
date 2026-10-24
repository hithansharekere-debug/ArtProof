"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Database,
  Download,
  Upload,
  Trash2,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DisclaimerBanner } from "@/components/ui/DisclaimerBanner";
import { storage } from "@/lib/storage/storage-provider";
import { generateDemoProject } from "@/lib/storage/demo-data";
import { ArtworkProject } from "@/types/provenance";
import { APP_CONFIG } from "@/config/app-config";
import { StudioShell } from "@/components/layout/StudioShell";

export default function SettingsPage() {
  const [projectCount, setProjectCount] = useState<number>(0);
  const [demoPresent, setDemoPresent] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    let active = true;
    storage.getProjects().then((all) => {
      if (active) {
        setProjectCount(all.length);
        setDemoPresent(all.some((p) => p.isDemo));
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const refreshStats = async () => {
    setLoading(true);
    try {
      const all = await storage.getProjects();
      setProjectCount(all.length);
      setDemoPresent(all.some((p) => p.isDemo));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    if (actionPending) return;
    setActionPending(true);
    setStatusMessage("");
    setErrorMessage("");
    try {
      const all = await storage.getProjects();
      const backupData = {
        app: "ArtProof",
        version: APP_CONFIG.version,
        exportedAt: new Date().toISOString(),
        projects: all,
      };
      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `artproof-backup-${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage("All studio projects exported successfully.");
    } catch (err) {
      setErrorMessage(`Export failed: ${String(err)}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (actionPending) return;
    setActionPending(true);
    setStatusMessage("");
    setErrorMessage("");

    // Maximum 10MB backup file limit
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Backup file size exceeds the 10MB safety limit.");
      setActionPending(false);
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.projects || !Array.isArray(parsed.projects)) {
        setErrorMessage("Invalid backup file: 'projects' array not found.");
        setActionPending(false);
        return;
      }

      let importedCount = 0;
      for (const proj of parsed.projects as ArtworkProject[]) {
        if (proj && typeof proj === "object" && proj.id && proj.title) {
          await storage.saveProject(proj);
          importedCount++;
        }
      }

      await refreshStats();
      setStatusMessage(`Successfully imported ${importedCount} project(s) into studio storage.`);
    } catch (err) {
      setErrorMessage(`Failed to import backup: ${String(err)}`);
    } finally {
      setActionPending(false);
      // Reset input value so re-selecting same file triggers change
      e.target.value = "";
    }
  };

  const handleSeedDemo = async () => {
    if (actionPending) return;
    setActionPending(true);
    setStatusMessage("");
    setErrorMessage("");
    try {
      const demo = await generateDemoProject();
      await storage.saveProject(demo);
      await refreshStats();
      setStatusMessage("InnovArt 2027 demo project seeded into local storage.");
    } catch (err) {
      setErrorMessage(`Failed to seed demo: ${String(err)}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleClearAll = async () => {
    if (actionPending) return;
    if (
      confirm(
        "WARNING: This will permanently wipe all ArtProof projects and recorded timeline chains from this browser. This cannot be undone. Do you wish to continue?"
      )
    ) {
      setActionPending(true);
      setStatusMessage("");
      setErrorMessage("");
      try {
        await storage.clearAllProjects();
        await refreshStats();
        setStatusMessage("Local storage database cleared.");
      } catch (err) {
        setErrorMessage(`Failed to clear database: ${String(err)}`);
      } finally {
        setActionPending(false);
      }
    }
  };

  return (
    <StudioShell>
      <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2 border-b border-[#E8E2D5] pb-6">
        <div className="flex items-center gap-2">
          <Badge variant="ink" size="sm">
            Control Center
          </Badge>
          <span className="text-xs text-[#8C827A]">Local-First Security</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
          Privacy, Storage & Threat Model
        </h1>
        <p className="text-sm text-[#78716C]">
          Inspect your device&apos;s storage footprint, manage JSON backups, and understand ArtProof&apos;s cryptographic security boundaries.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Storage Overview */}
      <Card className="bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#B86226]" />
            <h2 className="font-serif font-semibold text-base text-[#1C1917]">
              Local Browser Storage (IndexedDB)
            </h2>
          </div>
          <Badge variant="sage" size="sm">
            Zero Cloud Uploads
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5]">
            <span className="text-[#8C827A] block text-[10px] uppercase font-semibold">
              Stored Artwork Projects
            </span>
            <span className="font-bold text-lg text-[#1C1917] mt-1 block">
              {loading ? "..." : projectCount}
            </span>
            <span className="text-[11px] text-[#78716C] mt-0.5 block">
              Saved in browser database <code className="font-mono">artproof_db</code>
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5]">
            <span className="text-[#8C827A] block text-[10px] uppercase font-semibold">
              Demo Project Status
            </span>
            <span className="font-bold text-lg text-[#1C1917] mt-1 block">
              {demoPresent ? "Active" : "Not Loaded"}
            </span>
            <span className="text-[11px] text-[#78716C] mt-0.5 block">
              Elena Rostova &bull; Solitude in Amber Study
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleExportAll} disabled={actionPending}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Full Studio Backup (JSON)
          </Button>

          <label className={`inline-flex items-center justify-center font-medium transition-all rounded-lg text-xs px-3 py-1.5 gap-1.5 bg-white/80 text-[#292524] border border-[#D6CEBE] ${actionPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-[#F5F1EA]"}`}>
            <Upload className="w-3.5 h-3.5" />
            Import Backup File
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              disabled={actionPending}
              className="hidden"
            />
          </label>

          <Button variant="ghost" size="sm" onClick={handleSeedDemo} disabled={actionPending}>
            <Sparkles className="w-3.5 h-3.5 text-[#B86226] mr-1" />
            Re-seed Demo Project
          </Button>

          <Button variant="danger" size="sm" onClick={handleClearAll} disabled={actionPending} className="ml-auto">
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Wipe Local Database
          </Button>
        </div>
      </Card>

      {/* Threat Model & Architectural Boundaries */}
      <Card className="bg-white space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E8E2D5] pb-3">
          <Lock className="w-4 h-4 text-[#B86226]" />
          <h2 className="font-serif font-semibold text-base text-[#1C1917]">
            Threat Model & Privacy Philosophy
          </h2>
        </div>

        <div className="space-y-3 text-xs text-[#57534E] leading-relaxed">
          <div className="p-3.5 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5] space-y-2">
            <h3 className="font-semibold text-[#1C1917] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              1. What Local Cryptographic Chains Guarantee
            </h3>
            <p>
              Once a sequence of events and file digests is established, calculating canonical SHA-256 hashes linked to predecessor digests guarantees that any subsequent alteration, reordering, or deletion of recorded events will cause an immediate integrity mismatch.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5] space-y-2">
            <h3 className="font-semibold text-[#1C1917] flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#B86226]" />
              2. What Local Cryptographic Chains Cannot Guarantee
            </h3>
            <p>
              A local-first hash chain is not a tamper-proof distributed consensus mechanism. A user who controls their own local database or generates a new manifest can fabricate an entirely new historical chain retroactively. Timestamps generated on the device reflect local system time, not externally notarized or RFC 3161-attested timestamps.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5] space-y-2">
            <h3 className="font-semibold text-[#1C1917] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#375244]" />
              3. Privacy by Design: Zero Unauthorized Data Ingestion
            </h3>
            <p>
              Your master artworks, high-resolution scans, and creative notes never leave your computer. All digests are calculated client-side in your browser via the Web Crypto API. When exporting a Provenance Passport, only cryptographic hashes and selected public metadata are packaged into the manifest.
            </p>
          </div>
        </div>
      </Card>

      <DisclaimerBanner />
      </div>
    </StudioShell>
  );
}
