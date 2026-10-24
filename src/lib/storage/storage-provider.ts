import { ArtworkProject, ArtworkVersion, TimelineEvent } from "@/types/provenance";
import { sanitizeDataUrl, sanitizeFilename } from "@/lib/validation/schemas";

export interface IProvenanceStorage {
  getProjects(): Promise<ArtworkProject[]>;
  getProject(id: string): Promise<ArtworkProject | null>;
  saveProject(project: ArtworkProject): Promise<void>;
  deleteProject(id: string): Promise<void>;
  clearAllProjects(): Promise<void>;
}

// In-browser IndexedDB configuration with local-first persistence
const DB_NAME = "artproof_db";
const DB_VERSION = 1;
const STORE_PROJECTS = "projects";
const LOCAL_STORAGE_KEY = "artproof_projects_v1";

/**
 * Sanitizes and repairs untrusted or potentially corrupted stored project data.
 * Returns null if the data cannot be salvaged safely.
 */
export function sanitizeProject(record: unknown): ArtworkProject | null {
  if (!record || typeof record !== "object") return null;
  const p = record as Record<string, unknown>;

  if (typeof p.id !== "string" || !p.id.trim()) return null;
  if (typeof p.title !== "string" || !p.title.trim()) return null;

  const id = p.id.trim();
  const title = p.title.trim();
  const artistName =
    typeof p.artistName === "string" && p.artistName.trim()
      ? p.artistName.trim()
      : "Studio Artist";
  const medium =
    typeof p.medium === "string" && p.medium.trim()
      ? p.medium.trim()
      : "Unspecified Medium";
  const yearCreated =
    typeof p.yearCreated === "number" && !isNaN(p.yearCreated)
      ? p.yearCreated
      : new Date().getFullYear();
  const description = typeof p.description === "string" ? p.description : "";
  const createdAt =
    typeof p.createdAt === "string" && p.createdAt
      ? p.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof p.updatedAt === "string" && p.updatedAt ? p.updatedAt : createdAt;

  let primaryArtwork: ArtworkProject["primaryArtwork"];
  const rawArtwork = p.primaryArtwork as Record<string, unknown> | undefined;
  if (
    !rawArtwork ||
    typeof rawArtwork !== "object" ||
    typeof rawArtwork.sha256Hash !== "string"
  ) {
    primaryArtwork = {
      name: `${sanitizeFilename(title, "artwork")}-master.png`,
      mimeType: "image/png",
      sizeBytes: 0,
      sha256Hash: "0000000000000000000000000000000000000000000000000000000000000000",
    };
  } else {
    primaryArtwork = {
      name: sanitizeFilename(
        typeof rawArtwork.name === "string" ? rawArtwork.name : `${title}-master.png`,
        "master-artwork.png"
      ),
      mimeType: typeof rawArtwork.mimeType === "string" ? rawArtwork.mimeType : "image/png",
      sizeBytes: typeof rawArtwork.sizeBytes === "number" ? rawArtwork.sizeBytes : 0,
      sha256Hash: rawArtwork.sha256Hash,
      dataUrl: sanitizeDataUrl(rawArtwork.dataUrl),
    };
  }

  // Ensure events array is resilient and valid
  const rawEvents = Array.isArray(p.events) ? p.events : [];
  const events: TimelineEvent[] = rawEvents
    .filter(
      (ev): ev is TimelineEvent =>
        Boolean(ev && typeof ev === "object" && "id" in ev && "sequence" in ev)
    )
    .map((ev, index) => {
      const rawData =
        ev.data && typeof ev.data === "object"
          ? (ev.data as Record<string, unknown>)
          : {};
      const cleanData: Record<string, unknown> = {
        title: "Recorded Milestone",
        ...rawData,
      };

      if (Array.isArray(cleanData.evidence)) {
        cleanData.evidence = (cleanData.evidence as unknown[]).map((evi) => {
          if (!evi || typeof evi !== "object") return evi;
          const eObj = evi as Record<string, unknown>;
          return {
            ...eObj,
            name: sanitizeFilename(String(eObj.name || "evidence.png"), "evidence.png"),
            fileDataUrl: sanitizeDataUrl(eObj.fileDataUrl),
          };
        });
      }

      return {
        schemaVersion: 1,
        id: String(ev.id || `evt_${index}`),
        projectId: String(ev.projectId || id),
        sequence: typeof ev.sequence === "number" ? ev.sequence : index,
        eventType: ev.eventType || (index === 0 ? "PROJECT_CREATED" : "MILESTONE_LOGGED"),
        timestamp: typeof ev.timestamp === "string" ? ev.timestamp : createdAt,
        data: cleanData as TimelineEvent["data"],
        previousDigest: ev.previousDigest ?? null,
        currentDigest:
          typeof ev.currentDigest === "string"
            ? ev.currentDigest
            : "0000000000000000000000000000000000000000000000000000000000000000",
      };
    });

  // Ensure versions array is resilient and valid
  const rawVersions = Array.isArray(p.versions) ? p.versions : [];
  let versions: ArtworkVersion[] = rawVersions
    .filter(
      (v): v is ArtworkVersion =>
        Boolean(v && typeof v === "object" && "id" in v && "versionLabel" in v)
    )
    .map((v, index) => ({
      id: String(v.id || `ver_${index + 1}`),
      projectId: String(v.projectId || id),
      versionNumber: typeof v.versionNumber === "number" ? v.versionNumber : index + 1,
      versionLabel: String(v.versionLabel || `v${index + 1}.0`),
      createdAt: typeof v.createdAt === "string" ? v.createdAt : createdAt,
      notes: typeof v.notes === "string" ? v.notes : undefined,
      hasFile: Boolean(v.hasFile),
      file:
        v.file && typeof v.file === "object" && typeof v.file.sha256Hash === "string"
          ? {
              name: sanitizeFilename(String(v.file.name || "artwork-version.png"), "artwork-version.png"),
              mimeType: String(v.file.mimeType || "image/png"),
              sizeBytes: typeof v.file.sizeBytes === "number" ? v.file.sizeBytes : 0,
              sha256Hash: v.file.sha256Hash,
              algorithm: "SHA-256" as const,
              dataUrl: sanitizeDataUrl(v.file.dataUrl),
            }
          : undefined,
      associatedEventId: typeof v.associatedEventId === "string" ? v.associatedEventId : undefined,
    }));

  if (versions.length === 0) {
    versions = [
      {
        id: `ver_init_${id}`,
        projectId: id,
        versionNumber: 1,
        versionLabel: "v1.0 Genesis",
        createdAt,
        notes: "Initial registered artwork master",
        hasFile: Boolean(
          primaryArtwork.sha256Hash &&
          primaryArtwork.sha256Hash !== "0000000000000000000000000000000000000000000000000000000000000000"
        ),
        file: {
          name: primaryArtwork.name,
          mimeType: primaryArtwork.mimeType,
          sizeBytes: primaryArtwork.sizeBytes,
          sha256Hash: primaryArtwork.sha256Hash,
          algorithm: "SHA-256",
          dataUrl: primaryArtwork.dataUrl,
        },
        associatedEventId: events[0]?.id,
      },
    ];
  }

  return {
    id,
    title,
    artistName,
    medium,
    yearCreated,
    description,
    createdAt,
    updatedAt,
    primaryArtwork,
    events,
    versions,
    isDemo: Boolean(p.isDemo),
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("IndexedDB database open was blocked."));
    } catch (err) {
      reject(err);
    }
  });
}

