import { CFG } from '../config';
import { state } from '../state';
import { STYLES } from './styles';
import { renderFab, renderModal, createProgressCard, type FabState } from './components';
import type { MediaItem, ProgressCard } from '../types';

// ============================================
// State
// ============================================

let mounted = false;
let fabContainer: HTMLDivElement;
let modalContainer: HTMLDivElement;
let toastContainer: HTMLDivElement;

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

// ============================================
// Mount
// ============================================

export function mountUI(): void {
    if (!CFG.IS_TOP || mounted) return;

    if (!document.body) {
        document.addEventListener('DOMContentLoaded', mountUI, { once: true });
        return;
    }

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

    // Initial render
    updateFab();
    updateModal();

    // FAB hover handlers
    fabContainer.addEventListener('mouseenter', clearIdle);
    fabContainer.addEventListener('mouseleave', setIdle);
}

// ============================================
// FAB
// ============================================

function updateFab(): void {
    if (!mounted) return;
    renderFab(fabContainer, fabState, handleFabClick);
}

export function showFab(): void {
    fabState.show = true;
    fabState.count = state.validCount;
    updateFab();
    clearIdle();
    setIdle();
}

export function hideFab(): void {
    fabState.show = false;
    updateFab();
}

export function setFabBusy(busy: boolean): void {
    fabState.busy = busy;
    updateFab();
}

export function updateBadge(): void {
    fabState.count = state.validCount;
    updateFab();
}

function setIdle(): void {
    if (idleTimeout) clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        fabState.idle = true;
        updateFab();
    }, CFG.UI_IDLE_MS);
}

function clearIdle(): void {
    fabState.idle = false;
    if (idleTimeout) clearTimeout(idleTimeout);
    updateFab();
}

// ============================================
// Modal
// ============================================

function updateModal(): void {
    if (!mounted) return;

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
    modalState.show = true;
    modalState.title = title;
    modalState.items = items ?? [];
    updateModal();
}

export function closeModal(): void {
    modalState.show = false;
    modalState.items = [];
    updateModal();

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
        // Trigger download
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
    if (!mounted) mountUI();
    return createProgressCard(toastContainer, title, src, segs);
}

// ============================================
// Menu Commands
// ============================================

export function registerMenuCommands(): void {
    if (!CFG.IS_TOP) return;

    GM_registerMenuCommand('Show Download Panel', () => {
        mountUI();
        showFab();
        handleFabClick();
    });

    GM_registerMenuCommand('Clear Cache', () => {
        state.clear();
        updateBadge();
        alert('Cache cleared');
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
    clearIdle();
    setIdle();
    onFabClick?.();
}

// ============================================
// Refresh
// ============================================

export function refreshUI(): void {
    updateBadge();
    if (modalState.show) {
        updateModal();
    }
}