import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { db } from '@/config/firebase.js';
import storage from '@/data/Storage.js';
import RulesOrchestrator from '@/engine/RulesOrchestrator.js';
import { LAWBASE_EVENTS, CASE_FLAGS_DEFAULT } from '@/core/Constants.js';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const CaseContext = createContext(undefined);

const initialState = {
  cases: [],
  currentCase: null,
  loading: false,
  error: null,
  filters: { active: 'all' },
};

function caseReducer(state, action) {
  switch (action.type) {
    case 'SET_CASES':
      return {
        ...state,
        cases: Array.isArray(action.payload) ? action.payload : [],
      };
    case 'SET_CURRENT_CASE':
      return {
        ...state,
        currentCase: action.payload || null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: Boolean(action.payload),
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload || null,
      };
    case 'UPDATE_CASE_FLAGS': {
      const { caseId, flags } = action.payload || {};
      if (!caseId || !flags) return state;

      const nextCases = state.cases.map((item) => (
        String(item?.id || '') === String(caseId)
          ? { ...item, flags: { ...CASE_FLAGS_DEFAULT, ...(item.flags || {}), ...flags } }
          : item
      ));

      const nextCurrentCase = String(state.currentCase?.id || '') === String(caseId)
        ? { ...state.currentCase, flags: { ...CASE_FLAGS_DEFAULT, ...(state.currentCase?.flags || {}), ...flags } }
        : state.currentCase;

      return {
        ...state,
        cases: nextCases,
        currentCase: nextCurrentCase,
      };
    }
    case 'SET_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
      };
    default:
      return state;
  }
}

