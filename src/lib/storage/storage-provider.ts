import { ArtworkProject, ArtworkVersion, TimelineEvent } from "@/types/provenance";
import {
  manifestImportSchema,
  projectInputSchema,
  sanitizeDataUrl,
  sanitizeFilename,
} from "@/lib/validation/schemas";

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
 * Builds the canonical initial v1.0 Genesis version record linked to the genesis event.
 */
export function createGenesisVersion(params: {
  projectId: string;
  createdAt: string;
  primaryArtwork: ArtworkProject["primaryArtwork"];
  genesisEventId?: string;
  hasFile?: boolean;
}): ArtworkVersion {
  const hasValidHash = Boolean(
    params.primaryArtwork.sha256Hash &&
      params.primaryArtwork.sha256Hash !==
        "0000000000000000000000000000000000000000000000000000000000000000"
  );
  return {
    id: `ver_init_${params.projectId}`,
    projectId: params.projectId,
    versionNumber: 1,
    versionLabel: "v1.0 Genesis",
    createdAt: params.createdAt,
    notes: "Initial registered artwork master",
    hasFile: params.hasFile ?? hasValidHash,
    file: {
      name: params.primaryArtwork.name,
      mimeType: params.primaryArtwork.mimeType,
      sizeBytes: params.primaryArtwork.sizeBytes,
      sha256Hash: params.primaryArtwork.sha256Hash,
      algorithm: "SHA-256",
      dataUrl: params.primaryArtwork.dataUrl,
    },
    associatedEventId: params.genesisEventId,
  };
}

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

  // Ensure versions array is resilient, deduplicated, and valid
  const rawVersions = Array.isArray(p.versions) ? p.versions : [];
  const seenVersionIds = new Set<string>();
  let versions: ArtworkVersion[] = [];

  rawVersions.forEach((rawVer, index) => {
    if (!rawVer || typeof rawVer !== "object" || !("id" in rawVer) || !("versionLabel" in rawVer)) {
      return;
    }
    const v = rawVer as ArtworkVersion;
    const versionId = String(v.id || `ver_${index + 1}`);
    if (seenVersionIds.has(versionId)) {
      return;
    }
    seenVersionIds.add(versionId);

    const sanitizedFile =
      v.file && typeof v.file === "object" && typeof v.file.sha256Hash === "string"
        ? {
            name: sanitizeFilename(String(v.file.name || "artwork-version.png"), "artwork-version.png"),
            mimeType: String(v.file.mimeType || "image/png"),
            sizeBytes: typeof v.file.sizeBytes === "number" ? v.file.sizeBytes : 0,
            sha256Hash: v.file.sha256Hash,
            algorithm: "SHA-256" as const,
            dataUrl: sanitizeDataUrl(v.file.dataUrl),
          }
        : undefined;

    const topLevelDataUrl = sanitizeDataUrl(v.dataUrl);

    const sanitizedVersion: ArtworkVersion = {
      id: versionId,
      projectId: String(v.projectId || id),
      versionNumber: typeof v.versionNumber === "number" ? v.versionNumber : versions.length + 1,
      versionLabel: String(v.versionLabel || `v${versions.length + 1}.0`),
      createdAt: typeof v.createdAt === "string" ? v.createdAt : createdAt,
      notes: typeof v.notes === "string" ? v.notes : undefined,
      hasFile: Boolean(v.hasFile),
      file: sanitizedFile,
      associatedEventId: typeof v.associatedEventId === "string" ? v.associatedEventId : undefined,
      ...(typeof v.sha256Hash === "string" ? { sha256Hash: v.sha256Hash } : {}),
      ...(typeof v.fileName === "string"
        ? { fileName: sanitizeFilename(v.fileName, "artwork-version.png") }
        : {}),
      ...(typeof v.fileSizeBytes === "number" ? { fileSizeBytes: v.fileSizeBytes } : {}),
      ...(typeof v.mimeType === "string" ? { mimeType: v.mimeType } : {}),
      ...(typeof v.isArchivalFinal === "boolean" ? { isArchivalFinal: v.isArchivalFinal } : {}),
      ...(typeof v.recordedAt === "string" ? { recordedAt: v.recordedAt } : {}),
      ...(topLevelDataUrl !== undefined ? { dataUrl: topLevelDataUrl } : {}),
    };

    versions.push(sanitizedVersion);
  });

  if (versions.length === 0) {
    versions = [
      createGenesisVersion({
        projectId: id,
        createdAt,
        primaryArtwork,
        genesisEventId: events[0]?.id,
      }),
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

const IDB_TIMEOUT_MS = 1500;

let cachedDb: IDBDatabase | null = null;
let cachedIdbFactory: IDBFactory | null = null;
let pendingOpenPromise: Promise<IDBDatabase> | null = null;

function resetCachedDb(): void {
  if (cachedDb) {
    try {
      cachedDb.close();
    } catch {
      // Ignore close errors
    }
  }
  cachedDb = null;
  cachedIdbFactory = null;
  pendingOpenPromise = null;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = IDB_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("IndexedDB operation timed out."));
      }
    }, timeoutMs);

    promise.then(
      (val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      },
      (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    );
  });
}

function openDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }
  if (cachedIdbFactory && cachedIdbFactory !== window.indexedDB) {
    resetCachedDb();
  }
  if (cachedDb) {
    return Promise.resolve(cachedDb);
  }
  if (pendingOpenPromise) {
    return pendingOpenPromise;
  }

  const currentFactory = window.indexedDB;
  const openPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = currentFactory.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        cachedDb = db;
        cachedIdbFactory = currentFactory;
        db.onversionchange = () => {
          resetCachedDb();
        };
        db.onclose = () => {
          cachedDb = null;
          pendingOpenPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        pendingOpenPromise = null;
        reject(request.error || new Error("IndexedDB open failed."));
      };
      request.onblocked = () => {
        pendingOpenPromise = null;
        reject(new Error("IndexedDB database open was blocked."));
      };
    } catch (err) {
      pendingOpenPromise = null;
      reject(err);
    }
  });

  pendingOpenPromise = withTimeout(openPromise).catch((err) => {
    pendingOpenPromise = null;
    throw err;
  });

  return pendingOpenPromise;
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

/**
 * Produces a non-mutating copy of a project suitable for the localStorage fallback
 * by stripping large data URLs (> maxDataUrlLength) from primaryArtwork, events, and versions
 * (both top-level ver.dataUrl and nested ver.file.dataUrl) while preserving all other metadata.
 */
export function streamlineProjectForLocalStorage(
  proj: ArtworkProject,
  maxDataUrlLength = 50000
): ArtworkProject {
  const { primaryArtwork, events, versions, ...rest } = proj;
  const cleanArtwork = { ...primaryArtwork };
  if (cleanArtwork.dataUrl && cleanArtwork.dataUrl.length > maxDataUrlLength) {
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
  const cleanVersions = (versions || []).map((ver) => {
    const cleanVer: ArtworkVersion = { ...ver };
    if (cleanVer.dataUrl && cleanVer.dataUrl.length > maxDataUrlLength) {
      delete cleanVer.dataUrl;
    }
    if (cleanVer.file) {
      const cleanFile = { ...cleanVer.file };
      if (cleanFile.dataUrl && cleanFile.dataUrl.length > maxDataUrlLength) {
        delete cleanFile.dataUrl;
      }
      cleanVer.file = cleanFile;
    }
    return cleanVer;
  });
  return {
    ...rest,
    primaryArtwork: cleanArtwork,
    events: cleanEvents,
    versions: cleanVersions,
  };
}

function writeToLocalStorage(projects: ArtworkProject[]): void {
  if (typeof window === "undefined") return;
  try {
    const streamlined = projects.map((proj) => streamlineProjectForLocalStorage(proj, 50000));
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(streamlined));
  } catch {
    // Quota exceeded with small previews; retry stripping all dataUrl previews to preserve core metadata
    try {
      const minimal = projects.map((proj) => streamlineProjectForLocalStorage(proj, 0));
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      // Quota still exceeded or restricted context; safely ignore
    }
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
        const dbProjects = await withTimeout(
          new Promise<ArtworkProject[]>((resolve, reject) => {
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
            request.onerror = () => reject(request.error || new Error("IndexedDB getAll failed."));
            tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed."));
            tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted."));
          })
        );

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
        resetCachedDb();
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
        const project = await withTimeout(
          new Promise<ArtworkProject | null>((resolve, reject) => {
            const tx = db.transaction(STORE_PROJECTS, "readonly");
            const store = tx.objectStore(STORE_PROJECTS);
            const request = store.get(id);

            request.onsuccess = () => {
              const sanitized = sanitizeProject(request.result);
              resolve(sanitized);
            };
            request.onerror = () => reject(request.error || new Error("IndexedDB get failed."));
            tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed."));
            tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted."));
          })
        );

        if (project) {
          memoryCache.set(id, project);
          return project;
        }
      } catch (err) {
        resetCachedDb();
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
        await withTimeout(
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_PROJECTS, "readwrite");
            const store = tx.objectStore(STORE_PROJECTS);
            const request = store.put(sanitized);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error || new Error("IndexedDB put failed."));
            tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed."));
            tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted."));
          })
        );
      } catch (err) {
        resetCachedDb();
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
        await withTimeout(
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_PROJECTS, "readwrite");
            const store = tx.objectStore(STORE_PROJECTS);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error || new Error("IndexedDB delete failed."));
            tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed."));
            tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted."));
          })
        );
      } catch (err) {
        resetCachedDb();
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
        await withTimeout(
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_PROJECTS, "readwrite");
            const store = tx.objectStore(STORE_PROJECTS);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error || new Error("IndexedDB clear failed."));
            tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed."));
            tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted."));
          })
        );
      } catch (err) {
        resetCachedDb();
        console.warn("[ArtProof Storage] IndexedDB clear failed:", err);
      }
    }
  }
}

