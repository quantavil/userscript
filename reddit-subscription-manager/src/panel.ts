// The floating readout: a count of your subreddits and the four things you can
// do to it. Lives in a shadow root so reddit's stylesheet can't reach it.

import type { ConfirmSpec, Report } from "./portability";
import { exportSubs, importSubs, leaveAll, refresh } from "./portability";

const svg = (d: string) =>
	`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const ACTIONS = [
	{
		key: "export",
		name: "Export",
		hint: "Download your subscriptions as JSON",
		icon: svg('<path d="M8 2v8M4.5 7L8 10.5 11.5 7M2.5 13.5h11"/>'),
		run: exportSubs,
	},
	{
		key: "import",
		name: "Import",
		hint: "Join every subreddit in a file",
		icon: svg('<path d="M8 10.5v-8M4.5 6L8 2.5 11.5 6M2.5 13.5h11"/>'),
		run: importSubs,
	},
	{
		key: "refresh",
		name: "Refresh",
		hint: "Re-read your list from Reddit",
		icon: svg(
			'<path d="M13.2 8a5.2 5.2 0 1 1-1.7-3.85M13.5 1.8v3.4h-3.4"/>',
		),
		run: (r: Report) => refresh(r, true).then(() => undefined),
	},
	{
		key: "leave",
		name: "Leave all",
		hint: "Unsubscribe from every subreddit",
		icon: svg('<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/>'),
		run: leaveAll,
		danger: true,
	},
] as const;

export type ActionKey = (typeof ACTIONS)[number]["key"];

const CSS = `
:host {
  position: fixed;
  right: 24px;
  /* clears the home-indicator bar on notched phones */
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  z-index: 2147483647;
  --ink: #0f1217;
  --plate: #1a1e24;
  --chalk: #eceef2;
  --muted: #8b929e;
  --amber: #f59e0b;
  --line: rgba(236, 238, 242, 0.12);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--chalk);
}
* { box-sizing: border-box; }
/* touch-action kills the 300ms tap delay mobile browsers add for double-tap zoom */
button { font: inherit; color: inherit; touch-action: manipulation; }
:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }

.wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }

.fab {
  position: relative;
  width: 48px; height: 48px;
  display: grid; place-items: center;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--ink);
  color: var(--amber);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
  cursor: pointer;
  transition: transform .18s cubic-bezier(.2,.85,.3,1), border-color .18s ease, box-shadow .18s ease;
}
.fab:hover { transform: translateY(-2px); border-color: rgba(245, 158, 11, .6); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.65); }
.fab.is-busy { border-color: var(--amber); }

.fab-icon { display: flex; align-items: center; justify-content: center; }
.fab.is-busy .fab-icon { display: none; }

.fab-progress {
  position: absolute; inset: 0;
  display: none; align-items: center; justify-content: center;
}
.fab.is-busy .fab-progress { display: flex; }

.progress-ring { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.ring-fill { transition: stroke-dashoffset .25s ease; }

.fab-badge {
  font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--amber);
  z-index: 1;
}

.panel {
  position: relative;
  width: 292px;
  background: var(--ink);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, .55);
  overflow: hidden;
  transform-origin: bottom right;
  opacity: 0;
  transform: translateY(10px) scale(.96);
  pointer-events: none;
  transition: opacity .16s ease, transform .22s cubic-bezier(.2,.9,.3,1);
}
.panel.is-open { opacity: 1; transform: none; pointer-events: auto; }

.head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 0; }
.eyebrow { font-size: 10px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); }
.close { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 8px; margin: -8px -8px -8px 0; line-height: 0; border-radius: 4px; }
.close:hover { color: var(--chalk); }

