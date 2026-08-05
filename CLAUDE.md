# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Project Overview

Hyori Atlas is a centralized web application for the "Hyori RP" Minecraft server: a public site/community hub plus a back-office platform for staff to manage players, roleplay progression, conflicts, and internal tasks. Full functional spec: `docs/SPECIFICATIONS.md`. HTML wireframes for the three main surfaces (Public Site, Espace Joueur, Staff Dashboard) live in `docs/designs/*.dc.html` — use them as structural blueprints only (see UI guidelines below).

Target stack per the spec (most not yet implemented — see Project State):

- Framework: Next.js (App Router) + TypeScript
- UI: shadcn/ui (`base-mira` style, Phosphor icons)
- Database: PostgreSQL via Prisma (+ Prisma Studio)
- Infra: Docker Compose (Next.js, PostgreSQL, Prisma Studio)
- Auth: Discord OAuth2 (NextAuth/Auth.js, env vars are present)

## NPM Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint
- `npm run format` — Prettier
- `npx tsc --noEmit` — type-check only

After every iteration, run both `npx tsc --noEmit` and `npm run build`, and fix all reported issues before considering the iteration done.

## Architecture & Conventions

### Language convention

- UI (French): every user-visible string — nav labels, buttons, error messages, status names — must be in French, matching the terminology used in `docs/SPECIFICATIONS.md` (e.g. "Espace Joueur", "Liste d'attente", "Entretien Whitelist").
- Codebase (English): all variables, functions, types, file names, and identifiers must be in English, regardless of the French domain terms they represent.

### Comments policy

Zero comments, in any file type (`//`, `/* */`, `<!-- -->`, `{/* */}`). Code must be self-documenting via descriptive English naming. Do not add comments even to explain non-obvious logic — prefer clearer naming/structure instead.

### UI/component rules

- Wireframes in `docs/designs/*.dc.html` define structure/layout only — do not port their inline styles or raw HTML elements.
- Rebuild every wireframe view using `shadcn/ui` components + Tailwind utility classes; never hand-roll a primitive (button, modal, tabs, table, calendar, etc.) that shadcn/ui already provides.
- Use the existing theme tokens in `app/globals.css` (colors, custom fonts) rather than hardcoding values.
- Prefer `flex`/`grid` layout utilities over manual margins to organize layouts and separate.
- Build shared base layout components (e.g. dashboard shell with sidebar) once and reuse across pages so Espace Joueur and Staff Dashboard stay visually consistent — the spec calls for both to share the same sidebar layout.
- Add new shadcn/ui primitives via the shadcn CLI so `components.json` aliases (`@/components`, `@/components/ui`, `@/lib`, `@/hooks`) stay respected, rather than hand-writing them.

### Styling/theme source of truth

`app/globals.css` defines all design tokens (`--background`, `--primary`, `--sidebar-*`, `--radius-*`, etc.) via Tailwind v4 `@theme inline`, imported from `shadcn/tailwind.css`. The palette is dark-first (near-black background, warm gold primary/accent). Do not introduce a separate Tailwind config file — theme customization happens in this CSS file.

### Iterative development

Work in logical, self-contained iterations; keep foundational pieces (layout shell, auth, DB schema) stable before building features on top of them. Each iteration should end with a passing `npx tsc --noEmit` and `npm run build`.

- Iteration 0 (Current state): app just scaffolded with Tailwind + shadcn/ui. `app/page.tsx` is empty; only the root layout (custom fonts + theme) exists.
- Iteration 1: TODO.
