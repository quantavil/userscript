import type { Store } from '../core/Store';
import type { Scanner } from '../filter/Scanner';
import { STAR_FILLED, BAN_ICON } from '../ui/icons';
import { SVF_CONFIG } from '../config';

const ATTR = SVF_CONFIG.ITEM_ATTR;
const DOMAIN_ATTR = `${ATTR}-domain`;
const REVEAL_WIDTH = 128; // 64px * 2 buttons

export class MobileSwipe {
    private _store: Store;
    private _scanner: Scanner;
    private _signal: AbortSignal;

    private _activeItem: HTMLElement | null = null;
    private _activeBg: HTMLElement | null = null;

    // Swipe tracking state
    private _startX = 0;
    private _startY = 0;
    private _isSwiping = false;
    private _isScrolling = false;
    private _swipeConfirmed = false;
    private _initialTranslate = 0;
    private _wasOpen = false;


    constructor(store: Store, scanner: Scanner, signal: AbortSignal) {
        this._store = store;
        this._scanner = scanner;
        this._signal = signal;

        this._initListeners();
    }

    private _initListeners(): void {
        document.addEventListener('touchstart', (e) => this._onTouchStart(e), { signal: this._signal, passive: true });
        document.addEventListener('touchmove', (e) => this._onTouchMove(e), { signal: this._signal, passive: false });
        document.addEventListener('touchend', (e) => this._onTouchEnd(e), { signal: this._signal, passive: false });
        document.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { signal: this._signal, passive: false });
    }

    private _onTouchStart(e: TouchEvent): void {
        if (e.touches.length > 1) return;

        const touch = e.touches[0];
        const target = e.target as HTMLElement;

        // Close open items on touchstart if user taps outside the currently swiped item
        if (this._activeItem && !this._activeItem.contains(target) && (!this._activeBg || !this._activeBg.contains(target))) {
            const itemToClose = this._activeItem;
            const bgToClose = this._activeBg;
            this._animateClose(itemToClose, bgToClose);
            this._activeItem = null;
            this._activeBg = null;
        }

        const item = target.closest<HTMLElement>(`[${ATTR}]`);
        if (!item) return;

        // Skip blocked items if they are hidden/collapsed
        if (item.classList.contains('svf-hide')) return;

        this._startX = touch.clientX;
        this._startY = touch.clientY;
        this._isSwiping = false;
        this._isScrolling = false;
        this._swipeConfirmed = false;

        // Determine current transform translation
        this._initialTranslate = this._getTranslationX(item);
        this._wasOpen = this._initialTranslate < -10;

        // If this is a new item or if it's currently at 0 translation, track it
        if (item !== this._activeItem) {
            if (this._activeItem) {
                this._animateClose(this._activeItem, this._activeBg);
            }
            this._activeItem = item;
            this._activeBg = null;
        }
    }

    private _onTouchMove(e: TouchEvent): void {
        if (!this._activeItem || e.touches.length > 1) return;

        const touch = e.touches[0];
        const dx = touch.clientX - this._startX;
        const dy = touch.clientY - this._startY;

        if (this._isScrolling) return;

        if (!this._swipeConfirmed) {
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (absDy > absDx && absDy > 8) {
                this._isScrolling = true;
                this._activeItem = null;
                return;
            }

            if (absDx > absDy && absDx > 8) {
                this._swipeConfirmed = true;
                this._isSwiping = true;

                // Create or find swipe background
                this._prepareSwipeBg(this._activeItem);
            }
        }

        if (this._isSwiping && this._activeItem && this._activeBg) {
            // Prevent vertical page scroll during active horizontal swipe
            e.preventDefault();

            let targetX = this._initialTranslate + dx;

            // Clamping and rubber-banding
            if (targetX > 0) {
                targetX = targetX * 0.2;
            } else if (targetX < -REVEAL_WIDTH) {
                targetX = -REVEAL_WIDTH + (targetX + REVEAL_WIDTH) * 0.3;
            }

            this._activeItem.style.transform = `translateX(${targetX}px)`;
        }
    }

    private _onTouchEnd(e: TouchEvent): void {
        if (!this._activeItem) return;

        const item = this._activeItem;
        const bg = this._activeBg;
        const target = e.target as HTMLElement;

        if (this._isSwiping && bg) {
            const currentTranslate = this._getTranslationX(item);
            const threshold = -REVEAL_WIDTH / 2; // -64px

            if (currentTranslate < threshold) {
                // Snap open
                this._animateOpen(item, bg);
            } else {
                // Snap closed
                this._animateClose(item, bg);
                if (item === this._activeItem) {
                    this._activeItem = null;
                    this._activeBg = null;
                }
            }
        } else if (this._wasOpen && bg && !bg.contains(target)) {
            // Tap on/outside the open row closes it and prevents accidental navigation
            e.preventDefault();
            this._animateClose(item, bg);
            this._activeItem = null;
            this._activeBg = null;
        }

        this._isSwiping = false;
        this._isScrolling = false;
        this._swipeConfirmed = false;
    }

    private _getTranslationX(el: HTMLElement): number {
        const style = window.getComputedStyle(el);
        const transform = style.transform;
        if (!transform || transform === 'none') return 0;
        const matrix = new DOMMatrix(transform);
        return matrix.m41; // translation x
    }

    private _prepareSwipeBg(item: HTMLElement): void {
        if (this._activeBg) return;

        const domain = item.getAttribute(DOMAIN_ATTR) || '';
        const match = this._store.matchDomain(domain);

        // Try to find existing swipe background
        let bg = item.previousElementSibling as HTMLElement;
        if (!bg || !bg.classList.contains('svf-swipe-bg')) {
            bg = document.createElement('div');
            bg.className = 'svf-swipe-bg';
            item.parentNode?.insertBefore(bg, item);
        }

        // Set dimensions and position exactly behind item
        bg.style.top = `${item.offsetTop}px`;
        bg.style.left = `${item.offsetLeft}px`;
        bg.style.width = `${item.offsetWidth}px`;
        bg.style.height = `${item.offsetHeight}px`;

        // Render buttons inside bg container
        const isLiked = match === 'liked';
        const isDisliked = match === 'disliked';
        const isCompact = item.offsetHeight < 54;

        bg.innerHTML = `
            <div class="svf-swipe-btn-container">
                <button class="svf-swipe-btn like-btn ${isLiked ? 'active' : ''} ${isCompact ? 'compact' : ''}" title="${isLiked ? 'Remove from Liked' : 'Add to Liked'}">
                    ${STAR_FILLED}
                    <span class="svf-swipe-btn-label">Star</span>
                </button>
                <button class="svf-swipe-btn dislike-btn ${isDisliked ? 'active' : ''} ${isCompact ? 'compact' : ''}" title="${isDisliked ? 'Remove from Disliked' : 'Add to Disliked'}">
                    ${BAN_ICON}
                    <span class="svf-swipe-btn-label">Block</span>
                </button>
            </div>
        `;

        // Apply active swipe class to the item to promote it to a new composite layer
        item.classList.add('svf-swipe-active');

        // Dynamically get and apply closest opaque background to item so buttons are properly covered
        const opaqueBg = this._getOpaqueBackground(item);
        item.style.backgroundColor = opaqueBg;

        // Bind events to buttons
        const likeBtn = bg.querySelector('.like-btn');
        const dislikeBtn = bg.querySelector('.dislike-btn');

        likeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleLike(domain);
            this._animateClose(item, bg);
            if (this._activeItem === item) {
                this._activeItem = null;
                this._activeBg = null;
            }
        });

        dislikeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleDislike(domain);
            this._animateClose(item, bg);
            if (this._activeItem === item) {
                this._activeItem = null;
                this._activeBg = null;
            }
        });

        this._activeBg = bg;
    }

    private _getOpaqueBackground(el: HTMLElement): string {
        let current: HTMLElement | null = el;
        while (current) {
            const bg = window.getComputedStyle(current).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                return bg;
            }
            current = current.parentElement;
        }
        return '#fff'; // fallback
    }

    private _toggleLike(domain: string): void {
        const match = this._store.matchDomain(domain);
        if (match === 'liked') {
            this._store.removeDomain('liked', domain);
        } else {
            this._store.addDomain('liked', domain);
        }
        this._scanner.reapply();
    }

    private _toggleDislike(domain: string): void {
        const match = this._store.matchDomain(domain);
        if (match === 'disliked') {
            this._store.removeDomain('disliked', domain);
        } else {
            this._store.addDomain('disliked', domain);
        }
        this._scanner.reapply();
    }

    private _animateOpen(item: HTMLElement, bg: HTMLElement): void {
        item.classList.add('svf-swipe-transition');
        item.style.transform = `translateX(-${REVEAL_WIDTH}px)`;

        // Clean up transition class after duration
        setTimeout(() => {
            item.classList.remove('svf-swipe-transition');
        }, 200);
    }

    private _animateClose(item: HTMLElement, bg: HTMLElement | null): void {
        item.classList.add('svf-swipe-transition');
        item.style.transform = '';

        setTimeout(() => {
            item.classList.remove('svf-swipe-transition');
            item.classList.remove('svf-swipe-active');
            item.style.backgroundColor = '';
            if (bg && bg.parentNode) {
                bg.remove();
            }
        }, 200);
    }

    destroy(): void {
        if (this._activeBg && this._activeBg.parentNode) {
            this._activeBg.remove();
        }
        if (this._activeItem) {
            this._activeItem.classList.remove('svf-swipe-active', 'svf-swipe-transition');
            this._activeItem.style.transform = '';
            this._activeItem.style.backgroundColor = '';
        }
        this._activeItem = null;
        this._activeBg = null;
    }
}
