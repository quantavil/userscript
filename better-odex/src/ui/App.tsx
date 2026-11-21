import { useEffect, useState } from 'preact/hooks';
import { formatDateDDMMYYYY } from '../core/validators';
import { renderElementToPdf } from '../pdf/pdfEngine';
import { purgeLegacyFab } from '../styles/pageStyles';
import { Icons } from './icons';
import { WorkspacePanel } from './WorkspacePanel';

const isNewVgmPage = (): boolean =>
  Boolean(document.getElementById('genVGMReqBtn')) ||
  window.location.pathname.includes('newPyrVGM');

const isSearchVgmPage = (): boolean =>
  Boolean(document.getElementById('vgmSerachTable'));

export function App() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pageState, setPageState] = useState(() => ({
    onNewPage: isNewVgmPage(),
    onSearchPage: isSearchVgmPage(),
  }));

  useEffect(() => {
    const updatePageState = () => {
      purgeLegacyFab();
      const nextNew = isNewVgmPage();
      const nextSearch = isSearchVgmPage();
      setPageState((prev) => {
        if (prev.onNewPage === nextNew && prev.onSearchPage === nextSearch) {
          return prev;
        }
        return { onNewPage: nextNew, onSearchPage: nextSearch };
      });
    };

    updatePageState();
    const observer = new MutationObserver(updatePageState);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener('popstate', updatePageState);
    window.addEventListener('hashchange', updatePageState);

    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', updatePageState);
      window.removeEventListener('hashchange', updatePageState);
    };
  }, []);

  const { onNewPage, onSearchPage } = pageState;

  useEffect(() => {
    if (!onNewPage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setPanelOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onNewPage]);

  if (!onNewPage && !onSearchPage) return null;

  const handleSearchPagePdf = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const filename = `Better_ODeX_eVGM_Report_${formatDateDDMMYYYY()}.pdf`;
      const pdf = await renderElementToPdf({
        element: document.body,
        filename,
        orientation: 'landscape',
        widthPx: Math.max(document.documentElement.scrollWidth, 1320),
        filterExcluded: true,
      });
      pdf.save();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {onNewPage && !panelOpen && (
        <button
          type="button"
          class={`launcher ${busy ? 'busy' : ''}`}
          onClick={() => setPanelOpen(true)}
          aria-label="Better ODeX"
          title="Better ODeX (Alt+V)"
        >
          <Icons.Fab size={22} />
        </button>
      )}

      {onSearchPage && !onNewPage && (
        <button
          type="button"
          class={`launcher ${busy ? 'busy' : ''}`}
          disabled={busy}
          onClick={handleSearchPagePdf}
          aria-label="Export PDF"
          title={busy ? 'Exporting PDF…' : 'Export PDF'}
        >
          <Icons.Download size={20} />
        </button>
      )}

      {onNewPage && panelOpen && (
        <WorkspacePanel onClose={() => setPanelOpen(false)} />
      )}
    </>
  );
}
