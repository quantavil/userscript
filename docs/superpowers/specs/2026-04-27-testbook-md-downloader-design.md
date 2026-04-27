# Testbook Auto-Extractor Userscript

## Overview
A Tampermonkey/Violentmonkey userscript designed to automate the extraction of full question papers (including solutions and analysis) from Testbook.com into a clean, Obsidian-compatible Markdown file.

## Architecture

The project will be built as a structured TypeScript application bundled into a single `.user.js` script.

### Core Components
1. **User Interface (UI):** A floating control panel injected into the page to start the extraction process and display a progress bar (e.g., "Extracting Section 2, Question 15/40...").
2. **Navigator (State Machine):**
    - Iterates through all available Section tabs.
    - Within each section, iterates through all Question numbers in the pagination bar.
    - Programmatically clicks the next element and waits for a DOM change (or a set timeout) to ensure the content has fully rendered.
3. **DOM Extractor & Parser:**
    - Targets specific Testbook DOM elements (e.g., `.que-ans-box`, `.aei-comprehension`, `.qns-view-box`, `.option`, `.solution-desc`).
    - Converts HTML to GitHub Flavored Markdown (GFM).
    - **Tables:** Parses `<table>`, `<tr>`, `<th>`, `<td>` into markdown pipe tables.
    - **Images:** Converts relative URLs (`/assets/...`) to absolute URLs (`https://testbook.com/assets/...`). Preserves `data:image/base64` inline images to ensure offline rendering in Obsidian.
    - **Math:** Preserves MathJax/LaTeX delimiters (like `$...$` or `\(...\)`) for proper rendering in markdown editors.
4. **Export Module:** Concatenates the extracted markdown for all questions into a single string, creates a `Blob`, and triggers a browser file download (`Testbook_Paper.md`).

## Data Flow
1. User navigates to the Testbook Solutions/Analysis page.
2. User clicks "Extract to Markdown" on the injected UI panel.
3. Script initializes the `Navigator` and starts crawling.
4. For each question:
    - Extract Comprehension (if any).
    - Extract Question text/images/tables.
    - Extract Options (A, B, C, D) and mark the correct option.
    - Extract Solution/Explanation.
    - Append formatted Markdown to the global document.
5. `Navigator` clicks the next question or section tab.
6. Once all sections are complete, the `Export Module` prompts the user to download the final `.md` file.

## Error Handling & Constraints
- **Race Conditions:** A small, configurable delay (e.g., 300-500ms) will be inserted between clicks to allow Angular to update the DOM and prevent skipping questions.
- **Missing Elements:** The parser will gracefully handle missing comprehensions, missing solutions, or malformed options without crashing the crawler.
