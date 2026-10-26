import { render } from 'preact';
import { Panel } from './ui/Panel';
import css from './ui/styles.css?inline';
import { startKeepAwake } from './session/keep-awake';
import { startShippingBillEnhancements } from './shipping-bill/enhance';
import { startEsanchitHandoff } from './services/esanchit';

const id = 'better-icegate-root';
if (!document.getElementById(id)) {
  const host = document.createElement('div');
  host.id = id;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  shadow.append(style);
  const root = document.createElement('div');
  shadow.append(root);
  document.body.append(host);
  render(<Panel />, root);
  startKeepAwake();
  startShippingBillEnhancements();
  startEsanchitHandoff();
}
