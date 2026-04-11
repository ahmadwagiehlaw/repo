import { createContext, useContext, useEffect, useMemo, useReducer, useCallback } from 'react';
import firebase, { auth } from '@/config/firebase.js';

const AuthContext = createContext(undefined);

const initialState = {
  loading: true,
  user: null,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        loading: false,
        user: action.payload,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'AUTH_SIGNED_OUT':
      return {
        loading: false,
        user: null,
        error: null,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    dispatch({ type: 'AUTH_LOADING' });

    const unsubscribe = auth.onAuthStateChanged(
      (user) => {
        dispatch({ type: 'AUTH_SUCCESS', payload: user || null });
      },
      (error) => {
        dispatch({ type: 'AUTH_ERROR', payload: error });
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: error });
      throw error;
    }
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: error });
      throw error;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      await firebase.auth().createUserWithEmailAndPassword(email, password);
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: error });
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      await auth.signOut();
      dispatch({ type: 'AUTH_SIGNED_OUT' });
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: error });
      throw error;
    }
  }, []);

  const value = useMemo(() => ({
    loading: state.loading,
    user: state.user,
    error: state.error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }), [state.loading, state.user, state.error, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
