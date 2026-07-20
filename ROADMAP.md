# Roadmap

## Current State

The stable mock remains available without credentials. The real OpenAI voice path has been exercised locally with funded credentials: audio transcription, model conversation, artifact planning, text-to-speech, board updates, sources, checks, session changes, and mock fallback all have a working path.

The product build is feature-complete for the hackathon. The remaining work is final verification, documentation, optional hosting, and video production.

## Base Demo

Status: Complete

- [x] Voice-first shell with supporting transcript
- [x] Didactic projectile simulator
- [x] Narrative connection map
- [x] Stable mock with no API credentials
- [x] Model-selected controlled artifact plan with mock fallback

## Phase 1 - Controlled Motherboard

Status: Complete

- [x] Controlled `add_concept`, `connect`, `add_formula`, `focus`, and `clear_board` actions
- [x] Local layout chosen by the frontend, not by the model
- [x] Compact formula blocks, source area, page capacity, and board reset
- [x] Incremental semantic updates in mock and real conversation flows
- [x] Existing artifacts preserved as reliable renderers

## Phase 2 - Conversation And Visual Memory

Status: Complete

- [x] Per-turn conversation payload with board actions and comprehension checks
- [x] Board updates limited to didactically relevant ideas
- [x] Transcript previews with per-message full-text modal
- [x] Checks appear only with sufficient context and remain visible as resolved progress
- [x] Session creation, resume, and controlled topic-shift choice

## Phase 3 - Dynamic Medium Choice

Status: Complete

- [x] Model selects whether to remain on the board or use a supported artifact
- [x] Learner-facing explanation before visual transitions
- [x] Controlled plans for projectile simulation, connection map, and plot board
- [x] Schema validation, retry, and stable mock fallback

## Phase 4 - Real OpenAI Voice Flow

Status: Complete locally

- [x] Local `.env` setup with API key and funded account
- [x] STT -> dialogue -> artifact planning -> TTS flow
- [x] Configured routing: `gpt-5.6-terra` for dialogue and `gpt-5.6-sol` for planning
- [x] Cedar TTS voice with the selected Sports Coach style
- [x] API-failure disclosure and fallback to the stable mock
- [x] Sources returned on the board without reading URLs aloud

## Phase 5 - UI Polish

Status: Closed pending final browser check

- [x] Voice bar remains at the top
- [x] Sidebar limited to logo, Home, Notes, and sessions
- [x] Warm board, transcript, and checks panels with rounded corners
- [x] Transcript and checks remain separate right-side panels
- [x] Ambient glass-shell direction applied
- [x] Excluded toolbar, library, focus timer, and other reference-only decoration

## Phase 6 - Final Demo

Status: Next

- [ ] Run a final desktop real-mode smoke test: STT, response, TTS, board, source, check, session change
- [ ] Run the stable mock without API credentials and capture the fallback state
- [ ] Complete README placeholders, demo links, and choose an open-source license
- [ ] Deploy a live demo if required for the submission
- [ ] Record and publish the 3-minute demo video
- [ ] Verify the final layout at desktop and mobile viewport sizes

## Explicitly Out Of Scope

- [ ] Downloadable session summary PDF
- [ ] Cross-session categorization or persistent concept mapping
- [ ] Arbitrary executable UI or free-form generated canvases
- [ ] New artifact renderer families beyond the controlled set

## Project Constraint

- [ ] No Git repository is initialized in this directory, so branch and commit tracking are unavailable.
