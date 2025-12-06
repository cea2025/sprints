/**
 * PermissionGate Component
 * 
 * Conditionally renders children based on user permissions.
 * Use this to show/hide UI elements based on roles.
 */

import { usePermissions } from '../../hooks/usePermissions';

/**
 * Show children only if user has the required permission
 * @param {string} permission - The permission to check (e.g., 'users:read')
 * @param {string} role - Alternative: minimum role required
 * @param {ReactNode} children - Content to show if authorized
 * @param {ReactNode} fallback - Content to show if not authorized (optional)
 */
export function PermissionGate({ permission, role, children, fallback = null }) {
  const { can, hasRole } = usePermissions();

  // Check by permission
  if (permission && !can(permission)) {
    return fallback;
  }

  // Check by role
  if (role && !hasRole(role)) {
    return fallback;
  }

  return children;
}

/**
 * Show children only if user is Admin
 */
export function AdminOnly({ children, fallback = null }) {
  const { isAdmin } = usePermissions();
  return isAdmin ? children : fallback;
}

/**
 * Show children only if user can manage (Admin or Manager)
 */
export function ManagerOnly({ children, fallback = null }) {
  const { isManager } = usePermissions();
  return isManager ? children : fallback;
}

/**
 * Show children only if user can create the resource
 */
export function CanCreate({ resource, children, fallback = null }) {
  const { canCreate } = usePermissions();
  return canCreate(resource) ? children : fallback;
}

/**
 * Show children only if user can update the resource
 */
export function CanUpdate({ resource, children, fallback = null }) {
  const { canUpdate } = usePermissions();
  return canUpdate(resource) ? children : fallback;
}

/**
 * Show children only if user can delete the resource
 */
export function CanDelete({ resource, children, fallback = null }) {
  const { canDelete } = usePermissions();
  return canDelete(resource) ? children : fallback;
}

export default PermissionGate;

