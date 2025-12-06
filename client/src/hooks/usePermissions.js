/**
 * usePermissions Hook
 * 
 * Hook for checking user permissions in components.
 */

import { useAuth } from '../context/AuthContext';
import { hasPermission, isRoleAtLeast, ROLES } from '../constants/roles';

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || ROLES.VIEWER;

  return {
    role,
    isAdmin: role === ROLES.ADMIN,
    isManager: isRoleAtLeast(role, ROLES.MANAGER),
    isMember: isRoleAtLeast(role, ROLES.MEMBER),
    
    // Check specific permission
    can: (permission) => hasPermission(role, permission),
    
    // Check minimum role
    hasRole: (requiredRole) => isRoleAtLeast(role, requiredRole),
    
    // Common permission checks
    canCreate: (resource) => hasPermission(role, `${resource}:create`),
    canUpdate: (resource) => hasPermission(role, `${resource}:update`),
    canDelete: (resource) => hasPermission(role, `${resource}:delete`),
    canRead: (resource) => hasPermission(role, `${resource}:read`),
  };
}

export default usePermissions;

