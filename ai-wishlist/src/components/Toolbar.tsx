import { useEffect, useRef, useState } from "preact/hooks";
import type { SortKey } from "../core/pricing";
export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "dateAdded", label: "Date Added" },
  { key: "priceLow", label: "Price: Low → High" },
  { key: "priceHigh", label: "Price: High → Low" },
  { key: "nameAz", label: "Name: A → Z" },
];
export function Toolbar({
  query,
  setQuery,
  sort,
  setSort,
  platform,
  setPlatform,
}: {
  query: string;
  setQuery: (s: string) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  platform: string;
  setPlatform: (s: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener("click", outside);
    return () => document.removeEventListener("click", outside);
  }, []);
  return (
    <div class="aiw-toolbar">
      <div class="aiw-search-row">
        <input
          class="aiw-search-input"
          aria-label="Search wishlist"
          placeholder="Search wishlist…"
          value={query}
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
        {query && (
          <button class="aiw-clear-search" aria-label="Clear search" onClick={() => setQuery("")}>
            ×
          </button>
        )}
      </div>
      <div class="aiw-controls-row">
        <div
          class="aiw-sort-wrap"
          ref={wrapper}
          onKeyDown={(event) => {
            if (event.key === "Escape" && expanded) {
              event.stopPropagation();
              setExpanded(false);
              button.current?.focus();
            }
          }}
        >
          <button
            class="aiw-sort-btn"
            ref={button}
            aria-label="Sort wishlist"
            aria-expanded={expanded}
            aria-controls="aiw-sort-options"
            onClick={() => setExpanded(!expanded)}
          >
            {SORT_OPTIONS.find((option) => option.key === sort)?.label} ▾
          </button>
          {expanded && (
            <div id="aiw-sort-options" class="aiw-sort-dropdown aiw-open">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  class={`aiw-sort-item ${sort === option.key ? "active" : ""}`}
                  onClick={() => {
                    setSort(option.key);
                    setExpanded(false);
                    button.current?.focus();
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div class="aiw-pill-wrap">
          {["All", "Amazon", "Flipkart"].map((value) => (
            <button
              key={value}
              class={`aiw-pill ${platform === value ? "active" : ""}`}
              aria-pressed={platform === value}
              onClick={() => setPlatform(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
