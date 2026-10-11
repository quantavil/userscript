import { boot } from './boot';
import { Collector } from './collector';
import { downloadJson, gmHttp, gmStorage, registerMenu } from './gm-runtime';
import { createServices } from './services';
import { SiteRepository } from './store';

const repository = new SiteRepository(gmStorage);
const collector = new Collector(repository, gmHttp, () => crypto.randomUUID());

void boot(location.href, createServices(repository, collector, downloadJson, registerMenu)).catch(
  (error: unknown) => {
    console.warn('[SiteOrbit] startup failed', error);
  },
);
