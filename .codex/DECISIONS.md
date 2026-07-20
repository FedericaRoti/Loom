# Decisions

## Accepted

### 2026-07-14 - Stable mock before real API

- Decision: build and preserve a deterministic mock mode before wiring real OpenAI APIs.
- Motivation: the hackathon demo needs a reliable fallback for recording and presentation.
- Alternatives discarded: make the real API path the first working path.
- Impact: all real API integration must sit on top of a working mock skeleton and must not break it.
- Status: accepted.

### 2026-07-14 - Controlled artifacts instead of free-form executable code

- Decision: artifacts are selected/configured from known React components instead of executing free-form generated code.
- Motivation: generated artifacts must be reliable during a live demo.
- Alternatives discarded: allow the model to emit arbitrary UI code and execute it directly.
- Impact: model output should become structured artifact configuration, not raw executable code.
- Status: accepted.

### 2026-07-14 - Voice-first interface with supporting transcript

- Decision: Loom is voice-first, with a visible transcript as support.
- Motivation: Loom is for learners who want to talk and listen; transcript supports recall and protects demo clarity if audio is imperfect.
- Alternatives discarded: text-first chat with optional voice.
- Impact: UI and interaction pacing should prioritize listening/speaking states, with transcript as secondary context.
- Status: accepted.

### 2026-07-14 - Projectile simulator is didactic, not realistic

- Decision: the projectile simulator optimizes for comprehension and manipulation, not full physics realism.
- Motivation: the goal is to make angle and velocity visually understandable in a demo-safe way.
- Alternatives discarded: implement a full physics engine or highly realistic simulation.
- Impact: controls, labels, and motion should stay readable even if simplified.
- Status: accepted.

### 2026-07-14 - Connection map is narrative-philosophical

- Decision: the discursive artifact for free will vs. determinism is narrative-philosophical.
- Motivation: the demo should connect ideas to character/story rather than produce an academic diagram.
- Alternatives discarded: academic taxonomy or abstract concept chart.
- Impact: Phase 3 should frame concepts through narrative pressure, character choice, and circumstance.
- Status: accepted.
