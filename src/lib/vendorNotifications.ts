/** In-app titles meant for admin reviewers — hide from vendor portal feed/bell. */
export const ADMIN_ONLY_NOTIFICATION_TITLES = [
  'New Product Pending Approval',
  'New Category Suggestion',
] as const;

export function isAdminOnlyNotificationTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return (ADMIN_ONLY_NOTIFICATION_TITLES as readonly string[]).includes(title);
}

export function isVendorActionableProductNotification(title: string | null | undefined): boolean {
  if (!title || isAdminOnlyNotificationTitle(title)) return false;
  const t = title.toLowerCase();
  return (
    t.includes('needs changes') ||
    t.includes('reject') ||
    t.includes('approved') ||
    t.includes('pending')
  );
}
