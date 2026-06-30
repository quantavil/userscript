# Project: Userscript Workspace

## Overview
A collection of various Tampermonkey/Violentmonkey and frontend userscripts/bots developed in TypeScript and JavaScript. Each project is located in its own sub-folder with its own build tooling (typically Vite, Bun, or similar).

## Structure
userscript/
├── bpedia/               # Babepedia Advanced Filter Userscript
│   └── MEMORY.md         # Detailed memory for bpedia
├── GlideVideo/           # GlideVideo Userscript
├── StreamGrabber/        # StreamGrabber project
├── better-search/        # Better Search project
└── ... (other projects)  # Various other scripts and bots

## Conventions
- Every sub-project has its own directory and memory file where applicable.
- Follow the guidelines for each individual userscript/project.

## Dependencies & Setup
- Managed at the individual project level (e.g., package.json inside sub-folders).

## Critical Information
- Refer to individual project memory files (e.g., `bpedia/MEMORY.md`) for specific logic, scraping protection, and bugs.

## Insights
- Refer to individual project memory files.

## Blunders
- None recorded yet at the workspace root level.
