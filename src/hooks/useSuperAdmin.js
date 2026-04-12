import { useAuth } from '@/contexts/AuthContext';

const SUPER_ADMIN_UID = import.meta.env.VITE_SUPER_ADMIN_UID || '';

export function useSuperAdmin() {
  const { user } = useAuth();
  const isSuperAdmin = Boolean(
    user?.uid && SUPER_ADMIN_UID && user.uid === SUPER_ADMIN_UID
  );
  return { isSuperAdmin };
}
