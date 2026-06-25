# Project: userscript

## Overview
This is a monorepo workspace containing various browser userscripts (Tampermonkey) developed for different websites and tasks. Each folder represents an independent project, ranging from pure vanilla JS scripts to TypeScript/Vite compiled scripts.

## Structure
- `ACAS-bot/`              # Userscript for ACAS
- `StreamGrabber/`          # Userscript to grab streams
- `better-search/`          # Search enhancements userscript
- `chess-bot/`              # Chess helper userscript
- `codebase-uploader/`      # TS/Vite modularized tool to upload codebase context to AI chat inputs (customizable limits, ignore lists, binary files)
- `youtube-filter/`         # Filtering userscript for YouTube
- Other folders...          # Subdirectories for various other target sites and tools

## Conventions
- Each sub-project is independent and maintains its own configuration (e.g., package.json, vite.config.ts, tsconfig.json).
- Avoid modifying adjacent projects unless explicitly requested.
- Keep userscripts lightweight and minimize extra dependencies.

## Dependencies & Setup
- Individual folders use `bun` or `npm`/`vite` for development and bundling.
- No global repository setup or configuration is required.

## Critical Information
- Tampermonkey headers (metadata block at the top of scripts) must be kept valid.

## Insights
- Using Shadow DOM ensures complete CSS and DOM isolation of userscripts on target pages (ChatGPT, Claude, etc.).
- Saving/restoring scroll position and checkbox focus in dynamic tree redrawing prevents UI jumping and keyboard focus loss.

## Blunders
- [2026-06-25] Syntax error in codebase-uploader main.js -> Unescaped backticks in a JS template literal -> Escaped them as \`\`\`.
