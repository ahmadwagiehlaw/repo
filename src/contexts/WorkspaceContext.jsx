import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { db } from '@/config/firebase.js';
import storage, { initStorage } from '@/data/Storage.js';
import { getWorkspacePlanFeatures, LAWBASE_EVENTS } from '@/core/Constants.js';
import { useAuth } from '@/contexts/AuthContext';
import subscriptionManager from '@/services/SubscriptionManager.js';

const WorkspaceContext = createContext(undefined);

const initialState = {
  currentWorkspace: null,
  workspaces: [],
  loading: false,
  bootstrapping: false,
  membershipLoading: false,
  currentMembership: null,
  error: null,
  workspaceOptions: {},
};

function workspaceReducer(state, action) {
  switch (action.type) {
    case 'WORKSPACE_LOADING':
      return {
        ...state,
        loading: true,
        bootstrapping: Boolean(action.payload?.bootstrapping),
        error: null,
      };
    case 'WORKSPACE_ERROR':
      return {
        ...state,
        loading: false,
        bootstrapping: false,
        membershipLoading: false,
        error: action.payload,
      };
    case 'WORKSPACES_LOADED':
      return {
        ...state,
        loading: false,
        bootstrapping: false,
        membershipLoading: false,
        currentMembership: null,
        error: null,
        workspaces: action.payload.workspaces,
        currentWorkspace: action.payload.currentWorkspace,
      };
    case 'WORKSPACE_SWITCHED':
      return {
        ...state,
        loading: false,
        bootstrapping: false,
        membershipLoading: false,
        currentMembership: null,
        error: null,
        currentWorkspace: action.payload,
        workspaceOptions: {},
      };
    case 'MEMBERSHIP_LOADING':
      return {
        ...state,
        membershipLoading: true,
      };
    case 'MEMBERSHIP_LOADED':
      return {
        ...state,
        membershipLoading: false,
        currentMembership: action.payload,
      };
    case 'WORKSPACE_OPTION_CACHED':
      return {
        ...state,
        workspaceOptions: {
          ...state.workspaceOptions,
          [action.payload.optionType]: action.payload.items,
        },
      };
    case 'WORKSPACE_OPTIONS_CLEARED':
      return {
        ...state,
        workspaceOptions: {},
      };
    default:
      return state;
  }
}

