import { createChesscomAdapter } from './chesscom.js';
import { createPychessAdapter } from './pychess.js';
import { pageWindow, type SiteAdapter, type SiteRead } from './types.js';

let activeSite: SiteAdapter | null | undefined;

export function selectSite(hostname: string): SiteAdapter | null {
  if (hostname === 'chess.com' || hostname === 'www.chess.com') return createChesscomAdapter();
  if (hostname === 'pychess.org' || hostname === 'www.pychess.org') return createPychessAdapter();
  return null;
}

export function getSite(): SiteAdapter | null {
  if (activeSite === undefined) activeSite = selectSite(pageWindow().location.hostname);
  return activeSite;
}

export function readSite(): SiteRead {
  return getSite()?.read() ?? { kind: 'ineligible', reason: 'Unsupported site' };
}
