/**
 * Open a session roll file using a centralized download URL from Storage.js
 * @param {string} date
 * @param {string} workspaceId
 * @param {object} storage - Storage.js instance
 * @returns {Promise<boolean>}
 */
export async function openSessionRoll(date, workspaceId, storage) {
  if (!date || !workspaceId) return false;
  try {
    const docs = await storage.listArchiveDocuments(workspaceId);
    const linked = docs.find((d) => d.linkedSessionDate === date || d.sessionDate === date);
    if (linked?.fileUrl && linked?.caseId && linked?.id) {
      // Use the new centralized method for download URL if possible
      try {
        const url = await storage.getAttachmentDownloadUrl(workspaceId, linked.caseId, linked.id);
        window.open(url, '_blank');
        return true;
      } catch (e) {
        // fallback to fileUrl if download URL fails
        window.open(linked.fileUrl, '_blank');
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
