import { GM_registerMenuCommand, GM_setClipboard } from '$';
import { getComments, getQuestion } from './api';
import { currentSlug, installCapture } from './capture';
import { languageLabel, readCode } from './editor';
import { setCopyState, startInjection } from './inject';
import { buildMarkdown, formatTokens, pickSnippet } from './markdown';
import { getFailure, loadSettings } from './store';
import { openSettings, toast } from './ui/host';

// Must run before the app boots so submission results are captured.
installCapture();

async function copyText(text: string): Promise<void> {
  try {
    GM_setClipboard(text, 'text'); // no user-gesture requirement, unlike the async clipboard API
  } catch {
    await navigator.clipboard.writeText(text);
  }
}

async function copyProblem(btn: HTMLElement): Promise<void> {
  setCopyState(btn, 'busy');
  try {
    const slug = currentSlug();
    if (!slug) throw new Error('Not on a problem page');
    const s = loadSettings();
    const q = await getQuestion(slug);

    let comments: Awaited<ReturnType<typeof getComments>> = [];
    let commentsFailed = false;
    if (s.comments) {
      try {
        comments = await getComments(slug, s.commentCount);
      } catch (err) {
        commentsFailed = true;
        console.warn('[Better LeetCode] comments failed:', err);
      }
    }

    const ed = s.currentCode || s.codeTemplate ? readCode() : null;
    const snippet = pickSnippet(q, languageLabel(), ed?.monacoLang ?? null);
    const md = buildMarkdown(q, s, {
      comments,
      template: s.codeTemplate ? snippet : null,
      editor:
        s.currentCode && ed
          ? { code: ed.code, label: snippet?.lang ?? '', langSlug: snippet?.langSlug ?? '', partial: ed.partial }
          : null,
      fail: s.failingTest ? getFailure(slug) : null,
    });

    await copyText(md);
    setCopyState(btn, 'done');

    const notes = [commentsFailed && 'comments unavailable', ed?.partial && s.currentCode && 'code may be incomplete'];
    const suffix = notes.filter(Boolean).join(', ');
    toast(`Copied (${formatTokens(md)})${suffix ? ` - ${suffix}` : ''}`, suffix ? 'warn' : 'ok');
  } catch (err) {
    console.warn('[Better LeetCode] copy failed:', err);
    setCopyState(btn, 'error');
    toast(err instanceof Error ? err.message : 'Copy failed', 'error');
  }
}

function boot(): void {
  startInjection((btn) => void copyProblem(btn), openSettings);
  GM_registerMenuCommand('Better LeetCode settings', openSettings);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
