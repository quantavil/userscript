import { useEffect, useRef, useState } from "preact/hooks";
import { DEFAULT_SETTINGS, saveSettings, type AppSettings } from "../core/settings";
import { clearScrapedCache } from "../core/wishlist";
import { verifyProvider } from "../core/chat";
import { Drawer, type Notify } from "./shared";
const colors = [
  "#dc2626",
  "#be123c",
  "#ea580c",
  "#f59e0b",
  "#10b981",
  "#0d9488",
  "#2563eb",
  "#8b5cf6",
];
export function Settings({
  settings,
  onBack,
  notify,
  onReset,
}: {
  settings: AppSettings;
  onBack: () => void;
  notify: Notify;
  onReset: () => void;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const identity = JSON.stringify([settings.baseUrl, settings.model, settings.apiKey]);
  useEffect(() => {
    setStatus("");
    return () => {
      controller.current?.abort();
    };
  }, [identity]);
  const save = (patch: Partial<AppSettings>) => saveSettings({ ...settings, ...patch });
  return (
    <Drawer title="Settings" onBack={onBack}>
      <div class="aiw-drawer-body">
        <section class="aiw-settings-section-card">
          <h3 class="aiw-card-title">AI configuration</h3>
          {(
            [
              { key: "model", label: "Model name", placeholder: DEFAULT_SETTINGS.model },
              { key: "baseUrl", label: "API base URL", placeholder: DEFAULT_SETTINGS.baseUrl },
              { key: "apiKey", label: "API key", placeholder: "Enter API key…" },
            ] as const
          ).map((field) => (
            <div class="aiw-settings-row" key={field.key}>
              <label class="aiw-input-label" for={`settings-${field.key}`}>
                {field.label}
              </label>
              <input
                class="aiw-input-control"
                id={`settings-${field.key}`}
                type="text"
                style={field.key === "apiKey" ? { "-webkit-text-security": "disc" } : {}}
                autoComplete="off"
                spellcheck={false}
                placeholder={field.placeholder}
                value={settings[field.key]}
                onInput={(event) => save({ [field.key]: event.currentTarget.value })}
              />
            </div>
          ))}
          <button
            class="aiw-verify-btn"
            disabled={busy || !settings.apiKey}
            onClick={async () => {
              controller.current?.abort();
              const active = new AbortController();
              controller.current = active;
              setBusy(true);
              setStatus("Checking provider…");
              try {
                const result = await verifyProvider(settings, active.signal);
                if (!active.signal.aborted) setStatus(result);
              } catch (error) {
                if (!active.signal.aborted)
                  setStatus(error instanceof Error ? error.message : "Verification failed");
              } finally {
                if (controller.current === active) setBusy(false);
              }
            }}
          >
            {busy ? "Checking…" : "Verify provider"}
          </button>
          <p role="status">{status}</p>
        </section>
        <section class="aiw-settings-section-card">
          <h3 class="aiw-card-title">Accent palette</h3>
          <div class="aiw-dots-palette">
            {colors.map((color) => (
              <button
                key={color}
                class={`aiw-accent-dot ${settings.accentColor === color ? "active" : ""}`}
                aria-label={`Accent ${color}`}
                aria-pressed={settings.accentColor === color}
                style={{ backgroundColor: color }}
                onClick={() => save({ accentColor: color })}
              />
            ))}
          </div>
        </section>
        <section class="aiw-settings-section-card">
          <h3 class="aiw-card-title">Background scraping</h3>
          <label class="aiw-toggle-row">
            <span>Scrape details on heart click</span>
            <input
              type="checkbox"
              checked={settings.autocrawl}
              onChange={(event) => save({ autocrawl: event.currentTarget.checked })}
            />
          </label>
          <button
            class="aiw-sub-btn"
            onClick={() => {
              if (clearScrapedCache()) notify("Scraped specifications cache cleared");
            }}
          >
            Clear Scraped Cache
          </button>
        </section>
        <p class="aiw-storage-note">
          Settings and saved products stay in your userscript manager’s local storage. With an API
          key, chat sends the selected product context and recent exchanges to your configured
          provider. Price history opens PriceHistory.app.
        </p>
        <button class="aiw-sub-btn danger" onClick={onReset}>
          Reset all data…
        </button>
      </div>
    </Drawer>
  );
}
