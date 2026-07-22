// src/types.d.ts
import type { Controller } from "./core/Controller";

declare global {
	function GM_getValue(name: string, defaultValue?: any): any;
	function GM_setValue(name: string, value: any): void;
	function GM_deleteValue(name: string): void;
	function GM_registerMenuCommand(
		caption: string,
		commandFunc: () => void,
		accessKey?: string,
	): void;

	interface Window {
		__MVC_INSTANCE?: Controller;
	}

	interface HTMLVideoElement {
		webkitSupportsPresentationMode?: boolean;
		webkitPresentationMode?: "inline" | "picture-in-picture" | "fullscreen";
		webkitSetPresentationMode?: (
			mode: "inline" | "picture-in-picture" | "fullscreen",
		) => void;
	}

	interface Document {
		webkitFullscreenElement?: Element | null;
	}
}
