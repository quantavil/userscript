/**
 * Entry point — routes to the correct side based on the current hostname.
 * esbuild bundles everything into a single IIFE; the userscript header
 * is prepended from meta.txt via the `banner` option.
 */

import { googleSide } from "./google";
import { braveSide } from "./brave";

const host = location.hostname;

if (host === "search.brave.com") {
  braveSide();
} else if (host === "www.google.com") {
  googleSide();
}