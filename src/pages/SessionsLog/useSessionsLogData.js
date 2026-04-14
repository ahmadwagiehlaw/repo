import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import storage from '@/data/Storage.js';

export function useSessionsLogData() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = String(currentWorkspace?.id || '').trim();

  const [rolls, setRolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchDate, setSearchDate] = useState('');
  const [activeLogFilter, setActiveLogFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openRolls, setOpenRolls] = useState(new Set());

  const loadRolls = useCallback(async () => {
    if (!workspaceId) { setRolls([]); return; }
    setLoading(true);
    setError(null);
    try {
      const docs = await storage.listArchiveDocuments(workspaceId);
      const sessionRolls = docs
        .filter((doc) => doc.type === 'session_roll')
        .sort((a, b) => String(b.sessionDate || '').localeCompare(String(a.sessionDate || '')));
      setRolls(sessionRolls);
    } catch (err) {
      console.error('[useSessionsLogData]', err);
      setError(err);
      setRolls([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { loadRolls(); }, [loadRolls]);

  const toggleRoll = useCallback((rollId) => {
    setOpenRolls((prev) => {
      const next = new Set(prev);
      next.has(rollId) ? next.delete(rollId) : next.add(rollId);
      return next;
    });
  }, []);

  const filteredRolls = rolls.filter((roll) => {
    const date = String(roll.sessionDate || '');
    if (searchDate) return date.includes(searchDate);

    if (activeLogFilter === 'thisMonth') {
      const now = new Date();
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return date.startsWith(prefix);
    }
    if (activeLogFilter === 'lastMonth') {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return date.startsWith(prefix);
    }
    if (activeLogFilter === 'lastWeek') {
      const now = new Date();
      const end = now.toISOString().split('T')[0];
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return date >= start.toISOString().split('T')[0] && date <= end;
    }
    if (activeLogFilter === 'range' && dateFrom) {
      if (dateTo) return date >= dateFrom && date <= dateTo;
      return date >= dateFrom;
    }
    return true;
  });

  return {
    workspaceId,
    rolls,
    filteredRolls,
    loading,
    error,
    searchDate,
    setSearchDate,
    openRolls,
    toggleRoll,
    loadRolls,
    activeLogFilter,
    setActiveLogFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  };
}
