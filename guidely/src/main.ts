import { onReady, enableCopy } from './utils';
import { injectUI } from './ui';

onReady(() => {
  enableCopy();
  injectUI();
});
