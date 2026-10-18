import { ArtworkProject } from "@/types/provenance";

export interface IProvenanceStorage {
  getProjects(): Promise<ArtworkProject[]>;
  getProject(id: string): Promise<ArtworkProject | null>;
  saveProject(project: ArtworkProject): Promise<void>;
  deleteProject(id: string): Promise<void>;
  clearAllProjects(): Promise<void>;
}

// In-browser IndexedDB implementation with local-first persistence
const DB_NAME = "artproof_db";
const DB_VERSION = 1;
const STORE_PROJECTS = "projects";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Fallback memory cache for SSR/test environments
const memoryCache = new Map<string, ArtworkProject>();

export class IndexedDBStorage implements IProvenanceStorage {
  async getProjects(): Promise<ArtworkProject[]> {
    if (typeof window === "undefined" || !window.indexedDB) {
      return Array.from(memoryCache.values());
    }

    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, "readonly");
        const store = tx.objectStore(STORE_PROJECTS);
        const request = store.getAll();

        request.onsuccess = () => {
          const results = (request.result as ArtworkProject[]) || [];
          // Sort by updatedAt descending
          results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return Array.from(memoryCache.values());
    }
  }

  async getProject(id: string): Promise<ArtworkProject | null> {
    if (typeof window === "undefined" || !window.indexedDB) {
      return memoryCache.get(id) || null;
    }

    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, "readonly");
        const store = tx.objectStore(STORE_PROJECTS);
        const request = store.get(id);

        request.onsuccess = () => resolve((request.result as ArtworkProject) || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return memoryCache.get(id) || null;
    }
  }

  async saveProject(project: ArtworkProject): Promise<void> {
    memoryCache.set(project.id, project);

    if (typeof window === "undefined" || !window.indexedDB) {
      return;
    }

    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, "readwrite");
        const store = tx.objectStore(STORE_PROJECTS);
        const request = store.put(project);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // In-memory fallback already populated
    }
  }

  async deleteProject(id: string): Promise<void> {
    memoryCache.delete(id);

    if (typeof window === "undefined" || !window.indexedDB) {
      return;
    }

    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, "readwrite");
        const store = tx.objectStore(STORE_PROJECTS);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // In-memory fallback already populated
    }
  }

  async clearAllProjects(): Promise<void> {
    memoryCache.clear();

    if (typeof window === "undefined" || !window.indexedDB) {
      return;
    }

    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, "readwrite");
        const store = tx.objectStore(STORE_PROJECTS);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Memory cleared
    }
  }
}

export const storage = new IndexedDBStorage();
