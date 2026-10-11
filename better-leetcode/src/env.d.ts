/// <reference types="vite/client" />
/// <reference types="vite-plugin-monkey/client" />

declare module '@joplin/turndown-plugin-gfm' {
  import type TurndownService from 'turndown';
  export const tables: TurndownService.Plugin;
}
