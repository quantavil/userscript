# Better ODeX

**Author:** quantavil (https://github.com/quantavil)  
**License:** GPL-3.0-or-later  

A clean, docked eVGM workspace userscript for ODeX (`New eVGM Request` & `Search eVGM Request`) built with Vite+, Preact 11, and TypeScript.

## Features

- **Full-Height Docked Slide-Over Workspace**: Opens cleanly along the right edge (`Alt+V` keyboard shortcut) with an interactive **Compact (540px) / Expand (820px)** width toggle for expansive multi-container rosters.
- **Unified Maritime Brand & Launcher**: Cohesive ship's wheel FAB icon (`Icons.Fab`) across the floating launcher and workspace header; hover elevation with tactile rotation, animated wait state only during PDF export/fill, and steady idle state.
- **Dedicated Customer Directory**: Store each shipper/customer once (Name, IEC/CIN/PAN/Aadhaar/Passport, Authorized Official, 24×7 Contact, Logo, Seal/Signature, PDF Footer). Duplicate customer names and registration numbers are prevented automatically. Includes one clearly marked sample customer that you can edit or delete.
- **Dedicated Weighbridges & CHA Defaults**: Save weighbridge presets (with automatic 3 × 35-character ODeX address wrapping preview), optional CHA Authorized Person defaults, and full JSON Backup/Restore.
- **Clear Single vs. Multiple Container Workflows**:
  - **Single Container Mode**: Focused single-container entry with ISO 6346 container validation, live CSC Max weight guard, and Portrait A4 Annexure-1 PDF output.
  - **Multiple Containers Mode**: Interactive container roster with live batch totals (Total Tare, Cargo, VGM), per-row `Pending / Filled` tracking across ODeX reloads, `Duplicate`, `Apply Booking No. to All`, `Next Pending →`, and Landscape A4 Consolidated Multi-VGM PDF output.
- **Separate PDF Export Button**: Download clean, SOLAS-compliant Annexure-1 PDFs anytime without touching the ODeX form, alongside one-click **Fill ODeX + Attach PDF** with DWR readiness polling.
- **Automated Entity Normalization**: Continuously and reactively replaces `KHATEMA FIBRES LIMITED` with `VISHAL LOGISTICS SOLUTIONS` across DOM text nodes, inputs, and attributes on ODeX, handling tight boundary patterns (`LIMITEDMundra` -> `VISHAL LOGISTICS SOLUTIONS Mundra`).
- **Reactive SPA Page Detection**: Uses a MutationObserver to detect `#genVGMReqBtn` and `#vgmSerachTable` dynamically, ensuring the FAB launches seamlessly even after asynchronous table hydration.

## Directory Structure

```text
better-odex/
├── LICENSE
├── README.md
├── biome.json
├── knip.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tests/
│   ├── normalizer.test.ts
│   ├── storage.test.ts
│   ├── templates.test.ts
│   └── validators.test.ts
└── src/
    ├── main.tsx
    ├── types/
    │   └── index.ts
    ├── core/
    │   ├── constants.ts
    │   ├── normalizer.ts
    │   ├── odexAutofill.ts
    │   ├── storage.ts
    │   └── validators.ts
    ├── pdf/
    │   ├── pdfEngine.ts
    │   └── templates.ts
    ├── styles/
    │   ├── pageStyles.ts
    │   └── workspaceStyles.ts
    └── ui/
        ├── App.tsx
        ├── CustomersView.tsx
        ├── icons.tsx
        ├── VgmEntryView.tsx
        ├── WeighbridgesView.tsx
        └── WorkspacePanel.tsx
```

## Verification

```bash
bun test        # Run unit tests
bun run tsc     # Typecheck without emit
bun run lint    # Biome linter check
bun run knip    # Knip unused exports & deps check
bun run build   # Production userscript build
bun run check   # Full check (tsc + test + lint + knip + build)
```

Output userscript: `dist/better-odex.user.js`.
