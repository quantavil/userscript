import { CFG } from '../config';
import { state } from '../state';
import { STYLES } from './styles';
import { renderFab, renderModal, createProgressCard, type FabState } from './components';
import type { MediaItem, ProgressCard } from '../types';

// ============================================
// State
// ============================================

let mounted = false;
let fabContainer: HTMLDivElement | null = null;
let modalContainer: HTMLDivElement | null = null;
let toastContainer: HTMLDivElement | null = null;

const fabState: FabState = { show: false, busy: false, idle: false, count: 0 };
const modalState = { show: false, title: 'Select Media', items: [] as MediaItem[] };

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPicker: { resolve: (item: MediaItem | null) => void; title: string; filterable: boolean } | null = null;

// Callbacks
let onFabClick: (() => void) | null = null;
let onItemSelected: ((item: MediaItem) => void) | null = null;

// ============================================
// Mount
// ============================================

export function mountUI(): void {
  if (!CFG.IS_TOP || mounted) return;

  if (!document.body) {
    const event = document.readyState === 'loading' ? 'DOMContentLoaded' : 'load';
    document.addEventListener(event, () => mountUI(), { once: true });
    return;
  }

  GM_addStyle(STYLES);

  fabContainer = document.createElement('div');
  fabContainer.id = 'sg-fab-container';

  modalContainer = document.createElement('div');
  modalContainer.id = 'sg-modal-container';

  toastContainer = document.createElement('div');
  toastContainer.id = 'sg-toast-container';
  toastContainer.className = 'sg-toast';

  document.body.append(fabContainer, modalContainer, toastContainer);

  // Event delegation
  fabContainer.addEventListener('mouseenter', clearIdle);
  fabContainer.addEventListener('mouseleave', resetIdle);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && modalState.show && closeModal());

  mounted = true;
  render();
}

function ensureMounted(): boolean {
  if (!CFG.IS_TOP) return false;
  if (!mounted) mountUI();
  return mounted;
}

// ============================================
// Render
// ============================================

function render(): void {
  if (!mounted || !fabContainer || !modalContainer) return;

  renderFab(fabContainer, fabState, handleFabClick);

  const items = modalState.show ? getFilteredItems() : [];
  renderModal(
    modalContainer,
    modalState.show,
    modalState.title,
    items,
    pendingPicker?.filterable ?? true,
    state.excludeSmall,
    closeModal,
    handleItemSelect,
    handleFilterChange
  );
}

// ============================================
// FAB
// ============================================

export function showFab(): void {
  if (!CFG.IS_TOP) return;
  fabState.show = true;
  fabState.count = state.validCount;
  if (ensureMounted()) {
    render();
    resetIdle();
  }
}

export function hideFab(): void {
  fabState.show = false;
  if (mounted) render();
}

export function setFabBusy(busy: boolean): void {
  fabState.busy = busy;
  if (mounted) render();
}

export function updateBadge(): void {
  fabState.count = state.validCount;
  if (mounted) render();
}

function resetIdle(): void {
  clearIdle();
  idleTimer = setTimeout(() => {
    fabState.idle = true;
    if (mounted) render();
  }, CFG.UI_IDLE_MS);
}

function clearIdle(): void {
  fabState.idle = false;
  if (idleTimer) clearTimeout(idleTimer);
  if (mounted) render();
}

// ============================================
// Modal
// ============================================

function getFilteredItems(): MediaItem[] {
  const items = modalState.items.length > 0 ? modalState.items : state.getFilteredItems();
  return state.excludeSmall ? items.filter((i) => i.size == null || i.size >= CFG.SMALL_BYTES) : items;
}

export function openModal(title = 'Select Media', items?: MediaItem[]): void {
  if (!ensureMounted()) return;
  modalState.show = true;
  modalState.title = title;
  modalState.items = items ?? [];
  render();
}

export function closeModal(): void {
  modalState.show = false;
  modalState.items = [];
  if (mounted) render();
  if (pendingPicker) {
    pendingPicker.resolve(null);
    pendingPicker = null;
  }
}

function handleItemSelect(item: MediaItem): void {
  closeModal();
  if (pendingPicker) {
    pendingPicker.resolve(item);
    pendingPicker = null;
  } else {
    onItemSelected?.(item);
  }
}

function handleFilterChange(checked: boolean): void {
  state.setExcludeSmall(checked);
  render();
}

function handleFabClick(): void {
  if (!mounted) return;
  clearIdle();
  resetIdle();
  onFabClick?.();
}

// ============================================
// Picker
// ============================================

export function pickFromList(
  items: MediaItem[],
  { title = 'Select Media', filterable = true } = {}
): Promise<MediaItem | null> {
  if (!ensureMounted()) return Promise.resolve(null);
  return new Promise((resolve) => {
    pendingPicker = { resolve, title, filterable };
    openModal(title, items);
  });
}

// ============================================
// Progress
// ============================================

export function createProgress(title: string, src: string, segs = 0): ProgressCard {
  if (!ensureMounted() || !toastContainer) {
    return { update() {}, done() {}, remove() {}, setOnStop() {}, setOnCancel() {} };
  }
  return createProgressCard(toastContainer, title, src, segs);
}

// ============================================
// Menu Commands
// ============================================

export function registerMenuCommands(): void {
  if (!CFG.IS_TOP) return;

  GM_registerMenuCommand('Show Download Panel', () => {
    ensureMounted();
    showFab();
    handleFabClick();
  });

  GM_registerMenuCommand('Clear Cache', () => {
    state.clear();
    updateBadge();
    GM_notification({ text: 'Cache cleared', title: 'StreamGrabber', timeout: 2000 });
  });
}

// ============================================
// API
// ============================================

export function setUICallbacks(cbs: { onFabClick?: () => void; onItemSelected?: (item: MediaItem) => void }): void {
  if (cbs.onFabClick) onFabClick = cbs.onFabClick;
  if (cbs.onItemSelected) onItemSelected = cbs.onItemSelected;
}

export function refreshUI(): void {
  if (!CFG.IS_TOP) return;
  updateBadge();
  if (mounted && modalState.show) render();
}