import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Collector } from '../collector';
import type { SiteRepository } from '../store';
import type { CollectionState, SiteRecord } from '../types';
import { App } from './App';
import { STYLES } from './styles';

let activeClose: (() => void) | null = null;

interface PanelRootProps {
  domain: string;
  repository: SiteRepository;
  collector: Collector;
  close: () => void;
  download: (name: string, content: string) => void;
}

function PanelRoot(props: PanelRootProps) {
  const [record, setRecord] = useState<SiteRecord | null>(null);
  const [records, setRecords] = useState<SiteRecord[]>([]);
  const [state, setState] = useState<CollectionState>({ status: 'idle', record: null });

  const reload = async () => {
    setRecord(await props.repository.get(props.domain));
    setRecords(await props.repository.list());
  };

  useEffect(() => {
    void reload();
    return props.collector.subscribe(props.domain, (next) => {
      setState(next);
      if (next.record) setRecord(next.record);
      void props.repository.list().then(setRecords);
    });
  }, [props.domain]);

  if (!record) return <div class="so-panel so-empty">Initializing local signal…</div>;

  return (
    <App
      domain={props.domain}
      currentRecord={record}
      records={records}
      collectionStatus={state.status}
      onRefresh={async (domain) => {
        await props.collector.collect(domain, true);
        await reload();
      }}
      onDelete={(domain) => {
        if (!confirm(`Delete ${domain} from SiteOrbit?`)) return;
        void props.repository.delete(domain).then(domain === props.domain ? props.close : reload);
      }}
      onClear={() => {
        if (confirm('Clear every SiteOrbit record?')) void props.repository.clear().then(props.close);
      }}
      onExport={() =>
        void props.repository.exportJson().then((json) => props.download('site-orbit.json', json))
      }
      onClose={props.close}
    />
  );
}

export async function mountPanel(
  domain: string,
  repository: SiteRepository,
  collector: Collector,
  download: (name: string, content: string) => void,
): Promise<void> {
  activeClose?.();
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const host = document.createElement('site-orbit-panel');
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  const container = document.createElement('div');
  container.style.display = 'contents';
  style.textContent = STYLES;
  root.append(style, container);
  document.documentElement.append(host);

  let closed = false;
  const onOutsidePointerDown = (event: PointerEvent) => {
    const path = event.composedPath();
    if (!path.includes(host)) {
      close();
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    window.removeEventListener('pointerdown', onOutsidePointerDown, true);
    render(null, container);
    host.remove();
    if (activeClose === close) activeClose = null;
    previousFocus?.focus();
  };
  activeClose = close;

  window.addEventListener('pointerdown', onOutsidePointerDown, true);

  render(
    <PanelRoot
      domain={domain}
      repository={repository}
      collector={collector}
      close={close}
      download={download}
    />,
    container,
  );
}

export function closePanel(): void {
  activeClose?.();
}

export function togglePanel(
  domain: string,
  repository: SiteRepository,
  collector: Collector,
  download: (name: string, content: string) => void,
): void {
  if (activeClose) {
    activeClose();
  } else {
    void mountPanel(domain, repository, collector, download);
  }
}
