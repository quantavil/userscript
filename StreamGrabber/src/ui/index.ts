import { CFG } from '../config';
import { state } from '../state';
import { STYLES } from './styles';
import { renderFab, renderModal, createProgressCard, type FabState } from './components';
import type { MediaItem, ProgressCard } from '../types';

// ============================================
// State
// ============================================

let mounted = false;
let mountPending = false;
let fabContainer: HTMLDivElement | null = null;
let modalContainer: HTMLDivElement | null = null;
let toastContainer: HTMLDivElement | null = null;

let fabState: FabState = {
  show: false,
  busy: false,
  idle: false,
  count: 0,
};

let modalState = {
  show: false,
  title: 'Select Media',
  items: [] as MediaItem[],
};

let idleTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingPicker: {
  resolve: (item: MediaItem | null) => void;
  title: string;
  filterable: boolean;
} | null = null;

// Queued operations while waiting for mount
let queuedShowFab = false;
let queuedBadgeUpdate = false;

// ============================================
// Mount
// ============================================

export function mountUI(): void {
  if (!CFG.IS_TOP || mounted || mountPending) return;
  
  // Wait for body if not ready
  if (!document.body) {
    mountPending = true;
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        mountPending = false;
        mountUI();
      }, { once: true });
    } else {
      // Body should exist but doesn't - use requestAnimationFrame
      requestAnimationFrame(() => {
        mountPending = false;
        mountUI();
      });
    }
    return;
  }
  
  console.log('[SG] Mounting UI...');
  
  // Inject styles
  GM_addStyle(STYLES);
  
  // Create containers
  fabContainer = document.createElement('div');
  fabContainer.id = 'sg-fab-container';
  document.body.appendChild(fabContainer);
  
  modalContainer = document.createElement('div');
  modalContainer.id = 'sg-modal-container';
  document.body.appendChild(modalContainer);
  
  toastContainer = document.createElement('div');
  toastContainer.id = 'sg-toast-container';
  toastContainer.className = 'sg-toast';
  document.body.appendChild(toastContainer);
  
  mounted = true;
  
  // Process any queued operations
  if (queuedShowFab) {
    queuedShowFab = false;
    fabState.show = true;
  }
  if (queuedBadgeUpdate) {
    queuedBadgeUpdate = false;
    fabState.count = state.validCount;
  }
  
  // Initial render
  updateFab();
  updateModal();
  
  // FAB hover handlers
  fabContainer.addEventListener('mouseenter', clearIdle);
  fabContainer.addEventListener('mouseleave', setIdle);
  
  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalState.show) {
      closeModal();
    }
  });
  
  console.log('[SG] UI mounted successfully');
}

/**
 * Ensure UI is mounted before operations
 */
function ensureMounted(): boolean {
  if (!CFG.IS_TOP) return false;
  
  if (!mounted && !mountPending) {
    mountUI();
  }
  
  return mounted && !!fabContainer && !!modalContainer && !!toastContainer;
}

// ============================================
// FAB
// ============================================

function updateFab(): void {
  if (!mounted || !fabContainer) return;
  renderFab(fabContainer, fabState, handleFabClick);
}

export function showFab(): void {
  if (!CFG.IS_TOP) return;
  
  fabState.show = true;
  fabState.count = state.validCount;
  
  if (!mounted) {
    queuedShowFab = true;
    queuedBadgeUpdate = true;
    mountUI(); // Trigger mount
    return;
  }
  
  updateFab();
  clearIdle();
  setIdle();
}

export function hideFab(): void {
  fabState.show = false;
  if (mounted) updateFab();
}

export function setFabBusy(busy: boolean): void {
  fabState.busy = busy;
  if (mounted) updateFab();
}

export function updateBadge(): void {
  fabState.count = state.validCount;
  
  if (!mounted) {
    queuedBadgeUpdate = true;
    return;
  }
  
  updateFab();
}

function setIdle(): void {
  if (idleTimeout) clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    fabState.idle = true;
    if (mounted) updateFab();
  }, CFG.UI_IDLE_MS);
}

function clearIdle(): void {
  fabState.idle = false;
  if (idleTimeout) clearTimeout(idleTimeout);
  if (mounted) updateFab();
}

// ============================================
// Modal
// ============================================

