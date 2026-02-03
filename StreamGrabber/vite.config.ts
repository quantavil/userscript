import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'StreamGrabber',
        namespace: 'https://github.com/streamgrabber-lite',
        version: '2.1.0',
        description: 'Lightweight HLS/Video downloader. Pause/Resume. AES-128. fMP4. Mobile + Desktop.',
        author: 'StreamGrabber',
        license: 'MIT',
        match: ['*://*/*'],
        exclude: [
          // Social & Streaming
          '*://*.youtube.com/*',
          '*://*.youtu.be/*',
          '*://*.x.com/*',
          '*://*.twitch.tv/*',
          '*://*.reddit.com/*',
          '*://*.redd.it/*',
          '*://*.facebook.com/*',
          '*://*.instagram.com/*',
          '*://*.tiktok.com/*',
          '*://*.netflix.com/*',
          '*://*.hulu.com/*',
          '*://*.disneyplus.com/*',
          '*://*.primevideo.com/*',
          '*://*.spotify.com/*',
          // Music
          '*://music.youtube.com/*',
          '*://*.soundcloud.com/*',
          '*://*.deezer.com/*',
          // Security
          '*://*.lastpass.com/*',
          '*://*.1password.com/*',
          '*://*.bitwarden.com/*',
          '*://*.dashlane.com/*',
          // Misc
          '*://*.irctc.co.in/*',
        ],
        'run-at': 'document-start',
        grant: [
          'GM_xmlhttpRequest',
          'GM_addStyle',
          'GM_getValue',
          'GM_setValue',
          'GM_download',
          'GM_notification',
          'GM_registerMenuCommand',
          'unsafeWindow',
        ],
        connect: ['*'],
      },
      build: {
        fileName: 'streamgrabber.user.js',
        externalGlobals: {},
      },
    }),
  ],
  build: {
    minify: 'esbuild',
    target: 'es2022',
  },
});