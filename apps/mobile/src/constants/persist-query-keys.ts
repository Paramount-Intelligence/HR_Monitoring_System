/** Root segments of query keys safe to persist in AsyncStorage (no auth tokens). */
const PERSISTABLE_ROOTS = new Set([
  'user',
  'dashboard',
  'attendance',
  'conversations',
  'conversation',
  'messages',
  'notifications',
  'reports',
  'leaves',
]);

export function shouldPersistQueryKey(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  if (typeof root !== 'string') return false;
  if (root === 'users' || root === 'manage' || root === 'approvals') return false;
  return PERSISTABLE_ROOTS.has(root);
}
