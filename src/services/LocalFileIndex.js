/**
 * Batch 9.1 — LocalFileIndex (Revised)
 * Uses standard file input + IndexedDB blob storage
 * Works on HTTP, HTTPS, all browsers — no File System API needed
 */

const DB_NAME = 'lawbase-files';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

class LocalFileIndex {
  constructor() {
    this._db = null;
    this.supported = true; // always supported
  }

  async _getDb() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => { this._db = e.target.result; resolve(this._db); };
      request.onerror = () => reject(request.error);
    });
  }

  // ── Save file blob to IndexedDB ─────────────────────────
  async saveFile(localId, file) {
    try {
      const db = await this._getDb();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put({
            id: localId,
            name: file.name,
            type: file.type,
            size: file.size,
            data: e.target.result, // base64 dataURL
            savedAt: new Date().toISOString(),
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        };
        reader.readAsDataURL(file);
      });
    } catch { return false; }
  }

  // ── Load file from IndexedDB → object URL ───────────────
  async openFile(localId) {
    try {
      const db = await this._getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(localId);
        req.onsuccess = () => {
          const rec = req.result;
          if (!rec) return resolve(null);
          resolve({
            url: rec.data,   // dataURL — works for img src + window.open
            name: rec.name,
            type: rec.type,
            size: rec.size,
          });
        };
        req.onerror = () => resolve(null);
      });
    } catch { return null; }
  }

  // ── Delete from IndexedDB ───────────────────────────────
  async removeFile(localId) {
    try {
      const db = await this._getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(localId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch { return false; }
  }

  // ── Open file picker via hidden input ───────────────────
  pickFile(accept = '*/*') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e) => resolve(e.target.files?.[0] || null);
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}

export default new LocalFileIndex();