export function CaseProvider({ children }) {
  const [state, dispatch] = useReducer(caseReducer, initialState);
  const { currentWorkspace } = useWorkspace();

  const rulesOrchestrator = useMemo(() => {
    if (!db) return null;
    return new RulesOrchestrator({ storage });
  }, []);

  const loadCases = useCallback(async (workspaceId, limit = 1000) => {
    if (!workspaceId) {
      dispatch({ type: 'SET_CASES', payload: [] });
      return [];
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const cases = await storage.listCases(workspaceId, { limit });
      dispatch({ type: 'SET_CASES', payload: cases });
      return cases;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    const workspaceId = String(currentWorkspace?.id || '').trim();
    console.log('currentWorkspace:', currentWorkspace);

    if (!workspaceId) {
      dispatch({ type: 'SET_CASES', payload: [] });
      return;
    }

    loadCases(workspaceId, 1000).then((cases) => {
      console.log('cases after load:', cases);
    }).catch(() => {});
  }, [currentWorkspace, loadCases]);

  const getCase = useCallback(async (workspaceId, caseId) => {
    if (!workspaceId || !caseId) {
      dispatch({ type: 'SET_CURRENT_CASE', payload: null });
      return null;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const caseData = await storage.getCase(workspaceId, caseId);
      dispatch({ type: 'SET_CURRENT_CASE', payload: caseData });
      return caseData;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const updateCase = useCallback(async (workspaceId, caseId, updates = {}) => {
    if (!workspaceId || !caseId) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await storage.updateCase(workspaceId, caseId, updates);

      const currentCaseId = String(state.currentCase?.id || '');
      const nextCaseId = String(caseId);
      const mergedCurrent = currentCaseId === nextCaseId
        ? { ...state.currentCase, ...updates }
        : state.currentCase;

      dispatch({
        type: 'SET_CASES',
        payload: state.cases.map((item) => (
          String(item?.id || '') === nextCaseId ? { ...item, ...updates } : item
        )),
      });
      if (mergedCurrent) {
        dispatch({ type: 'SET_CURRENT_CASE', payload: mergedCurrent });
      }

      window.dispatchEvent(new CustomEvent(LAWBASE_EVENTS.CASE_UPDATED, {
        detail: {
          workspaceId,
          caseId,
          updates,
        },
      }));
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.cases, state.currentCase]);

  const updateFlags = useCallback(async (workspaceId, caseId, flag, value) => {
    if (!workspaceId || !caseId || !flag) return null;

    const existing = await storage.getCase(workspaceId, caseId);
    if (!existing) return null;

    const nextFlags = {
      ...CASE_FLAGS_DEFAULT,
      ...(existing.flags || {}),
      [flag]: Boolean(value),
    };

    await storage.updateCase(workspaceId, caseId, { flags: nextFlags });
    dispatch({ type: 'UPDATE_CASE_FLAGS', payload: { caseId, flags: nextFlags } });

    window.dispatchEvent(new CustomEvent(LAWBASE_EVENTS.FLAGS_UPDATED, {
      detail: {
        workspaceId,
        caseId,
        flags: nextFlags,
      },
    }));

    return nextFlags;
  }, []);

  const evaluateRules = useCallback(async (workspaceId, caseData) => {
    if (!workspaceId || !caseData?.id || !rulesOrchestrator) {
      return null;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await rulesOrchestrator.evaluateAndPersistCase(workspaceId, caseData);
      const refreshed = await storage.getCase(workspaceId, caseData.id);

      if (refreshed) {
        dispatch({
          type: 'SET_CASES',
          payload: state.cases.map((item) => (
            String(item?.id || '') === String(refreshed.id || '') ? refreshed : item
          )),
        });
        dispatch({ type: 'SET_CURRENT_CASE', payload: refreshed });
      }

      window.dispatchEvent(new CustomEvent(LAWBASE_EVENTS.CASE_UPDATED, {
        detail: {
          workspaceId,
          caseId: caseData.id,
          updates: result?.evaluation?.updates || {},
          source: 'rules_engine',
        },
      }));

      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [rulesOrchestrator, state.cases]);

  useEffect(() => {
    const handleFlagsUpdated = async (event) => {
      const caseId = event?.detail?.caseId;
      const flags = event?.detail?.flags;
      const workspaceId = event?.detail?.workspaceId;
      if (!caseId) return;

      if (flags && typeof flags === 'object') {
        dispatch({ type: 'UPDATE_CASE_FLAGS', payload: { caseId, flags } });
        return;
      }

      if (!workspaceId) return;

      try {
        const latest = await storage.getCase(workspaceId, caseId);
        if (!latest) return;

        dispatch({
          type: 'SET_CASES',
          payload: state.cases.map((item) => (
            String(item?.id || '') === String(caseId) ? latest : item
          )),
        });

        if (String(state.currentCase?.id || '') === String(caseId)) {
          dispatch({ type: 'SET_CURRENT_CASE', payload: latest });
        }
      } catch {
        // no-op
      }
    };

    window.addEventListener(LAWBASE_EVENTS.FLAGS_UPDATED, handleFlagsUpdated);
    return () => {
      window.removeEventListener(LAWBASE_EVENTS.FLAGS_UPDATED, handleFlagsUpdated);
    };
  }, [state.cases, state.currentCase]);

  useEffect(() => {
    const handleWorkspaceChanged = () => {
      dispatch({ type: 'SET_CASES', payload: [] });
      dispatch({ type: 'SET_CURRENT_CASE', payload: null });
    };

    window.addEventListener(LAWBASE_EVENTS.WORKSPACE_CHANGED, handleWorkspaceChanged);
    return () => {
      window.removeEventListener(LAWBASE_EVENTS.WORKSPACE_CHANGED, handleWorkspaceChanged);
    };
  }, []);

  const filteredCases = useMemo(() => {
    const activeFilter = String(state.filters?.active || 'all');
    if (activeFilter === 'all') return state.cases;
    return state.cases.filter((item) => String(item?.status || '') === activeFilter);
  }, [state.cases, state.filters]);

  const value = useMemo(() => ({
    cases: state.cases,
    currentCase: state.currentCase,
    loading: state.loading,
    error: state.error,
    filters: state.filters,
    filteredCases,
    loadCases,
    getCase,
    updateCase,
    updateFlags,
    evaluateRules,
    setFilter: (active) => dispatch({ type: 'SET_FILTER', payload: { active } }),
  }), [
    state.cases,
    state.currentCase,
    state.loading,
    state.error,
    state.filters,
    filteredCases,
    loadCases,
    getCase,
    updateCase,
    updateFlags,
    evaluateRules,
  ]);

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useCases() {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error('useCases must be used within a CaseProvider');
  }
  return context;
}
