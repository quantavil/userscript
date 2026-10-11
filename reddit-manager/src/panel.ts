// The floating readout: a count of your subreddits and operations.
// Lives in a shadow root so Reddit's stylesheet can't reach it.

import type { ConfirmSpec, ProgressMetric, Report } from "./portability";
import {
	deleteAccount,
	deleteAllComments,
	deleteAllPosts,
	exportSubs,
	importSubs,
	leaveAll,
	refresh,
} from "./portability";

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
		run: (r: Report) => refresh(r, true, true).then(() => undefined),
	},
	{
		key: "leave",
		name: "Leave all",
		hint: "Unsubscribe from every subreddit",
		icon: svg('<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/>'),
		run: leaveAll,
		danger: true,
	},
	{
		key: "deletePosts",
		name: "Delete visible posts",
		hint: "Overwrite & delete up to 1,000 visible posts",
		icon: svg('<path d="M3 4h10M5 4v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4M6 2h4"/>'),
		run: deleteAllPosts,
		danger: true,
	},
	{
		key: "deleteComments",
		name: "Delete visible comments",
		hint: "Overwrite & delete up to 1,000 visible comments",
		icon: svg('<path d="M3 3h10v7H6l-3 3V3z"/>'),
		run: deleteAllComments,
		danger: true,
	},
	{
		key: "deleteAccount",
		name: "Open account deletion page",
		hint: "Navigate to official account deletion",
		icon: svg('<path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1.5c-3 0-5.5 2-5.5 4.5v.5h11v-.5c0-2.5-2.5-4.5-5.5-4.5z"/>'),
		run: deleteAccount,
		danger: true,
	},
] as const;

export type ActionKey = (typeof ACTIONS)[number]["key"];

const CSS = `
:host {
  position: fixed;
  right: 24px;
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
  max-height: calc(100vh - 120px - env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--ink);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, .55);
  transform-origin: bottom right;
  opacity: 0;
  transform: translateY(10px) scale(.96);
  pointer-events: none;
  visibility: hidden;
  transition: opacity .16s ease, transform .22s cubic-bezier(.2,.9,.3,1), visibility .16s ease;
}
.panel.is-open { opacity: 1; transform: none; pointer-events: auto; visibility: visible; }

.head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 0; }
.eyebrow { font-size: 10px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); }
.close { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 8px; margin: -8px -8px -8px 0; line-height: 0; border-radius: 4px; }
.close:hover { color: var(--chalk); }

.readout { padding: 12px 14px 14px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center; }
.stat-cell { display: flex; flex-direction: column; align-items: center; }
.figure {
  font: 700 20px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.02em;
  color: var(--amber);
}
.unit { margin-top: 4px; font-size: 9px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.progress-label { margin-top: 6px; font-size: 11px; font-weight: 600; color: var(--muted); min-height: 14px; text-align: center; }
.progress-label:empty { display: none; }
.rule { margin-top: 8px; height: 2px; background: var(--line); }
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
  display: flex; align-items: center; justify-content: center;
  padding: 14px;
  background: rgba(15, 18, 23, 0.88);
  backdrop-filter: blur(6px);
  z-index: 20;
  animation: fadeIn .16s ease;
}
.sheet__card {
  position: relative;
  width: 100%;
  max-width: 264px;
  background: #1c2026;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px 14px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: popIn .2s cubic-bezier(.2,.9,.3,1) both;
}
.sheet.is-danger .sheet__card {
  border-color: rgba(245, 158, 11, 0.35);
  background-image: repeating-linear-gradient(45deg, rgba(245, 158, 11, .06) 0 2px, transparent 2px 6px);
}
.sheet__badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(245, 158, 11, 0.14); color: var(--amber);
  margin-bottom: 2px;
}
.sheet.is-danger .sheet__badge {
  background: rgba(245, 158, 11, 0.18); color: var(--amber);
}
.sheet__title { font-size: 14px; font-weight: 700; letter-spacing: -.01em; color: var(--chalk); }
.sheet__body { font-size: 11.5px; line-height: 1.45; color: var(--muted); }
.sheet__input {
  width: 100%; padding: 9px 10px;
  font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--chalk); background: var(--plate);
  border: 1px solid var(--line); border-radius: 8px;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.sheet__input:focus { outline: none; border-color: var(--amber); box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2); }
.sheet__row { display: flex; gap: 8px; margin-top: 4px; }
.btn { flex: 1; padding: 9px; border: 1px solid var(--line); border-radius: 8px; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; transition: background .15s ease; }
.btn:hover { background: var(--plate); }
.btn--go { background: var(--amber); border-color: var(--amber); color: #17130a; }
.btn--go:hover:not(:disabled) { background: #ffc76e; }
.btn--go:disabled { background: transparent; border-color: var(--line); color: var(--muted); opacity: .5; cursor: default; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes popIn { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }

.panel.is-open .act { animation: rise .26s cubic-bezier(.2,.9,.3,1) both; }
.panel.is-open .act:nth-child(1) { animation-delay: .04s; }
.panel.is-open .act:nth-child(2) { animation-delay: .07s; }
.panel.is-open .act:nth-child(3) { animation-delay: .10s; }
.panel.is-open .act:nth-child(4) { animation-delay: .13s; }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } }

.controls-running {
  display: none;
  gap: 8px;
  padding: 8px 14px;
  border-top: 1px solid var(--line);
}
.panel.is-running .controls-running { display: flex; }
.btn-ctrl {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--plate);
  color: var(--chalk);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}
.btn-ctrl:hover:not(:disabled) { background: rgba(236, 238, 242, 0.12); }
.btn-ctrl.cancel-btn { color: #f87171; border-color: rgba(248, 113, 113, 0.3); }
.btn-ctrl.cancel-btn:hover:not(:disabled) { background: rgba(248, 113, 113, 0.15); }
.btn-ctrl:disabled { opacity: .4; cursor: default; }

@media (prefers-reduced-motion: reduce) {
  .fab, .panel, .rule > i, .act { transition: none; animation: none; }
}

@media (max-width: 480px) {
  :host { right: 12px; bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }
  .panel { width: min(320px, calc(100vw - 24px)); }
  .fab { width: 52px; height: 52px; }
  .act { padding: 13px 14px; }
  .btn { padding: 12px; }
  .sheet__input { padding: 10px; font-size: 16px; }
}
`;