.readout { padding: 8px 14px 14px; }
.figure {
  font: 700 34px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.02em;
  color: var(--amber);
}
.unit { margin-top: 5px; font-size: 10px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.rule { margin-top: 13px; height: 2px; background: var(--line); }
.rule > i { display: block; height: 100%; width: 0; background: var(--amber); transition: width .25s ease; }

.actions { border-top: 1px solid var(--line); }
.act {
  display: flex; gap: 11px; align-items: flex-start;
  width: 100%; padding: 11px 14px;
  border: 0; border-bottom: 1px solid var(--line);
  background: transparent;
  text-align: left; cursor: pointer;
}
.act:last-child { border-bottom: 0; }
.act:hover:not(:disabled) { background: var(--plate); }
.act:disabled { opacity: .35; cursor: default; }
.act > .ico { color: var(--amber); line-height: 0; padding-top: 1px; }
.act .name { display: block; font-size: 13px; font-weight: 600; letter-spacing: -.01em; }
.act .hint { display: block; margin-top: 2px; font-size: 11px; line-height: 1.35; color: var(--muted); }
/* danger reads as hazard texture on the edge, not as a red button */
.act.is-danger {
  background-image: repeating-linear-gradient(45deg, rgba(255,184,77,.22) 0 2px, transparent 2px 6px);
  background-size: 4px 100%;
  background-repeat: no-repeat;
}

.status { padding: 9px 14px; border-top: 1px solid var(--line); font-size: 11px; line-height: 1.35; color: var(--muted); }
.status:empty { display: none; }
.status.is-ok { color: var(--chalk); }
.status.is-bad { color: var(--amber); }

.sheet {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; justify-content: center; gap: 9px;
  padding: 16px 14px;
  background: var(--ink);
}
.sheet.is-danger { background-image: repeating-linear-gradient(45deg, rgba(255,184,77,.22) 0 2px, transparent 2px 6px); background-size: 4px 100%; background-repeat: no-repeat; }
.sheet__title { font-size: 14px; font-weight: 650; letter-spacing: -.01em; }
.sheet__body { font-size: 11.5px; line-height: 1.5; color: var(--muted); }
.sheet__input {
  width: 100%; padding: 8px 10px;
  font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--chalk); background: var(--plate);
  border: 1px solid var(--line); border-radius: 8px;
}
.sheet__row { display: flex; gap: 8px; margin-top: 3px; }
.btn { flex: 1; padding: 9px; border: 1px solid var(--line); border-radius: 8px; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn:hover { background: var(--plate); }
.btn--go { background: var(--amber); border-color: var(--amber); color: #17130a; }
.btn--go:hover { background: #ffc76e; }
.btn--go:disabled { background: transparent; border-color: var(--line); color: var(--muted); opacity: .5; cursor: default; }

.panel.is-open .act { animation: rise .26s cubic-bezier(.2,.9,.3,1) both; }
.panel.is-open .act:nth-child(1) { animation-delay: .04s; }
.panel.is-open .act:nth-child(2) { animation-delay: .07s; }
.panel.is-open .act:nth-child(3) { animation-delay: .10s; }
.panel.is-open .act:nth-child(4) { animation-delay: .13s; }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } }

/* Stop is only reachable while something is running, so it lives outside the
   action list and stays enabled when everything else is disabled. */
.stop {
  display: none;
  width: 100%; padding: 11px 14px;
  border: 0; border-top: 1px solid var(--line);
  background: transparent; color: var(--amber);
  font-size: 13px; font-weight: 600; text-align: left; cursor: pointer;
}
.panel.is-running .stop { display: block; }
.stop:hover { background: var(--plate); }
.stop:disabled { opacity: .4; cursor: default; }

@media (prefers-reduced-motion: reduce) {
  .fab, .panel, .rule > i, .act { transition: none; animation: none; }
}

/* Phones: reddit's own bottom bar sits where the fab does, and 292px is most of
   a narrow viewport. Pull in, and let the panel use the width it has. */
@media (max-width: 480px) {
  :host { right: 12px; bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }
  .panel { width: min(320px, calc(100vw - 24px)); }
  .fab { width: 52px; height: 52px; }
  .act { padding: 13px 14px; }
  .btn { padding: 12px; }
  .sheet__input { padding: 10px; font-size: 16px; } /* 16px stops ios zooming on focus */
}
`;

const EASE_OUT = (t: number) => 1 - (1 - t) ** 3;
const RING = 2 * Math.PI * 20; // circumference of the r=20 progress ring

export class Panel implements Report {
	readonly root: ShadowRoot;
	private panel!: HTMLElement;
	private fab!: HTMLElement;
	private ringFill!: SVGCircleElement;
	private badge!: HTMLElement;
	private figure!: HTMLElement;
	private unit!: HTMLElement;
	private bar!: HTMLElement;
	private statusEl!: HTMLElement;
	private stopBtn!: HTMLButtonElement;
	private buttons: HTMLButtonElement[] = [];
	private shown = 0;
	private anim = 0; // bumped to abandon an in-flight count-up
	private busy = false;
	private open = false;
	private stopping = false;

	constructor() {
		const host = document.createElement("div");
		this.root = host.attachShadow({ mode: "open" });
		this.root.innerHTML = `
      <style>${CSS}</style>
      <div class="wrap">
        <div class="panel" role="dialog" aria-label="Subreddit subscriptions">
          <div class="head">
            <span class="eyebrow">Subscriptions</span>
            <button class="close" aria-label="Close">${svg('<path d="M4 4l8 8M12 4l-8 8"/>')}</button>
          </div>
          <div class="readout">
            <div class="figure">—</div>
            <div class="unit">subreddits</div>
            <div class="rule"><i></i></div>
          </div>
          <div class="actions">${ACTIONS.map(
						(a) => `
            <button class="act${"danger" in a ? " is-danger" : ""}" data-key="${a.key}">
              <span class="ico">${a.icon}</span>
              <span><span class="name">${a.name}</span><span class="hint">${a.hint}</span></span>
            </button>`,
					).join("")}</div>
          <button class="stop">Stop after this one</button>
          <div class="status"></div>
        </div>
        <button class="fab" aria-label="Subreddit Subscriptions" title="Subreddit Subscription Manager" aria-expanded="false">
          <span class="fab-icon">${svg('<path d="M2.5 4.5h11M2.5 8h8M2.5 11.5h5"/>')}</span>
          <div class="fab-progress" aria-hidden="true">
            <svg class="progress-ring" width="48" height="48" viewBox="0 0 48 48">
              <circle class="ring-bg" cx="24" cy="24" r="20" fill="none" stroke="rgba(236, 238, 242, 0.14)" stroke-width="3"/>
              <circle class="ring-fill" cx="24" cy="24" r="20" fill="none" stroke="var(--amber)" stroke-width="3" stroke-dasharray="${RING}" stroke-dashoffset="${RING}" stroke-linecap="round" transform="rotate(-90 24 24)"/>
            </svg>
            <span class="fab-badge">0%</span>
          </div>
        </button>
      </div>`;

		const $ = <T extends Element>(sel: string) => this.root.querySelector<T>(sel)!;
		this.panel = $(".panel");
		this.fab = $(".fab");
		this.ringFill = $(".ring-fill") as unknown as SVGCircleElement;
		this.badge = $(".fab-badge");
		this.figure = $(".figure");
		this.unit = $(".unit");
		this.bar = $(".rule > i");
		this.statusEl = $(".status");
		this.stopBtn = $(".stop");
		this.buttons = [...this.root.querySelectorAll<HTMLButtonElement>(".act")];

		this.fab.addEventListener("click", () => this.toggle());
		$(".close").addEventListener("click", () => this.toggle(false));
		this.stopBtn.addEventListener("click", () => {
			this.stopping = true;
			this.stopBtn.disabled = true;
			this.stopBtn.textContent = "Stopping…";
		});
		for (const btn of this.buttons) {
			btn.addEventListener("click", () => this.run(btn.dataset.key as ActionKey));
		}
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape") this.toggle(false);
		});
		document.addEventListener("click", (e) => {
			if (this.open && !e.composedPath().includes(host)) this.toggle(false);
		});

		document.body.append(host);
	}

	toggle(next = !this.open): void {
		this.open = next;
		this.panel.classList.toggle("is-open", next);
		this.fab.setAttribute("aria-expanded", String(next));
		if (next && !this.busy)
			void refresh(this).catch((e: Error) => this.status(e.message, "bad"));
	}

	/** Runs an action, keeping the buttons locked until it ends. */
	async run(key: ActionKey): Promise<void> {
		const action = ACTIONS.find((a) => a.key === key);
		if (!action || this.busy) return;

		if (!this.open) this.toggle(true);
		this.setBusy(true);
		try {
			await action.run(this);
		} catch (e) {
			this.status((e as Error).message, "bad");
		} finally {
			this.setBusy(false);
		}
	}

	private onBeforeUnload = (e: BeforeUnloadEvent) => {
		if (this.busy) {
			e.preventDefault();
			e.returnValue =
				"Still working. What's already done stays done — leaving only cancels the rest.";
			return e.returnValue;
		}
	};

	stopped(): boolean {
		return this.stopping;
	}

	private setBusy(busy: boolean): void {
		this.busy = busy;
		this.fab.classList.toggle("is-busy", busy);
		this.panel.classList.toggle("is-running", busy);
		for (const b of this.buttons) b.disabled = busy;
		if (busy) {
			this.stopping = false;
			this.stopBtn.disabled = false;
			this.stopBtn.textContent = "Stop after this one";
			window.addEventListener("beforeunload", this.onBeforeUnload);
		} else {
			window.removeEventListener("beforeunload", this.onBeforeUnload);
			this.fab.title = "Subreddit Subscription Manager";
			this.ringFill.style.strokeDashoffset = String(RING);
			this.badge.textContent = "0%";
		}
	}

	// ---------- Report ----------

	count(n: number | null): void {
		const gen = ++this.anim;
		this.unit.textContent = "subreddits";
		this.bar.style.width = "0%";
		if (n === null) {
			this.figure.textContent = "—";
			this.shown = 0;
			return;
		}
		const from = this.shown;
		this.shown = n;
		const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduce || from === n) {
			this.figure.textContent = String(n);
			return;
		}
		const start = performance.now();
		const step = (now: number) => {
			if (gen !== this.anim) return; // something newer owns the figure now
			const t = Math.min((now - start) / 420, 1);
			this.figure.textContent = String(
				Math.round(from + (n - from) * EASE_OUT(t)),
			);
			if (t < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	}

	/** `headline` is the live subscription count; `done`/`total` drive the bar. */
	progress(verb: string, done: number, total: number, headline: number): void {
		this.anim++; // any count-up animation still running no longer owns the figure
		this.shown = headline;
		this.figure.textContent = String(headline);
		this.unit.textContent = `${verb} — ${done} of ${total}`;

		const pct = total > 0 ? done / total : 0;
		this.bar.style.width = `${pct * 100}%`;
		this.ringFill.style.strokeDashoffset = String(RING * (1 - pct));
		this.badge.textContent = `${Math.round(pct * 100)}%`;
		this.fab.title = `${verb} — ${done} of ${total}`;
	}

	status(text: string, tone?: "ok" | "bad"): void {
		this.statusEl.textContent = text;
		this.statusEl.className = `status${tone ? ` is-${tone}` : ""}`;
	}

	confirm(spec: ConfirmSpec): Promise<boolean> {
		return new Promise((resolve) => {
			const sheet = document.createElement("div");
			sheet.className = `sheet${spec.danger ? " is-danger" : ""}`;
			sheet.innerHTML = `
        <div class="sheet__title">${spec.title}</div>
        <div class="sheet__body">${spec.body}</div>
        ${spec.typed ? `<input class="sheet__input" placeholder="Type ${spec.typed} to confirm" aria-label="Type ${spec.typed} to confirm">` : ""}
        <div class="sheet__row">
          <button class="btn btn--cancel">Cancel</button>
          <button class="btn btn--go"${spec.typed ? " disabled" : ""}>${spec.action}</button>
        </div>`;

			const go = sheet.querySelector<HTMLButtonElement>(".btn--go")!;
			const input = sheet.querySelector<HTMLInputElement>(".sheet__input");
			const finish = (ok: boolean) => {
				sheet.remove();
				resolve(ok);
			};

			if (input) {
				input.addEventListener("input", () => {
					go.disabled = input.value.trim() !== spec.typed;
				});
				input.addEventListener("keydown", (e) => {
					if (e.key === "Enter" && !go.disabled) finish(true);
				});
			}
			go.addEventListener("click", () => finish(true));
			sheet
				.querySelector<HTMLButtonElement>(".btn--cancel")!
				.addEventListener("click", () => finish(false));

			this.panel.append(sheet);
			(input ?? go).focus();
		});
	}

	pickFile(): Promise<string | null> {
		return new Promise((resolve) => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".json,.txt,.csv,application/json,text/plain";

			// `cancel` is unsupported on older Safari, and a cancel we never hear
			// about leaves every button disabled for good. Regaining focus without
			// a file means the dialog closed empty.
			const done = (v: string | null | Promise<string>) => {
				window.removeEventListener("focus", onFocus);
				resolve(v as string | null);
			};
			const onFocus = () =>
				setTimeout(() => {
					if (!input.files?.length) done(null);
				}, 400);

			input.onchange = () => done(input.files?.[0]?.text() ?? null);
			input.oncancel = () => done(null);
			window.addEventListener("focus", onFocus);
			input.click();
		});
	}
}
