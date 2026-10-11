import { CFG } from '../config';
import { state } from '../state';
import { STYLES } from './styles';
import { renderFab, renderModal, createProgressCard, type FabState } from './components';
import type { MediaItem, ProgressCard } from '../types';

declare const GM_registerMenuCommand: (name: string, fn: () => void) => void;
declare const GM_notification: (options: { text: string; title?: string; timeout?: number }) => void;

// ============================================
// State
// ============================================

// ============================================
// Utilities
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
    window.addEventListener(event, () => mountUI(), { once: true });
    return;
  }

  // Create host element for Shadow DOM
  const host = document.createElement('div');
  host.id = 'sg-host';
  // Prevent Dark Reader from inverting color
  host.setAttribute('data-darkreader-ignore', 'true');
  host.classList.add('darkreader');
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    zIndex: '2147483647',
    pointerEvents: 'none', // Allow clicks to pass through the wrapper
    colorScheme: 'dark',
  });

  // Attach Shadow DOM
  const shadow = host.attachShadow({ mode: 'open' });

  // Inject Styles (remove GM_addStyle dependency for UI)
  const styleEl = document.createElement('style');
  styleEl.classList.add('darkreader'); // Key fix: prevent Dark Reader from modifying this style block
  styleEl.textContent = STYLES;
  shadow.append(styleEl);

  // Create Containers
  fabContainer = document.createElement('div');
  fabContainer.id = 'sg-fab-container';
  // Reset pointer-events for children so they can be clicked
  fabContainer.style.pointerEvents = 'auto';

  modalContainer = document.createElement('div');
  modalContainer.id = 'sg-modal-container';
  modalContainer.style.pointerEvents = 'auto';

  toastContainer = document.createElement('div');
  toastContainer.id = 'sg-toast-container';
  toastContainer.className = 'sg-toast';
  // toastContainer uses pointer-events: none in CSS usually, but let's ensure children are auto
  // The CSS for .sg-toast says "pointer-events: none !important" and children "pointer-events: auto"
  // So we just need to ensure the container itself respects the context
  // Note: Since we are inside shadow DOM, IDs are scoped.

  // Append to Shadow DOM
  shadow.append(fabContainer, modalContainer, toastContainer);

  // Append Host to Body (or documentElement)
  document.documentElement.append(host);

  // Event delegation
  // Note: Events bubble from Shadow DOM, so we can listen on the container elements directly
  fabContainer.addEventListener('mouseenter', clearIdle);
  fabContainer.addEventListener('mouseleave', resetIdle);

  // For global keys like Escape, document listener is fine
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
  const items = modalState.items.length > 0 ? modalState.items : state.getAllItems();
  return state.filterItems(items);
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
    return { update() { }, done() { }, remove() { }, setOnStop() { }, setOnCancel() { } };
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