import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { ChatSession } from "../core/chat";
import type { AppSettings } from "../core/settings";
import type { WishlistItem } from "../core/types";
import { formatMarkdownToHtml, sanitizeHtml } from "../utils/formatters";
import { Drawer, type Notify } from "./shared";
export function Chat({
  session,
  settings,
  items,
  onBack,
  notify,
}: {
  session: ChatSession;
  settings: AppSettings;
  items: WishlistItem[];
  onBack: () => void;
  notify: Notify;
}) {
  const [snapshot, setSnapshot] = useState(session.snapshot());
  const [query, setQuery] = useState("");
  const area = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => session.subscribe(() => setSnapshot(session.snapshot())), [session]);
  useEffect(() => {
    if (area.current) area.current.scrollTop = area.current.scrollHeight;
  }, [snapshot]);
  const send = (text: string) => {
    if (!text.trim() || snapshot.busy) return;
    setQuery("");
    void session.send(text, settings, items);
  };
  return (
    <Drawer title="AI Chat" onBack={onBack}>
      <div class="aiw-chat-actions">
        <button class="aiw-sub-btn" onClick={() => session.clear()}>
          Clear history
        </button>
      </div>
      <div class="aiw-chat-messages" ref={area} aria-label="Conversation" aria-live="polite">
        {!snapshot.messages.length && (
          <>
            <p>Compare your saved products, prices and specifications.</p>
            <div class="aiw-chat-suggestions">
              {["Compare specifications", "Find cheapest", "Summarize wishlist"].map((text) => (
                <button
                  key={text}
                  class="aiw-chat-suggestion-chip"
                  disabled={snapshot.busy}
                  onClick={() => send(text)}
                >
                  {text}
                </button>
              ))}
            </div>
          </>
        )}
        {snapshot.messages.map((message, index) => (
          <div key={index} class={`aiw-chat-bubble ${message.role === "user" ? "user" : "ai"}`}>
            {message.role === "user" ? (
              <div class="aiw-user-text">{message.text}</div>
            ) : (
              <>
                <div
                  class="aiw-chat-bubble-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(formatMarkdownToHtml(message.text)),
                  }}
                />
                <button
                  class="aiw-chat-copy-btn"
                  aria-label={`Copy response ${index}`}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(message.text);
                      notify("Response copied");
                    } catch {
                      notify("Could not copy response. Check clipboard permission.");
                    }
                  }}
                >
                  Copy
                </button>
              </>
            )}
          </div>
        ))}
        {snapshot.notice && (
          <p class="aiw-offline-banner" role="status">
            {snapshot.notice}
          </p>
        )}
        {snapshot.busy && <p role="status">Thinking…</p>}
        {snapshot.error && <p role="alert">{snapshot.error}</p>}
      </div>
      <form
        class="aiw-chat-input-area"
        onSubmit={(event) => {
          event.preventDefault();
          send(query);
        }}
      >
        <input
          class="aiw-chat-input"
          aria-label="Message"
          placeholder="Ask about your wishlist…"
          value={query}
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
        {snapshot.busy ? (
          <button type="button" class="aiw-chat-send-btn" onClick={() => session.stop()}>
            Stop
          </button>
        ) : (
          <button type="submit" class="aiw-chat-send-btn" disabled={!query.trim()}>
            Send
          </button>
        )}
      </form>
    </Drawer>
  );
}