function readFromLocalStorage(): ArtworkProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeProject)
      .filter((p): p is ArtworkProject => p !== null);
  } catch {
    return [];
  }
}

function writeToLocalStorage(projects: ArtworkProject[]): void {
  if (typeof window === "undefined") return;
  try {
    const streamlined = projects.map((proj) => {
      const { primaryArtwork, events, ...rest } = proj;
      const cleanArtwork = { ...primaryArtwork };
      if (cleanArtwork.dataUrl && cleanArtwork.dataUrl.length > 50000) {
        delete cleanArtwork.dataUrl;
      }
      const cleanEvents = events.map((ev) => {
        const cleanData = { ...ev.data };
        if (Array.isArray(cleanData.evidence)) {
          cleanData.evidence = cleanData.evidence.map((evi) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { fileDataUrl, ...eRest } = evi;
            return eRest;
          });
        }
        return { ...ev, data: cleanData };
      });
      const cleanVersions = (proj.versions || []).map((ver) => {
        if (ver.file?.dataUrl && ver.file.dataUrl.length > 50000) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { dataUrl, ...restFile } = ver.file;
          return { ...ver, file: restFile };
        }
        return ver;
      });
      return { ...rest, primaryArtwork: cleanArtwork, events: cleanEvents, versions: cleanVersions };
    });
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(streamlined));
  } catch {
    // Quota exceeded or restricted context; silently ignore
  }
}

// Fallback memory cache for SSR/test environments
const memoryCache = new Map<string, ArtworkProject>();

