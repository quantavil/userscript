import { beforeEach, describe, expect, it } from 'vitest';
import { scanResults } from './scanner';

const goTo = (url: string) => (window as any).happyDOM.setURL(url);

/** Result rows shaped like GitHub's React results list. */
function renderResults(...descriptions: string[]) {
  document.body.innerHTML = `<div data-testid="results-list">${descriptions
    .map(d => `<div class="row"><div class="search-title"><a href="/acme/repo">acme/repo</a></div><p>${d}</p></div>`)
    .join('')}</div>`;
  return Array.from(document.querySelectorAll<HTMLElement>('.row'));
}

const hidden = (row: Element) => row.classList.contains('ghf-hidden');

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('scanResults', () => {
  it('hides rows mentioning a hidden word', () => {
    goTo('https://github.com/search?q=x&ghf_hide=spam');
    const [clean, spammy] = renderResults('a real project', 'pure spam here');
    scanResults();

    expect(hidden(spammy!)).toBe(true);
    expect(hidden(clean!)).toBe(false);
  });

  it('matches whole words only', () => {
    goTo('https://github.com/search?q=x&ghf_hide=bot');
    const [robotics, telegram] = renderResults('robotics toolkit', 'a telegram bot');
    scanResults();

    expect(hidden(robotics!)).toBe(false);
    expect(hidden(telegram!)).toBe(true);
  });

  it('re-hides a row after React rewrites its className', () => {
    goTo('https://github.com/search?q=x&ghf_hide=spam');
    const [row] = renderResults('pure spam here');
    scanResults();
    expect(hidden(row!)).toBe(true);

    row!.className = 'row';
    scanResults();
    expect(hidden(row!)).toBe(true);
  });

  it('applies to any search type, not just repositories', () => {
    goTo('https://github.com/search?q=x&type=issues&ghf_hide=wontfix');
    const [row] = renderResults('wontfix, closing');
    scanResults();

    expect(hidden(row!)).toBe(true);
  });

  it('does nothing without a hide list', () => {
    goTo('https://github.com/search?q=x');
    const [row] = renderResults('pure spam here');
    scanResults();

    expect(hidden(row!)).toBe(false);
  });

  it('does nothing outside the search page', () => {
    goTo('https://github.com/acme/repo?ghf_hide=spam');
    const [row] = renderResults('pure spam here');
    scanResults();

    expect(hidden(row!)).toBe(false);
  });
});
