import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({ url: 'https://example.com/login' });

// Human-like pacing (cursor glides, press holds, typing gaps) off: tests assert events, not timing.
import { timing } from '../src/dom/click.ts';

timing.scale = 0;
