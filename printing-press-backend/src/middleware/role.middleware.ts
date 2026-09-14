import { allowRoles } from './auth.middleware';

// Convenience shortcuts — use these instead of allowRoles('Admin') everywhere
export const isAdmin = allowRoles('Admin');
export const isManagerOrAdmin = allowRoles('Admin', 'Manager');
export const isAnyRole = allowRoles('Admin', 'Manager', 'Operator');