export class IndexedDBStorage implements IProvenanceStorage {
  async getProjects(): Promise<ArtworkProject[]> {
    // 1. Try reading from IndexedDB if in browser
    if (typeof window !== "undefined" && window.indexedDB) {
      try {
        const db = await openDB();
        const dbProjects = await new Promise<ArtworkProject[]>((resolve, reject) => {
          const tx = db.transaction(STORE_PROJECTS, "readonly");
          const store = tx.objectStore(STORE_PROJECTS);
          const request = store.getAll();

          request.onsuccess = () => {
            const raw = request.result;
            if (!Array.isArray(raw)) {
              resolve([]);
              return;
            }
            const valid = raw
              .map(sanitizeProject)
              .filter((p): p is ArtworkProject => p !== null);
            resolve(valid);
          };
          request.onerror = () => reject(request.error);
        });

        if (dbProjects.length > 0) {
          for (const p of dbProjects) {
            memoryCache.set(p.id, p);
          }
          dbProjects.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          return dbProjects;
        }
      } catch (err) {
        console.warn("[ArtProof Storage] IndexedDB read failed, trying backup:", err);
      }
    }

    // 2. Check localStorage backup if in browser
    const localProjects = readFromLocalStorage();
    if (localProjects.length > 0) {
      for (const p of localProjects) {
        if (!memoryCache.has(p.id)) {
          memoryCache.set(p.id, p);
        }
      }
    }

    // 3. Fallback to in-memory cache
    const results = Array.from(memoryCache.values())
      .map(sanitizeProject)
      .filter((p): p is ArtworkProject => p !== null);

    results.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return results;
  }

  async getProject(id: string): Promise<ArtworkProject | null> {
    if (!id || typeof id !== "string") return null;

    const cached = memoryCache.get(id);

    // Try reading from IndexedDB
    if (typeof window !== "undefined" && window.indexedDB) {
      try {
        const db = await openDB();
        const project = await new Promise<ArtworkProject | null>((resolve, reject) => {
          const tx = db.transaction(STORE_PROJECTS, "readonly");
          const store = tx.objectStore(STORE_PROJECTS);
          const request = store.get(id);

          request.onsuccess = () => {
            const sanitized = sanitizeProject(request.result);
            resolve(sanitized);
          };
          request.onerror = () => reject(request.error);
        });

        if (project) {
          memoryCache.set(id, project);
          return project;
        }
      } catch (err) {
        console.warn(`[ArtProof Storage] IndexedDB lookup failed for ${id}:`, err);
      }
    }

    if (cached) {
      return sanitizeProject(cached);
    }

    // Check localStorage fallback
    const localProjects = readFromLocalStorage();
    const found = localProjects.find((p) => p.id === id);
    if (found) {
      memoryCache.set(id, found);
      return found;
    }

    return null;
  }

  async saveProject(project: ArtworkProject): Promise<void> {
    const sanitized = sanitizeProject(project);
    if (!sanitized) {
      throw new Error("Cannot save invalid artwork project.");
    }

    // Protect user-created projects from being overwritten by demo project seeds
    const existing = await this.getProject(sanitized.id);
    if (existing && !existing.isDemo && sanitized.isDemo) {
      console.warn(
        `[ArtProof Storage] Prevented demo project from overwriting user project with id: ${sanitized.id}`
      );
      return;
    }

    // Update in-memory cache
    memoryCache.set(sanitized.id, sanitized);

    // Update localStorage backup
    writeToLocalStorage(Array.from(memoryCache.values()));

    // Persist to IndexedDB if available
    if (typeof window !== "undefined" && window.indexedDB) {
      try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_PROJECTS, "readwrite");
          const store = tx.objectStore(STORE_PROJECTS);
          const request = store.put(sanitized);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (err) {
        console.warn("[ArtProof Storage] IndexedDB write failed, persisted to memory/localStorage:", err);
      }
    }
  }

  async deleteProject(id: string): Promise<void> {
    if (!id || typeof id !== "string") return;

    memoryCache.delete(id);
    writeToLocalStorage(Array.from(memoryCache.values()));

    if (typeof window !== "undefined" && window.indexedDB) {
      try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_PROJECTS, "readwrite");
          const store = tx.objectStore(STORE_PROJECTS);
          const request = store.delete(id);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (err) {
        console.warn(`[ArtProof Storage] IndexedDB delete failed for ${id}:`, err);
      }
    }
  }

  async clearAllProjects(): Promise<void> {
    memoryCache.clear();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }

    if (typeof window !== "undefined" && window.indexedDB) {
      try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_PROJECTS, "readwrite");
          const store = tx.objectStore(STORE_PROJECTS);
          const request = store.clear();

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (err) {
        console.warn("[ArtProof Storage] IndexedDB clear failed:", err);
      }
    }
  }
}

export const storage = new IndexedDBStorage();