const RING = 2 * Math.PI * 20;

export class Panel implements Report {
	readonly root: ShadowRoot;
	private panel!: HTMLElement;
	private fab!: HTMLElement;
	private ringFill!: SVGCircleElement;
	private badge!: HTMLElement;
	private figSubs!: HTMLElement;
	private figPosts!: HTMLElement;
	private figComments!: HTMLElement;
	private progressLabel!: HTMLElement;
	private bar!: HTMLElement;
	private statusEl!: HTMLElement;
	private pauseBtn!: HTMLButtonElement;
	private cancelBtn!: HTMLButtonElement;
	private buttons: HTMLButtonElement[] = [];
	private busy = false;
	private open = false;
	private paused = false;
	private stopping = false;
	private refreshGen = 0;
	private activeResolve: ((ok: boolean) => void) | null = null;

	constructor() {
		const host = document.createElement("div");
		this.root = host.attachShadow({ mode: "open" });
		this.root.innerHTML = `
      <style>${CSS}</style>
      <div class="wrap">
        <div class="panel" role="dialog" aria-label="Reddit Manager" aria-hidden="true">
          <div class="head">
            <span class="eyebrow">Dashboard</span>
            <button class="close" aria-label="Close">${svg('<path d="M4 4l8 8M12 4l-8 8"/>')}</button>
          </div>
          <div class="readout">
            <div class="stats-grid">
              <div class="stat-cell">
                <div class="figure fig-subs">—</div>
                <div class="unit">Subreddits</div>
              </div>
              <div class="stat-cell">
                <div class="figure fig-posts">—</div>
                <div class="unit">Posts</div>
              </div>
              <div class="stat-cell">
                <div class="figure fig-comments">—</div>
                <div class="unit">Comments</div>
              </div>
            </div>
            <div class="progress-label"></div>
            <div class="rule"><i></i></div>
          </div>
          <div class="actions">${ACTIONS.map(
						(a) => `
            <button class="act${"danger" in a ? " is-danger" : ""}" data-key="${a.key}">
              <span class="ico">${a.icon}</span>
              <span><span class="name">${a.name}</span><span class="hint">${a.hint}</span></span>
            </button>`,
					).join("")}</div>
          <div class="controls-running">
            <button class="btn-ctrl pause-btn">Pause</button>
            <button class="btn-ctrl cancel-btn">Cancel</button>
          </div>
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
		this.figSubs = $(".fig-subs");
		this.figPosts = $(".fig-posts");
		this.figComments = $(".fig-comments");
		this.progressLabel = $(".progress-label");
		this.bar = $(".rule > i");
		this.statusEl = $(".status");
		this.pauseBtn = $(".pause-btn");
		this.cancelBtn = $(".cancel-btn");
		this.buttons = [...this.root.querySelectorAll<HTMLButtonElement>(".act")];

		this.fab.addEventListener("click", () => this.toggle());
		$(".close").addEventListener("click", () => this.toggle(false));
		this.pauseBtn.addEventListener("click", () => {
			this.paused = !this.paused;
			this.pauseBtn.textContent = this.paused ? "Resume" : "Pause";
			if (this.paused) {
				this.status("Operation paused", "bad");
			} else {
				this.status("");
			}
		});
		this.cancelBtn.addEventListener("click", () => {
			this.stopping = true;
			this.paused = false;
			this.cancelBtn.disabled = true;
			this.cancelBtn.textContent = "Cancelling…";
			this.status("Cancelling after current item…", "bad");
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
		this.panel.setAttribute("aria-hidden", String(!next));
		this.panel.style.visibility = next ? "visible" : "hidden";
		this.fab.setAttribute("aria-expanded", String(next));

		if (!next) {
			this.fab.focus();
			if (this.activeResolve) {
				const resolve = this.activeResolve;
				this.activeResolve = null;
				resolve(false);
			}
		}

		if (next && !this.busy) {
			const gen = ++this.refreshGen;
			refresh(this, false, false)
				.then(() => {
					if (gen !== this.refreshGen) return;
				})
				.catch((e: Error) => {
					if (gen === this.refreshGen) this.status(e.message, "bad");
				});
		}
	}

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

	isPaused(): boolean {
		return this.paused;
	}

	private setBusy(busy: boolean): void {
		this.busy = busy;
		this.fab.classList.toggle("is-busy", busy);
		this.panel.classList.toggle("is-running", busy);
		for (const b of this.buttons) b.disabled = busy;
		if (busy) {
			this.stopping = false;
			this.paused = false;
			this.pauseBtn.disabled = false;
			this.pauseBtn.textContent = "Pause";
			this.cancelBtn.disabled = false;
			this.cancelBtn.textContent = "Cancel";
			window.addEventListener("beforeunload", this.onBeforeUnload);
		} else {
			window.removeEventListener("beforeunload", this.onBeforeUnload);
			this.fab.title = "Subreddit Subscription Manager";
			this.ringFill.style.strokeDashoffset = String(RING);
			this.badge.textContent = "0%";
			this.progressLabel.textContent = "";
		}
	}

	// ---------- Report ----------

	count(n: number | null, stats?: { posts?: number | null; comments?: number | null }): void {
		this.bar.style.width = "0%";
		this.progressLabel.textContent = "";
		this.figSubs.textContent = n === null ? "—" : String(n);
		this.figPosts.textContent =
			stats?.posts == null ? "—" : String(stats.posts);
		this.figComments.textContent =
			stats?.comments == null ? "—" : String(stats.comments);
	}

	progress(
		verb: string,
		done: number,
		total: number,
		headline?: number,
		metric: ProgressMetric = "subs",
	): void {
		this.progressLabel.textContent = `${verb} — ${done} of ${total}`;
		if (headline != null) {
			if (metric === "posts") {
				this.figPosts.textContent = String(headline);
			} else if (metric === "comments") {
				this.figComments.textContent = String(headline);
			} else {
				this.figSubs.textContent = String(headline);
			}
		}

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
			this.activeResolve = resolve;

			const sheet = document.createElement("div");
			sheet.className = `sheet${spec.danger ? " is-danger" : ""}`;

			const card = document.createElement("div");
			card.className = "sheet__card";

			const badge = document.createElement("div");
			badge.className = "sheet__badge";
			badge.innerHTML = spec.danger
				? svg('<path d="M8 2l6 11H2L8 2zM8 6v3M8 11h.01"/>')
				: svg('<path d="M8 2.5v11M2.5 8h11"/>');

			const titleEl = document.createElement("div");
			titleEl.className = "sheet__title";
			titleEl.textContent = spec.title;

			const bodyEl = document.createElement("div");
			bodyEl.className = "sheet__body";
			bodyEl.textContent = spec.body;

			card.append(badge, titleEl, bodyEl);

			let input: HTMLInputElement | null = null;
			if (spec.typed) {
				input = document.createElement("input");
				input.className = "sheet__input";
				input.placeholder = `Type ${spec.typed} to confirm`;
				input.setAttribute("aria-label", `Type ${spec.typed} to confirm`);
				card.append(input);
			}

			const row = document.createElement("div");
			row.className = "sheet__row";

			const cancelBtn = document.createElement("button");
			cancelBtn.className = "btn btn--cancel";
			cancelBtn.textContent = "Cancel";

			const goBtn = document.createElement("button");
			goBtn.className = "btn btn--go";
			goBtn.textContent = spec.action;
			if (spec.typed) goBtn.disabled = true;

			row.append(cancelBtn, goBtn);
			card.append(row);
			sheet.append(card);

			const finish = (ok: boolean) => {
				this.activeResolve = null;
				sheet.remove();
				resolve(ok);
			};

			if (input) {
				input.addEventListener("input", () => {
					goBtn.disabled = input.value.trim() !== spec.typed;
				});
				input.addEventListener("keydown", (e) => {
					if (e.key === "Enter" && !goBtn.disabled) finish(true);
				});
			}
			goBtn.addEventListener("click", () => finish(true));
			cancelBtn.addEventListener("click", () => finish(false));

			this.panel.append(sheet);
			(input ?? goBtn).focus();
		});
	}

	pickFile(): Promise<string | null> {
		return new Promise((resolve) => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".json,.txt,.csv,application/json,text/plain";

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
