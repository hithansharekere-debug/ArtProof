# ArtProof — Verifiable Art Provenance Platform

> **InnovArt 2027 Hackathon Project Entry**
> A privacy-conscious, local-first web application that helps artists document their artwork's creative journey, preserve raw byte cryptographic evidence of process milestones, and share verifiable provenance passports with patrons, galleries, and collectors.

---

## 1. Core Product Philosophy & Integrity Scope

**ArtProof is NOT an AI-image detector.**

ArtProof never claims that a cryptographic hash, timestamp, uploaded screenshot, or editing timeline proves that a human created an artwork.

Its explicit purpose is to:
- Document artwork creation milestones chronologically.
- Preserve selected process evidence and artwork master versions.
- Calculate deterministic SHA-256 digests from actual file bytes using the client-side Web Crypto API.
- Detect changes or tampering to previously recorded files and manifests.
- Generate shareable artwork provenance passports (PDF-ready and JSON).
- Enable viewers to inspect available evidence while understanding exact verification limitations.
- Keep artists in full control over what information they share.

### Honest Verification Scope
| Verified by ArtProof | NOT Claimed by ArtProof |
| :--- | :--- |
| **Byte-for-byte SHA-256 match** against original master files | Proof of human authorship or artistic intent |
| **Unbroken predecessor hash links** across chronological events | Absence or presence of generative AI tools |
| **Deterministic canonical JSON ordering** of recorded event data | Legal copyright ownership or licensing exclusivity |
| **Local device milestone timestamps** without external cloud leaks | Third-party notary or RFC 3161 distributed consensus |

---

## 2. Architecture & Design Principles

ArtProof is crafted with a studio aesthetic inspired by the restraint of Linear and Apple interfaces: warm parchment backgrounds (`#FDFBF7`), dark ink typography (`#1C1917`), muted sage accents (`#4A6356`), and restrained copper accents (`#B86226`).

### Architecture Overview
```
src/
  ├── app/                  # Next.js App Router routes
  │   ├── page.tsx          # Landing page & 3-step workflow
  │   ├── dashboard/        # Studio Dashboard & recent activity
  │   ├── artworks/         # Catalog view with search & medium filters
  │   ├── activity/         # Chronological milestone feed across all projects
  │   ├── projects/new/     # Full artwork registration flow
  │   ├── projects/[id]/    # Artwork detail & process timeline
  │   ├── projects/[id]/passport/ # Printable Provenance Passport & JSON export
  │   ├── verify/           # Independent client-side manifest & byte verifier
  │   └── settings/         # Privacy, IndexedDB backup/restore & threat model
  ├── components/
  │   ├── artworks/         # ArtworkCard, NewArtworkDialog
  │   ├── layout/           # Navbar, Footer, StudioSidebar, StudioShell
  │   └── ui/               # Badge, Button, Card, Dialog, Input, Textarea, Select,
  │                         # EmptyState, LoadingState, ErrorState, HashViewer, DisclaimerBanner
  ├── config/               # Central app config, limits, disclaimers
  ├── lib/
  │   ├── crypto/           # Canonical serializer, SHA-256, manifest engine
  │   ├── storage/          # Local-first IndexedDB provider & demo seed
  │   └── validation/       # Zod schemas for user input & manifests
  └── types/                # Domain models for projects, events, and manifests
```

### Event Chain Cryptographic Specification
Each milestone is structured under the canonical schema: `ARTPROOF-SHA256-CHAIN-V1`:
$$\text{Digest}_n = \text{SHA-256}(\text{CanonicalJSON}(\text{schemaVersion}, \text{id}, \text{projectId}, \text{sequence}, \text{eventType}, \text{timestamp}, \text{data}, \text{Digest}_{n-1}))$$

- **Deterministic serialization**: Object keys are sorted alphabetically recursively to avoid arbitrary JavaScript key order discrepancies.
- **Predecessor Linking**: Event 0 (Genesis) links to `null`. Each subsequent event strictly requires `previousDigest === events[n - 1].currentDigest`.
- **Tamper Detection**: Any modified title, note, or reordered milestone breaks the chain immediately upon inspection.

---

## 3. Technology Stack

- **Framework**: Next.js App Router (16.4)
- **Language**: TypeScript (strict type checking enabled)
- **Styling**: Tailwind CSS v4 with custom studio tokens
- **Icons**: Lucide React
- **Validation**: Zod (strict validation of untrusted JSON manifests and user inputs)
- **Cryptography**: Web Crypto API (`crypto.subtle.digest`) with Node.js `node:crypto` test fallback
- **Storage**: Browser IndexedDB (`artproof_db`) for local-first zero-cloud data preservation
- **Test Runner**: Vitest (24 unit tests covering crypto vectors, schemas, and persistence)

