import { useEffect, useState } from 'preact/hooks';
import { addFavorite, defaults, removeFavorite, type Favorite } from '../favorites/model';
import { isFavoritesStorageEvent, loadFavorites, saveFavorites } from '../favorites/storage';
import { paginationEnabled, setPaginationEnabled, isPaginationStorageEvent } from '../settings/pagination';
import { openEsanchit } from '../services/esanchit';

function openFavorite(item: Favorite) {
  // The native eSANCHIT action may establish its own SSO session first.
  if (item.id === 'esanchit') {
    openEsanchit(); return;
  }
  // An opener is necessary for ICEGATE's per-tab sessionStorage to be copied.
  window.open(item.url, '_blank');
}

export function Panel() {
  const [items, setItems] = useState(loadFavorites);
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pagination, setPagination] = useState(paginationEnabled);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (isPaginationStorageEvent(event)) setPagination(paginationEnabled());
      if (isFavoritesStorageEvent(event)) setItems(loadFavorites());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const [message, setMessage] = useState('');
  const update = (next: Favorite[]) => { setItems(next); saveFavorites(next); };
  const addCurrent = () => {
    const url = location.href;
    if (location.hash.includes('role-dashboardView') || location.hash === '#/login') { setMessage('Open a service page first, then save it here.'); return; }
    const label = window.prompt('Name this shortcut:', document.title.trim() || 'ICEGATE page')?.trim();
    if (!label) return;
    const current = loadFavorites();
    const next = addFavorite(current, { id: `page:${url}`, label, url });
    if (next === current) { setMessage('This page is already saved or cannot be saved.'); return; }
    update(next); setMessage('Shortcut saved.');
  };
  return <aside class="panel" aria-label="Better ICEGATE shortcuts">
    <div class="bar"><span class="brand"><span class="star">★</span> Better ICEGATE</span><button class="header-button" aria-label="Settings" aria-expanded={settingsOpen} onClick={() => { setSettingsOpen(!settingsOpen); setExpanded(true); }}>⚙</button><button class="header-button chevron" aria-label={expanded ? 'Collapse' : 'Expand'} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '−' : '+'}</button></div>
    {expanded && <div class="body">
      {settingsOpen ? <div class="settings"><span>Shipping Bill pagination</span><button class="switch" role="switch" aria-label="Shipping Bill pagination" aria-checked={pagination} onClick={() => { const enabled = !pagination; setPagination(enabled); setPaginationEnabled(enabled); }}><span /></button></div> : <>
      <div class="list">{items.map((item) => <div class="row" key={item.id}>
        <button class="shortcut" onClick={() => openFavorite(item)} title={`Open ${item.label} in a new tab`}><span class="star">★</span><span>{item.label}</span><span class="arrow">↗</span></button>
        {editing && <button class="remove" aria-label={`Remove ${item.label}`} onClick={() => update(removeFavorite(loadFavorites(), item.id))}>×</button>}
      </div>)}</div>
      {!items.length && <p class="hint">No shortcuts yet. Add this page or restore the defaults.</p>}
      <div class="actions"><button onClick={addCurrent}>＋ Save this page</button><button onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</button></div>
      {editing && <button class="restore" onClick={() => { update([...defaults]); setMessage('Default shortcuts restored.'); }}>Restore defaults</button>}
      {message && <p class="message" role="status">{message}</p>}
      </>}
    </div>}
  </aside>;
}
