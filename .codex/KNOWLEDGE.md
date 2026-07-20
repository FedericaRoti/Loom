# Knowledge

## Verified Facts

- Project root: `/Users/federicaroti/Projects/Loom`.
- Git repository: not initialized as of 2026-07-14.
- Package manager: npm. The project has `package-lock.json` and no pnpm/yarn/bun lockfile.
- Lockfile version: `package-lock.json` lockfileVersion 3.
- Project stack from project files: Vite, React, Tailwind CSS.
- Installed dependency versions from `package-lock.json`:
  - `vite`: 8.1.4
  - `react`: 19.2.7
  - `react-dom`: 19.2.7
  - `tailwindcss`: 4.3.2
  - `@tailwindcss/vite`: 4.3.2
  - `@vitejs/plugin-react`: 5.2.0
  - `lucide-react`: 0.468.0
- Available npm scripts from `package.json`: `dev`, `build`, `preview`.
- `npm run build` was verified successfully on 2026-07-14 after dependency restore.
- Product language: English.
- Assistant conversation language with Federica: Italian.
- Stable mock mode is required as a demo fallback independent of real APIs.
- Phase 1 priority is the projectile motion mother scene.
- Real STT/TTS integration is planned after the stable skeleton.
- Current app entry points:
  - `src/main.jsx`
  - `src/App.jsx`
  - `src/styles.css`
  - `vite.config.js`
- Current Phase 1 mock includes a voice-first shell, supporting transcript, visible artifact-generation sequence, and projectile simulator controls.
- Do not use pnpm in this project unless the package manager is intentionally migrated: a `pnpm run build` attempt on 2026-07-14 tried to reinstall dependencies and moved npm-installed packages under `node_modules/.ignored`.
- Voice/API integration boundary added on 2026-07-14:
  - `src/services/loomApi.js` defaults to `VITE_LOOM_API_MODE=mock`.
  - Browser code must not contain `OPENAI_API_KEY`.
  - Real mode expects server endpoints under `VITE_LOOM_API_BASE_URL`.
  - `.env.example` documents `VITE_LOOM_REALTIME_MODEL`, `VITE_LOOM_TRANSCRIPTION_MODEL`, and `VITE_LOOM_TTS_MODEL`.
- Server-side OpenAI proxy added on 2026-07-14:
  - `server/openai-proxy.mjs`
  - `npm run dev:api`
  - `GET /api/health`
  - `POST /api/realtime/client-secret`
  - `POST /api/audio/transcriptions`
  - `POST /api/audio/speech`
  - Requires `OPENAI_API_KEY` server-side for real OpenAI calls.
- Browser STT UI boundary added on 2026-07-14:
  - `src/hooks/useVoiceRecorder.js`
  - `VoiceConsole` exposes record/mock voice input.
  - Mock mode appends deterministic transcript without network calls.
  - Real mode uses browser `MediaRecorder` and sends audio to `transcribeAudio`.
- Browser TTS UI boundary added on 2026-07-14:
  - `src/hooks/useSpeechPlayback.js`
  - `VoiceConsole` exposes Loom voice output for the latest Loom reply.
  - Mock mode uses browser speech synthesis when available and does not call the network.
  - Real mode sends text to `synthesizeSpeech`, which calls the server-side TTS proxy.

## Deprecato
