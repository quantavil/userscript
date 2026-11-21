import { render } from 'preact';
import { APP_HOST_ID } from './core/constants';
import { startEntityNormalizer } from './core/normalizer';
import { injectPageStyles, purgeLegacyFab } from './styles/pageStyles';
import { WORKSPACE_CSS } from './styles/workspaceStyles';
import { App } from './ui/App';

function bootstrap(): void {
  purgeLegacyFab();
  injectPageStyles();
  startEntityNormalizer();

  if (document.getElementById(APP_HOST_ID)) return;

  const host = document.createElement('div');
  host.id = APP_HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = WORKSPACE_CSS;

  const mount = document.createElement('div');
  shadow.append(style, mount);
  document.body.appendChild(host);

  render(<App />, mount);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