---

## 4. Setup & Development Instructions

### Prerequisites
- Node.js `v20.x` or later (tested on Node `v24.16`)
- npm `10.x` or later

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/artproof.git
cd artproof

# Install dependencies
npm install

# Run development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts
- `npm run dev`: Starts the local development server with Turbopack.
- `npm run build`: Executes strict type-checking and builds the production application.
- `npm run start`: Runs the built production server.
- `npm run lint`: Runs ESLint with zero allowed warnings.
- `npm test`: Executes the Vitest unit test suite.

---

## 5. Testing Suite

The project includes unit test coverage across three critical modules:
1. **Cryptographic Suite (`src/lib/crypto/__tests__/provenance.test.ts`)**:
   - Deterministic canonical JSON key sorting.
   - Standard NIST SHA-256 test vectors (empty string, "hello", "The quick brown fox...").
   - Chain integrity verification for legitimate manifests.
   - Detection of modified event titles, deleted sequence items, and tampered artwork byte buffers.
   - Rejection of malformed manifests.
2. **Validation Schemas (`src/lib/validation/__tests__/schemas.test.ts`)**:
   - Project input bounds (title length, valid years).
   - Milestone input schema and phase constraints.
   - File size limits (max 20 MB) and MIME type whitelisting.
   - Manifest import structure verification.
3. **Storage & Demo Suite (`src/lib/storage/__tests__/storage.test.ts`)**:
   - Save, retrieve, list, and delete artwork projects in IndexedDB.
   - Verification that the generated InnovArt demo study produces a 100% cryptographically valid manifest.

Run tests:
```bash
npm test
```

---

## 6. Threat Model & Privacy Guarantees

### Privacy by Design
- **Zero Cloud Transmission**: Your artwork master images, process sketches, and private creative notes remain inside your browser's IndexedDB. No telemetry or analytics are embedded.
- **Export Sanitization**: Generated Provenance Passports and manifests reference cryptographic hashes and public artist metadata, never private local filesystem paths.

### Threat Model Boundaries
1. **Post-Registration Integrity**: Once milestones and raw file digests are registered in the chain, any retroactive editing, sequence reordering, or byte alteration is mathematically detectable.
2. **Pre-Registration Fabrications**: A local hash chain is not a blockchain or global consensus mechanism. A party with full control over the local browser can fabricate a timeline before signing it. Timestamps reflect local device clock time unless external third-party RFC 3161 notary servers are integrated in future versions.
3. **Hashing vs Encryption**: SHA-256 provides integrity verification, not data confidentiality. Passwords or confidential keys should never be stored in artwork metadata.

---

## 7. Manual Demo Script (For Hackathon Judges)

1. **Landing Page**: Visit `http://localhost:3000`. Review the headline (*"Every artwork has a story. Preserve the proof."*), the three-step workflow, and honest limitations banner.
2. **Seed Demo Study**: Click **"Sample Demo Artwork"** or navigate to `/dashboard` and click **"Seed Demo Study"**. This loads *Solitude in Amber (Study No. 4)* by Elena Rostova.
3. **Inspect Timeline (`/projects/art_demo_solitude_amber`)**:
   - Inspect the 4 chronological milestones (Concept, Value Sketch, Underpainting, Final Glaze).
   - Inspect attached evidence images with their SHA-256 hashes.
   - Notice the green **"Cryptographic Chain Verified"** badge.
4. **Record a New Milestone**:
   - Click **"Record Milestone"**.
   - Enter title (*"Archival Varnish Pass"*), select phase (*"FINAL_TOUCHES"*), add notes, and submit.
   - Watch the milestone append to sequence #4 with its newly calculated SHA-256 digest linked to the predecessor.
5. **View & Print Passport (`/projects/.../passport`)**:
   - View the formatted certificate with curatorial context, milestone summary table, and head digest.
   - Click **"Download Manifest (JSON)"** to save the portable manifest.
   - Click **"Print / Save as PDF"** to preview the clean printable view.
6. **Independent Manifest Verifier (`/verify`)**:
   - Open `/verify`.
   - Click **"Try Sample Manifest"** or upload the downloaded JSON file.
   - Observe the step-by-step cryptographic audit breakdown verifying each link in the chain.

---

## 8. License & Acknowledgments

Built for the **InnovArt 2027 Hackathon**. Distributed under the MIT License.
