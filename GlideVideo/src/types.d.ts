// src/types.d.ts
import { Controller } from './core/Controller';

declare global {
    interface Window {
        __MVC_INSTANCE?: Controller;
    }

    interface HTMLVideoElement {
        __mvc_last_rate?: number;
        __mvc_preload_user_time?: number;
        __mvc_preload_is_pumping?: boolean;
        webkitSupportsPresentationMode?: boolean;
        webkitPresentationMode?: 'inline' | 'picture-in-picture' | 'fullscreen';
        webkitSetPresentationMode?: (mode: 'inline' | 'picture-in-picture' | 'fullscreen') => void;
    }

    interface Document {
        webkitFullscreenElement?: Element | null;
    }

    interface Function {
        __mvc_patched?: boolean;
    }
}
