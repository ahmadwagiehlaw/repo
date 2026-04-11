/**
 * Batch 5.1 — AttachmentService
 * Offline-First attachment strategy
 * FREE: URL-based (existing) + IndexedDB for camera uploads
 * PRO: Firebase Storage upload (added in Batch 5.3)
 */

const DB_NAME = 'lawbase-attachments';
const DB_VERSION = 1;
const STORE_NAME = 'files';

class AttachmentService {
  constructor() {
    this._db = null;
  }

  // ── IndexedDB Init ──────────────────────────────────────
  async _getDb() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (event) => {
        this._db = event.target.result;
        resolve(this._db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Save file to IndexedDB (for offline/camera) ─────────
  async saveLocal(id, file) {
    try {
      const buffer = await file.arrayBuffer();
      const db = await this._getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put({
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          buffer,
          savedAt: new Date().toISOString(),
        });
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('AttachmentService.saveLocal error:', error);
      return false;
    }
  }

  // ── Load file from IndexedDB ────────────────────────────
  async loadLocal(id) {
    try {
      const db = await this._getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => {
          const record = request.result;
          if (!record) return resolve(null);
          const blob = new Blob([record.buffer], { type: record.type });
          resolve({
            url: URL.createObjectURL(blob),
            name: record.name,
            type: record.type,
            size: record.size,
          });
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('AttachmentService.loadLocal error:', error);
      return null;
    }
  }

  // ── Delete from IndexedDB ───────────────────────────────
  async deleteLocal(id) {
    try {
      const db = await this._getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  // ── Detect attachment type from URL ─────────────────────
  detectKind(url = '') {
    const lower = url.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/.test(lower)) return 'image';
    if (/\.(pdf)(\?|$)/.test(lower)) return 'pdf';
    if (/\.(doc|docx)(\?|$)/.test(lower)) return 'word';
    if (/\.(xls|xlsx)(\?|$)/.test(lower)) return 'excel';
    if (/drive\.google\.com/.test(lower)) return 'drive';
    if (/dropbox\.com/.test(lower)) return 'dropbox';
    return 'file';
  }

  // ── Build attachment record (for Firestore) ─────────────
  buildRecord({ url, title, localId = null, source = 'url' }) {
    return {
      id: localId || `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: String(url || ''),
      title: String(title || ''),
      kind: this.detectKind(url),
      source,
      addedAt: new Date().toISOString(),
      ...(localId ? { localId } : {}),
    };
  }
}

export default new AttachmentService();
