# VinTech AI Doc Converter

VinTech AI Doc Converter is a React + Vite + TypeScript web application that extracts, structures, previews, and exports documents with accurate formatting. It converts PDFs into Word, PDF, and Excel while preserving headings, spacing, lists, and tables.

## Ownership

© 2026 VinTech Solutions. All rights reserved.

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Radix/shadcn-ui
- Supabase Edge Functions (OCR/formatting extraction)
- Vitest

## Getting Started

Prerequisites: Node.js and npm.

```sh
# Install dependencies
npm i

# Run the development server
npm run dev

# Lint
npm run lint

# Tests
npm run test
```

## Features

- Upload PDFs and process text via Supabase functions
- Structured preview modal with scrollable content
- Export to:
  - Word (docx) with headings, paragraphs, lists, and tables
  - PDF with layout-aware text and dynamic-height tables
  - Excel with clean sheets per detected table

## Scripts

- Export sample using a root-level PDF:

```sh
npm run export:sample
```

Outputs are saved to the exports/ directory.
