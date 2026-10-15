import { useEffect, useRef, useState } from "preact/hooks";
import type { WishlistItem } from "../core/types";
import { addItem, removeItem } from "../core/wishlist";
import { currencyFor } from "../core/pricing";
import { fmtPrice } from "../utils/formatters";
import { ICON } from "../core/icons";
import { HistoryLink } from "./HistoryLink";
import { Icon, type Notify } from "./shared";
function Thumbnail({ item }: { item: WishlistItem }) {
  const [source, setSource] = useState(item.imageUrl);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallbackTried = useRef(false);
  const alive = useRef(true);
  const handle = useRef<ReturnType<typeof GM_xmlhttpRequest>>(undefined);
  useEffect(
    () => () => {
      alive.current = false;
      handle.current?.abort();
    },
    [],
  );
  const fallback = () => {
    if (
      fallbackTried.current ||
      !item.imageUrl.startsWith("https://") ||
      typeof GM_xmlhttpRequest === "undefined"
    ) {
      setFailed(true);
      return;
    }
    fallbackTried.current = true;
    handle.current = GM_xmlhttpRequest({
      method: "GET",
      url: item.imageUrl,
      responseType: "blob",
      timeout: 20_000,
      onload: (response) => {
        if (response.status !== 200 || !(response.response instanceof Blob)) {
          if (alive.current) setFailed(true);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (alive.current && typeof reader.result === "string") setSource(reader.result);
        };
        reader.onerror = () => {
          if (alive.current) setFailed(true);
        };
        reader.readAsDataURL(response.response);
      },
      onerror: () => {
        if (alive.current) setFailed(true);
      },
      ontimeout: () => {
        if (alive.current) setFailed(true);
      },
    });
  };
  return (
    <div class="aiw-thumb">
      {!loaded && (
        <div class={`aiw-thumb-fallback ${item.platform.toLowerCase()}`}>
          {item.platform === "Amazon" ? "A" : "F"}
        </div>
      )}
      {source && !failed && (
        <img
          class="aiw-thumb-img"
          src={source}
          alt=""
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={fallback}
        />
      )}
    </div>
  );
}
export function WishlistRow({ item, notify }: { item: WishlistItem; notify: Notify }) {
  return (
    <article class="aiw-item-row">
      <div class="aiw-item-platform" title={`Saved from ${item.platform}`}>
        <Icon svg={item.platform === "Amazon" ? ICON.amazon(18, 18) : ICON.flipkart(18, 18)} />
      </div>
      <Thumbnail item={item} />
      <div class="aiw-item-details">
        <a class="aiw-item-title" href={item.url} target="_blank" rel="noopener noreferrer">
          {item.title}
        </a>
        <div class="aiw-item-meta">
          <span class="aiw-item-price">{fmtPrice(item.price, currencyFor(item.url))}</span>
          <HistoryLink url={item.url} title={item.title} />
        </div>
      </div>
      <button
        class="aiw-item-remove"
        aria-label={`Remove ${item.title} from wishlist`}
        onClick={() => {
          if (removeItem(item.id))
            notify("Item removed", () => {
              if (addItem(item)) notify("Item restored");
            });
        }}
      >
        <Icon svg={ICON.close(14)} />
      </button>
    </article>
  );
}
