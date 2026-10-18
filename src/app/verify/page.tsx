"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Upload,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HashViewer } from "@/components/ui/HashViewer";
import { DisclaimerBanner } from "@/components/ui/DisclaimerBanner";
import { verifyProvenanceManifest, buildProvenanceManifest } from "@/lib/crypto/manifest";
import { manifestImportSchema } from "@/lib/validation/schemas";
import { generateDemoProject } from "@/lib/storage/demo-data";
import { ProvenanceManifest, VerificationReport, VerificationStatus } from "@/types/provenance";

export default function VerificationPage() {
  const [manifestText, setManifestText] = useState("");
  const [parsedManifest, setParsedManifest] = useState<ProvenanceManifest | null>(null);

  // Optional artwork file to test
  const [artworkFile, setArtworkFile] = useState<File | null>(null);

  // Verification state
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleManifestFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setReport(null);

    try {
      const text = await file.text();
      setManifestText(text);

      const parsed = JSON.parse(text);
      const val = manifestImportSchema.safeParse(parsed);
      if (!val.success) {
        setErrorMessage(`Manifest schema error: ${val.error.issues[0]?.message || "Invalid structure"}`);
        setParsedManifest(null);
        return;
      }

      setParsedManifest(val.data as ProvenanceManifest);
    } catch (err) {
      setErrorMessage(`Failed to read manifest JSON file: ${String(err)}`);
      setParsedManifest(null);
    }
  };

  const handlePasteChange = (text: string) => {
    setManifestText(text);
    setReport(null);
    setErrorMessage("");

    if (!text.trim()) {
      setParsedManifest(null);
      return;
    }

    try {
      const parsed = JSON.parse(text);
      const val = manifestImportSchema.safeParse(parsed);
      if (!val.success) {
        setErrorMessage(`Invalid manifest JSON: ${val.error.issues[0]?.message || "Schema mismatch"}`);
        setParsedManifest(null);
        return;
      }
      setParsedManifest(val.data as ProvenanceManifest);
    } catch {
      // Allow user to continue typing or pasting
      setParsedManifest(null);
    }
  };

  const handleLoadDemoManifest = async () => {
    setVerifying(true);
    setErrorMessage("");
    try {
      const demoProject = await generateDemoProject();
      const demoManifest = buildProvenanceManifest(demoProject);
      const json = JSON.stringify(demoManifest, null, 2);
      setManifestText(json);
      setParsedManifest(demoManifest);
      setArtworkFile(null);

      // Verify immediately
      const rep = await verifyProvenanceManifest(demoManifest);
      setReport(rep);
    } catch (err) {
      setErrorMessage(`Failed to load demo manifest: ${String(err)}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleRunVerification = async () => {
    if (!parsedManifest) {
      setErrorMessage("Please supply a valid ArtProof manifest JSON.");
      return;
    }

    setVerifying(true);
    setErrorMessage("");

    try {
      const rep = await verifyProvenanceManifest(parsedManifest, artworkFile || undefined);
      setReport(rep);
    } catch (err) {
      setErrorMessage(`Verification execution error: ${String(err)}`);
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "PASSED":
        return <Badge variant="sage" size="md">Integrity Checks Passed</Badge>;
      case "FAILED_FILE_MISMATCH":
        return <Badge variant="danger" size="md">Artwork File Mismatch</Badge>;
      case "FAILED_CHAIN_INTEGRITY":
        return <Badge variant="danger" size="md">Event Chain Integrity Failed</Badge>;
      case "MALFORMED_MANIFEST":
        return <Badge variant="danger" size="md">Malformed Manifest</Badge>;
      case "INSUFFICIENT_DATA":
        return <Badge variant="parchment" size="md">Insufficient Data</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="space-y-2 border-b border-[#E8E2D5] pb-6">
        <div className="flex items-center gap-2">
          <Badge variant="copper" size="sm">
            Independent Audit
          </Badge>
          <span className="text-xs text-[#8C827A]">Free Client-Side Verifier</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
          Provenance Manifest Verifier
        </h1>
        <p className="text-sm text-[#78716C] max-w-2xl">
          Inspect any ArtProof provenance manifest to verify SHA-256 event chains, inspect historical creative milestones, and test artwork files for byte alteration.
        </p>
      </div>

      <DisclaimerBanner />

      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Manifest Input */}
        <Card className="space-y-4 bg-white flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-2">
              <span className="font-serif font-semibold text-sm text-[#1C1917]">
                1. Supply Provenance Manifest
              </span>
              <Button variant="ghost" size="sm" onClick={handleLoadDemoManifest}>
                <Sparkles className="w-3.5 h-3.5 text-[#B86226] mr-1" />
                Try Sample Manifest
              </Button>
            </div>

            <p className="text-xs text-[#78716C]">
              Upload a <code className="font-mono text-[11px]">.json</code> manifest or paste the raw JSON text below.
            </p>

            {/* File upload input */}
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleManifestFileUpload}
              className="text-xs text-[#57534E] file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#F3EFE6] file:text-[#1C1917] hover:file:bg-[#EBE5D9]"
            />

            <textarea
              rows={8}
              placeholder="Or paste manifest JSON content here..."
              value={manifestText}
              onChange={(e) => handlePasteChange(e.target.value)}
              className="w-full p-3 font-mono text-[11px] bg-[#FAF7F0] border border-[#D6CEBE] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B86226]"
            />
          </div>

          {parsedManifest && (
            <div className="p-3 bg-[#EBF2EE] border border-[#C5D8CE] rounded-lg text-xs text-[#2D4538] flex items-center justify-between">
              <div>
                <span className="font-semibold block">{parsedManifest.project.title}</span>
                <span className="text-[11px] opacity-80">
                  {parsedManifest.eventChain.length} events • By {parsedManifest.project.artistName}
                </span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          )}
        </Card>

        {/* Step 2: Optional Artwork File to Compare */}
        <Card className="space-y-4 bg-white flex flex-col justify-between">
          <div className="space-y-3">
            <div className="border-b border-[#E8E2D5] pb-2">
              <span className="font-serif font-semibold text-sm text-[#1C1917]">
                2. Artwork Byte Comparison (Optional)
              </span>
            </div>

            <p className="text-xs text-[#78716C]">
              If you have the original image or master file, upload it here. ArtProof will calculate its SHA-256 hash in your browser to verify it matches the manifest exactly.
            </p>

            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                artworkFile ? "border-[#B86226]/50 bg-[#FDFBF7]" : "border-[#D6CEBE] bg-[#FAF7F0]/40"
              }`}
            >
              <input
                id="testArtworkInput"
                type="file"
                onChange={(e) => {
                  setArtworkFile(e.target.files?.[0] || null);
                  setReport(null);
                }}
                className="hidden"
              />
              <label
                htmlFor="testArtworkInput"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <div className="w-10 h-10 rounded-full bg-[#F5EFE6] text-[#B86226] flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#1C1917]">
                    {artworkFile ? artworkFile.name : "Select artwork file to compare"}
                  </span>
                  <p className="text-[10px] text-[#78716C] mt-0.5">
                    {artworkFile
                      ? `${(artworkFile.size / 1024).toFixed(1)} KB`
                      : "Checks byte integrity without uploading to any server"}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <Button
              className="w-full"
              size="lg"
              onClick={handleRunVerification}
              isLoading={verifying}
              disabled={!parsedManifest}
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Run Cryptographic Integrity Check
            </Button>
          </div>
        </Card>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Verification Result Report */}
      {report && (
        <Card className="bg-white space-y-6 border-[#D6CEBE]">
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D5] pb-4">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8C827A]">
                Verification Audit Result
              </span>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-serif font-bold text-[#1C1917]">
                  {report.status === "PASSED"
                    ? "Cryptographic Verification Passed"
                    : report.status === "FAILED_FILE_MISMATCH"
                    ? "Artwork File Digest Mismatch"
                    : "Chain Integrity Failure"}
                </h2>
                {getStatusBadge(report.status)}
              </div>
            </div>

            <div className="text-xs text-[#78716C]">
              Checked at: {new Date(report.checkedAt).toLocaleTimeString()}
            </div>
          </div>

          {/* Explanation Text */}
          <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#E8E2D5] text-xs space-y-2">
            <h3 className="font-semibold text-[#292524]">Audit Findings:</h3>
            <ul className="space-y-1 list-disc list-inside text-[#57534E]">
              {report.messages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>

          {/* Artwork File Hash Comparison (if tested) */}
          {report.artworkMatch !== null && (
            <div className="p-4 rounded-xl border space-y-3 text-xs bg-white">
              <span className="font-semibold text-[#292524] block">
                Primary Artwork Byte Verification:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-[#78716C]">Recorded Hash in Manifest:</span>
                  <HashViewer hash={report.expectedArtworkHash || ""} truncate={true} />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-[#78716C]">Tested Uploaded File Hash:</span>
                  <HashViewer hash={report.testedArtworkHash || ""} truncate={true} />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {report.artworkMatch ? (
                  <span className="text-emerald-700 text-xs font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Exact SHA-256 byte match. The inspected file has not been altered.
                  </span>
                ) : (
                  <span className="text-red-700 text-xs font-medium flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    Hash mismatch! The provided artwork file does not match the manifest.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Verified Chain Breakdown */}
          {parsedManifest && (
            <div className="space-y-3">
              <h3 className="font-serif font-semibold text-sm text-[#1C1917] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#B86226]" />
                Chain Predecessor Linkage Breakdown
              </h3>

              <div className="border border-[#E8E2D5] rounded-xl overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#FAF7F0] border-b border-[#E8E2D5] text-left text-[11px] font-semibold text-[#78716C]">
                      <th className="py-2 px-3">Seq</th>
                      <th className="py-2 px-3">Event Title</th>
                      <th className="py-2 px-3">Predecessor Digest Link</th>
                      <th className="py-2 px-3">Computed Digest</th>
                      <th className="py-2 px-3 text-right">Integrity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE1]">
                    {parsedManifest.eventChain.map((ev, idx) => {
                      const isFailing =
                        report.failingEventIndex !== undefined && report.failingEventIndex === idx;

                      return (
                        <tr
                          key={ev.id}
                          className={`${isFailing ? "bg-red-50 text-red-900" : "hover:bg-[#FAF7F0]"}`}
                        >
                          <td className="py-2 px-3 font-mono font-medium">#{ev.sequence}</td>
                          <td className="py-2 px-3 font-medium text-[#1C1917]">{ev.data.title}</td>
                          <td className="py-2 px-3 font-mono text-[10px] text-[#78716C]">
                            {ev.previousDigest ? `${ev.previousDigest.substring(0, 10)}...` : "genesis"}
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-[#57534E]">
                            {ev.currentDigest.substring(0, 10)}...
                          </td>
                          <td className="py-2 px-3 text-right">
                            {isFailing ? (
                              <Badge variant="danger" size="sm">Failed</Badge>
                            ) : (
                              <Badge variant="sage" size="sm">Valid</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Limitations Notice */}
          <div className="pt-2 border-t border-[#E8E2D5] text-[11px] text-[#8C827A] leading-relaxed">
            <span className="font-semibold text-[#292524]">Important Reminder:</span>{" "}
            Verification confirms the structural validity of the event chain and whether the inspected file matches the recorded SHA-256 digest. It does not certify human authorship, originality, or legal copyright.
          </div>
        </Card>
      )}
    </div>
  );
}
