// ArtProof Application Configuration
// Central repository for product name, limits, branding tokens, and disclaimers.

export const APP_CONFIG = {
  name: "ArtProof",
  tagline: "Verifiable Art Provenance & Creative Journey Platform",
  hackathonNote: "InnovArt 2027 Hackathon Entry",
  version: "1.0.0",
  limits: {
    maxFileSizeBytes: 20 * 1024 * 1024, // 20 MB
    maxFileSizeDisplay: "20 MB",
    allowedMimeTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
      "image/avif",
      "application/pdf",
    ],
    allowedExtensions: [".png", ".jpg", ".jpeg", ".webp", ".svg", ".avif", ".pdf"],
    maxProjectTitleLength: 120,
    maxDescriptionLength: 2000,
  },
  disclaimer: {
    corePhilosophy:
      "ArtProof is a verifiable milestone recording platform, NOT an AI detector. It preserves cryptographic proof of file integrity and recorded timeline events over time. It never claims to prove human authorship, artistic originality, or copyright ownership.",
    verificationPassing:
      "Integrity verified: The inspected file byte hash matches the recorded manifest digest, and the chronological event chain is cryptographically intact.",
    verificationNotice:
      "Important Notice: Successful hash verification confirms that the recorded files have not been modified since their digest was registered. It does not certify that a human created the art, nor does it guarantee the truthfulness of artist-provided titles, dates, or notes.",
  },
  theme: {
    parchment: "#FBF9F5",
    parchmentMuted: "#F3EFE6",
    ink: "#1A1715",
    inkLight: "#3E3B38",
    mutedSage: "#5B7065",
    copper: "#B86B35",
    copperHover: "#9C5726",
    border: "#E5DEC9",
  },
} as const;
