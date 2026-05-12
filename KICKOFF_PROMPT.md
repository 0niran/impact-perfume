# Kickoff prompt — paste this into your first message to Claude Code

Save this if you want a copy-paste version. The full project rules and task list are in `BUILD_BRIEF.md` at the project root, plus references in `docs/wireframe-spec.md` and `docs/component-checklist.md`.

---

```
You're picking up an in-progress build of the Impact Perfumes storefront — a Next.js 14 + Medusa + Sanity headless commerce build benchmarked against Jo Malone London, Le Labo, and Chanel.

Before doing anything, read these three files in full:

  1. BUILD_BRIEF.md       — project rules, stack, tasks, definition of done
  2. docs/wireframe-spec.md  — page-by-page layout, dimensions, design tokens
  3. docs/component-checklist.md — every component, schema, and route to build

Working rules:

  - Ask clarifying questions before assuming. Do not invent product names, prices, copy, or imagery.
  - List the steps you'll take before implementing each task. Outline first, then code.
  - Keep comments concise. No section dividers. No references to AI, agents, or any model in code or comments.
  - TypeScript strict; no `any` without justification.
  - React Server Components by default. "use client" only when state, effects, or browser APIs require it.
  - Tailwind classes only — use the design tokens in `tailwind.config.ts`, never arbitrary hex values.
  - Forms: React Hook Form + Zod. Schemas in `src/lib/schemas/`.
  - Accessibility AA minimum. Visible focus, alt text, keyboard navigation.
  - Run `npm run typecheck && npm run lint && npm run build` after each task and fix everything before moving on.
  - Branch + PR workflow. Never push to `main` directly. Commit messages: short imperative lowercase.

Current state: scaffold is in place — Next.js 14 with App Router, TypeScript, Tailwind tokens, fonts (Cormorant Garamond + Manrope), Sanity client, Medusa client, Zustand cart store, format helpers, Netlify config. The only route built is a placeholder home page.

Begin with Task 16 (Stand up Medusa backend) from BUILD_BRIEF.md §7. Read its acceptance criteria, list your steps, ask any clarifying questions, then proceed. After each task, mark it complete and move to the next in order.

If at any point you need information from me — product copy, photography, API keys, the old WP URL list, brand photography rights — stop and ask. Do not invent or use placeholder content for things that should come from the owner.
```

---

## Alternative — minimal prompt

If you just want a one-liner pointing to the brief:

```
Read BUILD_BRIEF.md, docs/wireframe-spec.md, and docs/component-checklist.md in full. Then begin Task 16 from the brief. Follow the working rules in section 3 strictly.
```

## Auto-load option

Rename `BUILD_BRIEF.md` to `CLAUDE.md` and Claude Code will auto-load it on every session — no need to paste anything. This is the cleanest workflow if you'll be running multiple sessions.

```bash
mv BUILD_BRIEF.md CLAUDE.md
```

(Note: the brief still references files by their relative paths, so the rename is safe.)
