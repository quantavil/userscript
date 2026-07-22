// src/events/EventBus.ts

export type MvcEvents = {
	"controller:init-requested": void;
	"video:active-changed": HTMLVideoElement | null;
	"video:transform-need-update": void;
	"video:rate-changed": { rate: number };
	"video:play-state-changed": { playing: boolean };
	"settings:changed": { key: string; val: any };
	"ui:toast": { message: string };
	"ui:gesture-overlay": { text: string; subText?: string } | null; // null for hide
	"control:visibility-requested": { visible: boolean; force?: boolean };
	"video:play-pause-requested": void;
	"gesture:cancel-speed-boost": void;
	"video:skip-requested": { dir: number; customSeconds?: number };
	"video:rate-change-requested": { rate: number; saveToSettings?: boolean };
	"video:double-tap-skipped": {
		side: "left" | "right";
		x: number;
		y: number;
		seconds: number;
	};
	"ui:volume-changed": { volume: number };
	"ui:brightness-changed": { brightness: number };
};

export class EventBus {
	private listeners: {
		[K in keyof MvcEvents]?: Array<(payload: MvcEvents[K]) => void>;
	} = {};

	public emit<K extends keyof MvcEvents>(
		event: K,
		payload: MvcEvents[K],
	): void {
		const callbacks = this.listeners[event];
		if (callbacks) {
			// Cache the length so subscribers added during dispatch are not
			// invoked in the same emit (matches Array.forEach semantics)
			for (let i = 0, n = callbacks.length; i < n; i++) {
				try {
					callbacks[i](payload);
				} catch (e) {
					console.error(
						`[GlideVideo] EventBus subscriber error on "${String(event)}":`,
						e,
					);
				}
			}
		}
	}

	public on<K extends keyof MvcEvents>(
		event: K,
		cb: (payload: MvcEvents[K]) => void,
	): () => void {
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
		this.listeners[event]!.push(cb);
		return () => {
			this.listeners[event] = (this.listeners[event] as any)!.filter(
				(x: any) => x !== cb,
			);
		};
	}
}
