import { render } from 'preact';
import { Panel } from './ui/Panel';
import css from './ui/styles.css?inline';
import { startKeepAwake } from './session/keep-awake';
import { startShippingBillEnhancements } from './shipping-bill/enhance';
import { startEsanchitHandoff } from './services/esanchit';
import { startDocumentTypeDropdown } from './esanchit/dropdown';
import { startEsanchitCopy } from './esanchit/copy';

const id = 'better-icegate-root';
if (!document.getElementById(id)) {
  if (location.hostname === 'foservices.icegate.gov.in') {
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
  } else {
    const marker = document.createElement('div');
    marker.id = id;
    marker.hidden = true;
    document.body.append(marker);
  }
  startDocumentTypeDropdown();
  startEsanchitCopy();
}
