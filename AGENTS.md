# Loom Project Instructions

This project inherits Federica's global Codex instructions.

## Project Focus

Loom is a voice-first conversational learning prototype for the OpenAI Build Week hackathon, Education track.

The core demo proves that Loom adapts the learning medium to the subject:
- quantitative/spatial concepts use an interactive visual artifact;
- discursive/conceptual topics use a connection map.

## Stack

- Vite 8.1.4
- React 19.2.7
- Tailwind CSS 4.3.2
- lucide-react 0.468.0
- OpenAI STT/TTS planned for the real voice flow in Phase 4

## Commands

- `npm run dev` starts the local Vite dev server.
- `npm run build` builds the production bundle.
- `npm run preview` previews the production bundle.

Use npm for this project. `package-lock.json` is the lockfile; do not switch to pnpm/yarn unless Federica explicitly decides to migrate package manager.

## Paths

- App entry: `src/main.jsx`
- Main scene: `src/App.jsx`
- Global styles: `src/styles.css`
- Vite config: `vite.config.js`

## Project Rules

- Product UI copy, code, comments, and README content are in English.
- Conversation with Federica stays in Italian.
- Keep the stable mock runnable independently of real APIs, because it is the fallback for the demo recording.
- Build the projectile "mother scene" first and keep it working throughout the project.
- Do not build downloadable PDFs or cross-session categorization unless explicitly requested.
- README creation and maintenance is allowed for this hackathon project.
- Treat voice as the primary interaction model; visible transcript is support.
- Keep generated artifacts controlled: the model should configure/select known components, not emit arbitrary executable UI code.

## Context Budget

Use the global context budget rule: read only files relevant to the current task, and declare when a wider audit is needed.

## Project Context Files

- `.codex/KNOWLEDGE.md` for verified technical facts.
- `.codex/DECISIONS.md` for architectural decisions.
- `.codex/CONTEXT.md` for domain vocabulary and product concepts.
- `ROADMAP.md` for the active phased build plan.
