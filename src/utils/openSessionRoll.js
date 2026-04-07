export async function openSessionRoll(date, workspaceId, storage) {
  if (!date || !workspaceId) return false;

  try {
    const docs = await storage.listArchiveDocuments(workspaceId);
    const linked = docs.find((d) => d.linkedSessionDate === date || d.sessionDate === date);

    if (linked?.fileUrl) {
      window.open(linked.fileUrl, '_blank');
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