function updateModal(): void {
  if (!mounted || !modalContainer) return;
  
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

function getFilteredItems(): MediaItem[] {
  const items = modalState.items.length > 0 ? modalState.items : state.getFilteredItems();
  
  if (!state.excludeSmall) return items;
  
  return items.filter(
    item => item.size == null || item.size >= CFG.SMALL_BYTES
  );
}

export function openModal(title = 'Select Media', items?: MediaItem[]): void {
  if (!ensureMounted()) {
    console.error('[SG] Cannot open modal: UI not mounted');
    return;
  }
  
  modalState.show = true;
  modalState.title = title;
  modalState.items = items ?? [];
  updateModal();
}

export function closeModal(): void {
  modalState.show = false;
  modalState.items = [];
  if (mounted) updateModal();
  
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
    // Trigger download via callback
    onItemSelected?.(item);
  }
}

function handleFilterChange(checked: boolean): void {
  state.setExcludeSmall(checked);
  updateModal();
}

// ============================================
// Picker
// ============================================

export function pickFromList(
  items: MediaItem[],
  options: { title?: string; filterable?: boolean } = {}
): Promise<MediaItem | null> {
  const { title = 'Select Media', filterable = true } = options;
  
  // Ensure UI is mounted before showing picker
  if (!ensureMounted()) {
    console.error('[SG] Cannot show picker: UI not mounted');
    return Promise.resolve(null);
  }
  
  return new Promise(resolve => {
    pendingPicker = { resolve, title, filterable };
    openModal(title, items);
  });
}

// ============================================
// Progress
// ============================================

export function createProgress(
  title: string,
  src: string,
  segs = 0
): ProgressCard {
  if (!ensureMounted() || !toastContainer) {
    console.error('[SG] Cannot create progress: UI not mounted');
    // Return a no-op progress card
    return {
      update() {},
      done() {},
      remove() {},
      setOnStop() {},
      setOnCancel() {},
    };
  }
  return createProgressCard(toastContainer, title, src, segs);
}

// ============================================
// Menu Commands
// ============================================

export function registerMenuCommands(): void {
  if (!CFG.IS_TOP) return;
  
  GM_registerMenuCommand('Show Download Panel', () => {
    if (!ensureMounted()) {
      // Try again after a short delay
      setTimeout(() => {
        mountUI();
        if (mounted) {
          showFab();
          handleFabClick();
        } else {
          alert('UI not ready. Please refresh the page.');
        }
      }, 100);
      return;
    }
    showFab();
    handleFabClick();
  });
  
  GM_registerMenuCommand('Clear Cache', () => {
    state.clear();
    updateBadge();
    GM_notification({
      text: 'Cache cleared',
      title: 'StreamGrabber',
      timeout: 2000,
    });
  });
  
  GM_registerMenuCommand('Debug: Show State', () => {
    const items = state.getAllItems();
    console.log('[SG] Current state:', {
      itemCount: items.length,
      mounted,
      fabState,
      items: items.map(i => ({
        url: i.url.slice(0, 60),
        kind: i.kind,
        enriched: i.enriched,
        hlsType: i.hlsType,
      })),
    });
    alert(`Detected items: ${items.length}\nMounted: ${mounted}`);
  });
}

// ============================================
// Callbacks
// ============================================

let onFabClick: (() => void) | null = null;
let onItemSelected: ((item: MediaItem) => void) | null = null;

export function setUICallbacks(cbs: {
  onFabClick?: () => void;
  onItemSelected?: (item: MediaItem) => void;
}): void {
  if (cbs.onFabClick) onFabClick = cbs.onFabClick;
  if (cbs.onItemSelected) onItemSelected = cbs.onItemSelected;
}

function handleFabClick(): void {
  if (!mounted) {
    console.error('[SG] FAB clicked but UI not mounted');
    return;
  }
  
  clearIdle();
  setIdle();
  
  if (onFabClick) {
    onFabClick();
  } else {
    console.error('[SG] FAB clicked but no handler registered');
  }
}

// ============================================
// Refresh
// ============================================

export function refreshUI(): void {
  if (!CFG.IS_TOP) return;
  
  updateBadge();
  if (mounted && modalState.show) {
    updateModal();
  }
}