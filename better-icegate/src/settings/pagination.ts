const key = 'better-icegate.pagination.v1';
export const paginationChanged = 'better-icegate:pagination-changed';

export function paginationEnabled(): boolean {
  return localStorage.getItem(key) === 'true';
}

export function setPaginationEnabled(enabled: boolean): void {
  localStorage.setItem(key, String(enabled));
  window.dispatchEvent(new Event(paginationChanged));
}

export function isPaginationStorageEvent(event: StorageEvent): boolean {
  return event.key === key || event.key === null;
}
