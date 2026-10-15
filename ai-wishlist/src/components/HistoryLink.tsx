import { getPriceHistoryUrl } from "../utils/urlCleaner";
export function HistoryLink({ url, title }: { url: string; title: string }) {
  const href = getPriceHistoryUrl(url);
  return (
    href && (
      <a
        class="aiw-history-link"
        data-aiw-owned=""
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Price history for ${title}`}
        title="Price history on PriceHistory.app"
        onClick={(event) => event.stopPropagation()}
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 3v18h18M6 16l5-6 4 3 6-8" />
        </svg>
      </a>
    )
  );
}
