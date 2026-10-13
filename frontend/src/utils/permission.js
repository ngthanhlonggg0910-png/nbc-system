export const getPermissions = (user) => Array.isArray(user?.role?.permissions) ? user.role.permissions : [];
export const hasPermission = (userOrPermissions, permission) => {
  const permissions = Array.isArray(userOrPermissions) ? userOrPermissions : getPermissions(userOrPermissions);
  return Boolean(permission) && permissions.includes(permission);
};
export const hasAnyPermission = (userOrPermissions, required = []) => required.some((permission) => hasPermission(userOrPermissions, permission));
