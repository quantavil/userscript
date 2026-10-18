// Account tools and progress, isolated from Reddit page styles.
// Lives in a shadow root so Reddit's stylesheet can't reach it.

import CSS from "./panel.css?inline";

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
		name: "Refresh counts",
		hint: "Read subscriptions and visible history counts",
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

function actionButton(action: (typeof ACTIONS)[number]): string {
	return `<button class="act${"danger" in action ? " is-danger" : ""}" data-key="${action.key}">
		<span class="ico" aria-hidden="true">${action.icon}</span>
		<span><span class="name">${action.name}</span><span class="hint">${action.hint}</span></span>
	</button>`;
}

export type ActionKey = (typeof ACTIONS)[number]["key"];

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
	private content!: HTMLElement;
	private activeResolve: ((ok: boolean) => void) | null = null;

	constructor() {
		const host = document.createElement("div");
		this.root = host.attachShadow({ mode: "open" });
		this.root.innerHTML = `
      <style>${CSS}</style>
      <div class="wrap">
        <div class="panel" role="dialog" aria-label="Reddit Manager" aria-hidden="true">
          <div class="content">
          <header class="head">
            <div><p class="eyebrow">REDDIT</p><h1>Account manager</h1></div>
            <button class="close" aria-label="Close">${svg('<path d="M4 4l8 8M12 4l-8 8"/>')}</button>
          </header>
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
            <div class="rule" role="progressbar" aria-label="Operation progress" aria-valuemin="0" aria-valuemax="100"><i></i></div>
          </div>
          <div class="actions">
            <h2 class="section-label">Your subscriptions</h2>
            <div class="tools">${ACTIONS.filter((a) => !("danger" in a)).map(actionButton).join("")}</div>
            <details class="cleanup">
              <summary>Account cleanup</summary>
              <p class="cleanup-note">Review each action before making changes.</p>
              ${ACTIONS.filter((a) => "danger" in a).map(actionButton).join("")}
            </details>
          </div>
          <div class="controls-running">
            <button class="btn-ctrl pause-btn">Pause</button>
            <button class="btn-ctrl cancel-btn">Cancel</button>
          </div>
          <div class="status" role="status" aria-live="polite" aria-atomic="true"></div>
          </div>
        </div>
        <button class="fab" aria-label="Reddit Manager" title="Reddit Manager" aria-expanded="false">
          <span class="fab-icon">${svg('<path d="M2.5 4.5h11M2.5 8h8M2.5 11.5h5"/>')}</span>
          <div class="fab-progress" aria-hidden="true">
            <svg class="progress-ring" width="48" height="48" viewBox="0 0 48 48">
              <circle class="ring-bg" cx="24" cy="24" r="20" fill="none" stroke="var(--line)" stroke-width="3"/>
              <circle class="ring-fill" cx="24" cy="24" r="20" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="${RING}" stroke-dashoffset="${RING}" stroke-linecap="round" transform="rotate(-90 24 24)"/>
            </svg>
            <span class="fab-badge">0%</span>
          </div>
        </button>
      </div>`;

		const $ = <T extends Element>(sel: string) => this.root.querySelector<T>(sel)!;
		this.panel = $(".panel");
		this.content = $(".content");
		this.panel.inert = true;
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
			if (!this.open) return;
			if (e.key === "Escape") {
				if (this.activeResolve) this.activeResolve(false);
				else this.toggle(false);
			}
			if (e.key === "Tab" && this.activeResolve) {
				const controls = [...this.root.querySelectorAll<HTMLElement>(".sheet input, .sheet button:not(:disabled)")];
				const first = controls[0];
				const last = controls.at(-1);
				if (e.shiftKey && this.root.activeElement === first) {
					e.preventDefault();
					last?.focus();
				} else if (!e.shiftKey && this.root.activeElement === last) {
					e.preventDefault();
					first?.focus();
				}
			}
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
		this.panel.inert = !next;
		this.fab.setAttribute("aria-expanded", String(next));
		const gen = ++this.refreshGen;
		if (!next) {
			this.activeResolve?.(false);
			this.fab.focus();
		} else {
			this.root.querySelector<HTMLButtonElement>(".close")?.focus();
			if (!this.busy) {
				const current = () => gen === this.refreshGen && this.open && !this.busy;
				void refresh({
					count: (n, stats) => { if (current()) this.count(n, stats); },
					status: (text, tone) => { if (current()) this.status(text, tone); },
					progress: () => {},
					confirm: async () => false,
					pickFile: async () => null,
				}).catch(() => {});
			}
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
		if (!busy) this.fab.classList.remove("is-busy");
		this.refreshGen++;
		if (!busy) this.panel.classList.remove("is-running");
		for (const b of this.buttons) b.disabled = busy;
		if (busy) {
			this.stopping = false;
			this.paused = false;
			this.pauseBtn.disabled = false;
			this.pauseBtn.textContent = "Pause";
			this.cancelBtn.disabled = false;
			this.cancelBtn.textContent = "Cancel";
		} else {
			window.removeEventListener("beforeunload", this.onBeforeUnload);
			this.fab.title = "Reddit Manager";
			this.ringFill.style.strokeDashoffset = String(RING);
			this.badge.textContent = "0%";
			this.progressLabel.textContent = "";
		}
	}

	// ---------- Report ----------

	count(n: number | null, stats?: { posts?: number | null; comments?: number | null }): void {
		this.bar.style.width = "0%";
		this.bar.parentElement?.removeAttribute("aria-valuenow");
		this.progressLabel.textContent = "";
		this.figSubs.textContent = n === null ? "—" : String(n);
		if (stats) {
			if ("posts" in stats) this.figPosts.textContent = stats.posts == null ? "—" : String(stats.posts);
			if ("comments" in stats) this.figComments.textContent = stats.comments == null ? "—" : String(stats.comments);
		}
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

		this.panel.classList.add("is-running");
		this.fab.classList.add("is-busy");
		window.addEventListener("beforeunload", this.onBeforeUnload);
		const pct = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
		this.bar.parentElement?.setAttribute("aria-valuenow", String(Math.round(pct * 100)));
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
		if (!this.open) return Promise.resolve(false);
		this.activeResolve?.(false);
		return new Promise((resolve) => {
			const previousFocus = this.root.activeElement as HTMLElement | null;
			this.content.hidden = true;
			const sheet = document.createElement("div");
			sheet.className = `sheet${spec.danger ? " is-danger" : ""}`;

			const card = document.createElement("div");
			card.className = "sheet__card";
			card.setAttribute("role", "group");
			card.setAttribute("aria-labelledby", "confirmation-title");
			card.setAttribute("aria-describedby", "confirmation-body");

			const badge = document.createElement("div");
			badge.className = "sheet__badge";
			badge.innerHTML = spec.danger
				? svg('<path d="M8 2l6 11H2L8 2zM8 6v3M8 11h.01"/>')
				: svg('<path d="M8 2.5v11M2.5 8h11"/>');

			const titleEl = document.createElement("div");
			titleEl.className = "sheet__title";
			titleEl.id = "confirmation-title";
			titleEl.textContent = spec.title;

			const bodyEl = document.createElement("div");
			bodyEl.className = "sheet__body";
			bodyEl.id = "confirmation-body";
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
				this.content.hidden = false;
				previousFocus?.focus();
				resolve(ok);
			};
			this.activeResolve = finish;

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
			(input ?? cancelBtn).focus();
		});
	}

	pickFile(): Promise<string | null> {
		return new Promise((resolve) => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".json,.txt,.csv,application/json,text/plain";

			const done = (file: File | null) => {
				input.remove();
				if (!file) resolve(null);
				else file.text().then(resolve, (error: Error) => {
					this.status(`Couldn't read file: ${error.message}`, "bad");
					resolve(null);
				});
			};
			input.onchange = () => done(input.files?.[0] ?? null);
			input.oncancel = () => done(null);
			input.hidden = true;
			this.root.append(input);
			input.click();
		});
	}
}