export function WorkspaceProvider({ children }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const { user } = useAuth();

  useEffect(() => {
    initStorage(db);
  }, []);

  const loadUserWorkspaces = useCallback(async (authUser) => {
    const userId = String(authUser?.uid || authUser || '').trim();
    if (!userId) {
      dispatch({
        type: 'WORKSPACES_LOADED',
        payload: { workspaces: [], currentWorkspace: null },
      });
      return [];
    }

    dispatch({ type: 'WORKSPACE_LOADING', payload: { bootstrapping: false } });

    try {
      const userProfile = await storage.getUserProfile(userId);
      const primaryWorkspaceId = String(userProfile?.primaryWorkspaceId || '').trim();
      const workspaceIds = Array.isArray(userProfile?.workspaceIds) ? userProfile.workspaceIds : [];
      const workspacesData = await Promise.all(
        workspaceIds.map((id) => storage.getWorkspace(id))
      );
      let workspaces = workspacesData.filter(Boolean);
      const hasValidPrimary = workspaces.some(
        (workspace) => String(workspace?.id || '') === primaryWorkspaceId
      );
      let currentWorkspace = workspaces.find(
        (workspace) => String(workspace?.id || '') === primaryWorkspaceId
      ) || workspaces[0] || null;

      const needsBootstrap = (
        !userProfile
        || workspaceIds.length === 0
        || !primaryWorkspaceId
        || !hasValidPrimary
        || !currentWorkspace
      );

      if (needsBootstrap) {
        dispatch({ type: 'WORKSPACE_LOADING', payload: { bootstrapping: true } });
        const bootstrapped = await storage.bootstrapUserWorkspace(authUser);
        const singleWorkspace = bootstrapped?.currentWorkspace || null;
        workspaces = singleWorkspace ? [singleWorkspace] : [];
        currentWorkspace = singleWorkspace;
      }

      if (workspaces.length > 1) {
        const primary = workspaces.find(
          (workspace) => String(workspace?.id || '') === primaryWorkspaceId
        ) || workspaces[0];
        workspaces = [primary];
        currentWorkspace = primary;
      }

      if (currentWorkspace) {
        subscriptionManager.init(currentWorkspace);
      }
      dispatch({
        type: 'WORKSPACES_LOADED',
        payload: { workspaces, currentWorkspace },
      });

      return workspaces;
    } catch (error) {
      dispatch({ type: 'WORKSPACE_ERROR', payload: error });
      throw error;
    }
  }, []);

  useEffect(() => {
    const userId = String(user?.uid || '').trim();

    if (!userId) {
      dispatch({
        type: 'WORKSPACES_LOADED',
        payload: { workspaces: [], currentWorkspace: null },
      });
      return;
    }

    loadUserWorkspaces(user).catch((error) => {
      dispatch({ type: 'WORKSPACE_ERROR', payload: error });
    });
  }, [user, loadUserWorkspaces]);

  useEffect(() => {
    const userId = String(user?.uid || '').trim();
    const workspaceId = String(state.currentWorkspace?.id || '').trim();

    if (!userId || !workspaceId) {
      dispatch({ type: 'MEMBERSHIP_LOADED', payload: null });
      return;
    }

    let active = true;
    dispatch({ type: 'MEMBERSHIP_LOADING' });

    storage.getWorkspaceMember(workspaceId, userId)
      .then((membership) => {
        if (!active) return;
        dispatch({ type: 'MEMBERSHIP_LOADED', payload: membership || null });
      })
      .catch((error) => {
        if (!active) return;
        console.error('[WorkspaceContext.membership]', error);
        dispatch({ type: 'MEMBERSHIP_LOADED', payload: null });
      });

    return () => {
      active = false;
    };
  }, [state.currentWorkspace?.id, user?.uid]);

  const switchWorkspace = useCallback(async (workspaceId) => {
    if (!workspaceId) return null;

    dispatch({ type: 'WORKSPACE_LOADING' });

    try {
      const selected = state.workspaces.find((item) => String(item.id || '') === String(workspaceId))
        || await storage.getWorkspace(workspaceId);

      if (!selected) {
        throw new Error('مساحة العمل غير موجودة');
      }

      // Update Firestore user's primary workspace
      const userId = String(user?.uid || '').trim();
      if (userId) {
        await storage.updateUserPrimaryWorkspace(userId, selected.id);
      }

      dispatch({ type: 'WORKSPACE_SWITCHED', payload: selected });
      dispatch({ type: 'WORKSPACE_OPTIONS_CLEARED' });

      window.dispatchEvent(new CustomEvent(LAWBASE_EVENTS.WORKSPACE_CHANGED, {
        detail: { workspaceId: selected.id },
      }));

      return selected;
    } catch (error) {
      dispatch({ type: 'WORKSPACE_ERROR', payload: error });
      throw error;
    }
  }, [state.workspaces, user?.uid]);

  const getOptions = useCallback(async (optionType) => {
    const type = String(optionType || '').trim();
    if (!type) return [];

    if (Object.prototype.hasOwnProperty.call(state.workspaceOptions, type)) {
      return state.workspaceOptions[type] || [];
    }

    const workspaceId = state.currentWorkspace?.id;
    if (!workspaceId) return [];

    const items = await storage.getWorkspaceOptions(workspaceId, type);
    dispatch({ type: 'WORKSPACE_OPTION_CACHED', payload: { optionType: type, items } });

    return items;
  }, [state.currentWorkspace?.id, state.workspaceOptions]);

  useEffect(() => {
    const handleWorkspaceChanged = (event) => {
      const changedWorkspaceId = event?.detail?.workspaceId;
      if (!changedWorkspaceId) return;
      if (String(changedWorkspaceId) === String(state.currentWorkspace?.id || '')) return;
      switchWorkspace(changedWorkspaceId).catch(() => {});
    };

    window.addEventListener(LAWBASE_EVENTS.WORKSPACE_CHANGED, handleWorkspaceChanged);
    return () => {
      window.removeEventListener(LAWBASE_EVENTS.WORKSPACE_CHANGED, handleWorkspaceChanged);
    };
  }, [state.currentWorkspace?.id, switchWorkspace]);

  const isWorkspaceOwner = Boolean(
    user?.uid
    && String(state.currentWorkspace?.ownerId || '') === String(user.uid)
  );
  const isWorkspaceAdmin = Boolean(
    isWorkspaceOwner
    || (
      state.currentMembership?.isActive !== false
      && String(state.currentMembership?.role || '') === 'admin'
    )
  );
  const canManageWorkspaceMembers = isWorkspaceAdmin;
  const canManageWorkspaceSettings = isWorkspaceAdmin;
  const workspacePlan = String(state.currentWorkspace?.plan || 'free').trim().toLowerCase() || 'free';
  const hasTeamFeatures = Boolean(getWorkspacePlanFeatures(workspacePlan).teamMembers);

  const value = useMemo(() => ({
    currentWorkspace: state.currentWorkspace,
    workspaces: state.workspaces,
    loading: state.loading,
    bootstrapping: state.bootstrapping,
    membershipLoading: state.membershipLoading,
    currentMembership: state.currentMembership,
    workspacePlan,
    hasTeamFeatures,
    isWorkspaceOwner,
    isWorkspaceAdmin,
    canManageWorkspaceMembers,
    canManageWorkspaceSettings,
    error: state.error,
    workspaceOptions: state.workspaceOptions,
    loadUserWorkspaces,
    switchWorkspace,
    getOptions,
  }), [
    state.currentWorkspace,
    state.workspaces,
    state.loading,
    state.bootstrapping,
    state.membershipLoading,
    state.currentMembership,
    workspacePlan,
    hasTeamFeatures,
    isWorkspaceOwner,
    isWorkspaceAdmin,
    canManageWorkspaceMembers,
    canManageWorkspaceSettings,
    state.error,
    state.workspaceOptions,
    loadUserWorkspaces,
    switchWorkspace,
    getOptions,
  ]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
