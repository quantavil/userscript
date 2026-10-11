import { setActiveSite } from './active.js';
import { createChesscomAdapter } from './chesscom.js';
import { createLichessAdapter } from './lichess.js';
import { createPychessAdapter } from './pychess.js';
import { pageWindow, type SiteAdapter, type SiteRead } from './types.js';

let activeSite: SiteAdapter | null | undefined;

export function selectSite(hostname: string, page?: () => Window): SiteAdapter | null {
  if (hostname === 'chess.com' || hostname === 'www.chess.com') return createChesscomAdapter();
  if (hostname === 'pychess.org' || hostname === 'www.pychess.org') return createPychessAdapter();
  if (hostname === 'lichess.org' || hostname === 'www.lichess.org') return createLichessAdapter(page);
  return null;
}

export function getSite(): SiteAdapter | null {
  if (activeSite === undefined) {
    activeSite = selectSite(pageWindow().location.hostname);
    setActiveSite(activeSite);
  }
  return activeSite;
}

export function readSite(): SiteRead {
  return getSite()?.read() ?? { kind: 'ineligible', reason: 'Unsupported site' };
}
