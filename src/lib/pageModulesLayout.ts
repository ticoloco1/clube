export type ProfilePhotoAlign = 'center' | 'left' | 'right';

export function extractPageModulesLayout(pageModulesJson: string | null | undefined): { profile_photo_align: ProfilePhotoAlign } {
  try {
    const parsed = JSON.parse(pageModulesJson || '{}');
    const a = parsed?._layout?.profile_photo_align;
    if (a === 'left' || a === 'right') return { profile_photo_align: a };
  } catch {
    /* ignore */
  }
  return { profile_photo_align: 'center' };
}

export function isReservedPageModulesKey(key: string): boolean {
  return key.startsWith('_');
}
