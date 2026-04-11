/**
 * Batch 16.2 — CloudSyncService
 * Handles Firebase Storage upload for Pro/Team plan users
 * Called after local save to sync files to cloud
 */
import subscriptionManager from '@/services/SubscriptionManager.js';

class CloudSyncService {
  constructor() {
    this._queue = [];
    this._running = false;
    this._progress = {};
    this._listeners = new Set();
  }

  // ── Subscribe to progress updates ──────────────────────
  onProgress(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _notify() {
    this._listeners.forEach(fn => fn({ ...this._progress }));
  }

  // ── Enqueue a file for cloud upload ────────────────────
  async enqueue(workspaceId, caseId, attachmentId, localId) {
    if (!subscriptionManager.hasFeature('cloudSync')) return;
    if (!workspaceId || !caseId || !attachmentId || !localId) return;

    this._queue.push({ workspaceId, caseId, attachmentId, localId });
    this._progress[attachmentId] = { status: 'queued', pct: 0 };
    this._notify();

    if (!this._running) this._processQueue();
  }

  // ── Process upload queue ────────────────────────────────
  async _processQueue() {
    this._running = true;
    while (this._queue.length > 0) {
      const item = this._queue.shift();
      await this._uploadOne(item);
    }
    this._running = false;
  }

  async _uploadOne({ workspaceId, caseId, attachmentId, localId }) {
    try {
      this._progress[attachmentId] = { status: 'uploading', pct: 0 };
      this._notify();

      // Get file from IndexedDB
      const { default: lfi } = await import('@/services/LocalFileIndex.js');
      const result = await lfi.openFile(localId);
      if (!result) throw new Error('Local file not found');

      // Convert dataURL to Blob
      const response = await fetch(result.url);
      const blob = await response.blob();
      const file = new File([blob], result.name, { type: result.type });

      // Upload to Firebase Storage
      const { storage: fbStorage } = await import('@/config/firebase.js');
      const path = `workspaces/${workspaceId}/cases/${caseId}/${attachmentId}`;
      const ref = fbStorage.ref(path);

      await new Promise((resolve, reject) => {
        const task = ref.put(file);
        task.on('state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            this._progress[attachmentId] = { status: 'uploading', pct };
            this._notify();
          },
          reject,
          async () => {
            const downloadUrl = await task.snapshot.ref.getDownloadURL();
            this._progress[attachmentId] = { status: 'done', pct: 100, downloadUrl };
            this._notify();
            resolve(downloadUrl);
          }
        );
      });

    } catch (error) {
      console.error('CloudSyncService upload error:', error);
      this._progress[attachmentId] = { status: 'error', pct: 0, error: error.message };
      this._notify();
    }
  }

  // ── Get progress for an attachment ─────────────────────
  getProgress(attachmentId) {
    return this._progress[attachmentId] || null;
  }

  // ── Delete from Firebase Storage ───────────────────────
  async deleteFromCloud(workspaceId, caseId, attachmentId) {
    if (!subscriptionManager.hasFeature('cloudSync')) return;
    try {
      const { storage: fbStorage } = await import('@/config/firebase.js');
      const path = `workspaces/${workspaceId}/cases/${caseId}/${attachmentId}`;
      await fbStorage.ref(path).delete();
    } catch (error) {
      if (error.code !== 'storage/object-not-found') {
        console.error('CloudSyncService delete error:', error);
      }
    }
  }

  // ── Check if file exists in cloud ──────────────────────
  async existsInCloud(workspaceId, caseId, attachmentId) {
    try {
      const { storage: fbStorage } = await import('@/config/firebase.js');
      const path = `workspaces/${workspaceId}/cases/${caseId}/${attachmentId}`;
      await fbStorage.ref(path).getDownloadURL();
      return true;
    } catch { return false; }
  }
}

export default new CloudSyncService();
