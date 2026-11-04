import { expect, test, vi } from 'vite-plus/test';
import { observeUpdates } from './observer';

test('refreshes only the changed row and ignores unrelated updates', async () => {
  document.body.innerHTML =
    '<table><tbody><tr class="zA"><td><span>subject</span></td></tr><tr class="zA"><td>other</td></tr></tbody></table><aside></aside>';
  const rows = vi.fn();
  const stop = observeUpdates(rows);
  document.querySelector('aside')!.textContent = 'unrelated';
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(rows).not.toHaveBeenCalled();
  document.querySelector('tr span')!.textContent = 'changed';
  await vi.waitFor(() => expect(rows).toHaveBeenCalledTimes(1));
  expect(rows).toHaveBeenCalledWith(document.querySelector('tr'));
  stop();
});

test('detects added rows', async () => {
  document.body.innerHTML =
    '<main><div role="listitem"><div download_url="application/pdf:a.pdf:https://mail.google.com/a"></div></div></main><table><tbody></tbody></table>';
  const rows = vi.fn();
  const stop = observeUpdates(rows);
  const row = document.createElement('tr');
  row.className = 'zA';
  document.querySelector('tbody')!.append(row);
  document.querySelector('[role="listitem"]')!.remove();
  await vi.waitFor(() => expect(rows).toHaveBeenCalledTimes(1));
  expect(rows).toHaveBeenCalledWith(row);
  stop();
});

test('ignores Gmail selection changes but refreshes changed message content', async () => {
  document.body.innerHTML =
    '<table><tbody><tr class="zA"><td><div class="afn">Not selected</div><span class="bog">Subject</span></td></tr></tbody></table>';
  const rows = vi.fn();
  const stop = observeUpdates(rows);
  document.querySelector('.afn')!.textContent = 'Selected';
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(rows).not.toHaveBeenCalled();
  document.querySelector('.bog')!.textContent = 'Changed';
  await vi.waitFor(() => expect(rows).toHaveBeenCalledTimes(1));
  stop();
});

test('ignores insertion of a reveal control inside a message', async () => {
  document.body.innerHTML =
    '<main role="main"><div role="listitem"><div class="a3s"><p>Message</p></div></div></main>';
  const conversation = vi.fn();
  const stop = observeUpdates(vi.fn(), conversation);
  const button = document.createElement('button');
  button.className = 'bgm-reveal';
  document.querySelector('.a3s')!.append(button);
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(conversation).not.toHaveBeenCalled();
  stop();
});
