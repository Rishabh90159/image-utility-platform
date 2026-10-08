/**
 * Carries files chosen on one page (the homepage upload box) to the tool the
 * user picks next. It is an in-memory variable that survives Next.js client
 * navigation within the tab, so files are never stored, serialised or sent anywhere.
 */
let pending: File[] | null = null;

export function handOffFiles(files: File[]): void {
  pending = files.length > 0 ? files : null;
}

/** Returns the waiting files once, then forgets them. */
export function takeHandedOffFiles(): File[] | null {
  const files = pending;
  pending = null;
  return files;
}