export const storage = new IndexedDBStorage();

export interface BackupImportResult {
  success: boolean;
  importedCount: number;
  error?: string;
}

/**
 * Validates and atomically imports a studio backup JSON or parsed object.
 * Pre-validates every record with existing Zod schemas and sanitizeProject before
 * persisting any record, preventing partial imports and protecting unrelated user projects.
 */
export async function importStudioBackup(
  rawBackup: unknown,
  targetStorage: IProvenanceStorage = storage
): Promise<BackupImportResult> {
  let parsed: unknown = rawBackup;

  if (typeof rawBackup === "string") {
    try {
      parsed = JSON.parse(rawBackup);
    } catch {
      return {
        success: false,
        importedCount: 0,
        error: "Invalid backup file: failed to parse JSON.",
      };
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      success: false,
      importedCount: 0,
      error: "Invalid backup file: root value must be a JSON object.",
    };
  }

  const root = parsed as Record<string, unknown>;

  if (root.app !== undefined && root.app !== "ArtProof") {
    return {
      success: false,
      importedCount: 0,
      error: "Invalid backup file: unrecognized application identifier.",
    };
  }

  if (!Array.isArray(root.projects)) {
    return {
      success: false,
      importedCount: 0,
      error: "Invalid backup file: 'projects' array not found.",
    };
  }

  if (root.projects.length === 0) {
    return {
      success: false,
      importedCount: 0,
      error: "Invalid backup file: 'projects' array is empty.",
    };
  }

  const primaryArtworkSchema = manifestImportSchema.shape.project.shape.primaryArtwork;
  const eventChainSchema = manifestImportSchema.shape.eventChain;

  const validatedProjects: ArtworkProject[] = [];

  for (let i = 0; i < root.projects.length; i++) {
    const rawItem = root.projects[i];
    const recordLabel = `Record #${i + 1}`;

    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      return {
        success: false,
        importedCount: 0,
        error: `Malformed backup at ${recordLabel}: project entry must be an object.`,
      };
    }

    const p = rawItem as Record<string, unknown>;

    if (typeof p.id !== "string" || !p.id.trim()) {
      return {
        success: false,
        importedCount: 0,
        error: `Malformed backup at ${recordLabel}: valid project ID is required.`,
      };
    }

    const metaResult = projectInputSchema.safeParse({
      title: p.title,
      artistName: p.artistName,
      medium: p.medium,
      yearCreated: p.yearCreated,
      description: typeof p.description === "string" ? p.description : "",
    });

    if (!metaResult.success) {
      const firstIssue = metaResult.error.issues[0];
      return {
        success: false,
        importedCount: 0,
        error: `Malformed backup at ${recordLabel}: ${firstIssue?.message || "invalid project metadata"}.`,
      };
    }

    const artworkResult = primaryArtworkSchema.safeParse(p.primaryArtwork);
    if (!artworkResult.success) {
      return {
        success: false,
        importedCount: 0,
        error: `Malformed backup at ${recordLabel}: invalid primaryArtwork record or SHA-256 digest.`,
      };
    }

    const eventsResult = eventChainSchema.safeParse(p.events);
    if (!eventsResult.success) {
      return {
        success: false,
        importedCount: 0,
        error: `Malformed backup at ${recordLabel}: invalid timeline events array.`,
      };
    }

    if (p.versions !== undefined) {
      if (
        !Array.isArray(p.versions) ||
        p.versions.some(
          (v) =>
            !v ||
            typeof v !== "object" ||
            typeof (v as Record<string, unknown>).id !== "string" ||
            !String((v as Record<string, unknown>).id).trim() ||
            typeof (v as Record<string, unknown>).versionLabel !== "string" ||
            !String((v as Record<string, unknown>).versionLabel).trim()
        )
      ) {
        return {
          success: false,
          importedCount: 0,
          error: `Malformed backup at ${recordLabel}: invalid versions array.`,
        };
      }
    }

    const sanitized = sanitizeProject(p);
    if (!sanitized) {
      return {
        success: false,
        importedCount: 0,
        error: `Malformed backup at ${recordLabel}: project failed sanitization.`,
      };
    }

    // Protect unrelated existing user-created projects from accidental ID collision overwrite
    const existing = await targetStorage.getProject(sanitized.id);
    if (existing && !existing.isDemo) {
      if (sanitized.isDemo) {
        // Demo record cannot overwrite a user-created project; skip saving it
        continue;
      }
      if (existing.createdAt !== sanitized.createdAt || existing.title !== sanitized.title) {
        return {
          success: false,
          importedCount: 0,
          error: `Import rejected at ${recordLabel}: project ID "${sanitized.id}" conflicts with an existing unrelated project ("${existing.title}").`,
        };
      }
    }

    validatedProjects.push(sanitized);
  }

  for (const proj of validatedProjects) {
    await targetStorage.saveProject(proj);
  }

  return {
    success: true,
    importedCount: validatedProjects.length,
  };
}
