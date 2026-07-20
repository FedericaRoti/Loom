import { createServer } from 'node:http'
import { conceptTones, validateBoardActions } from '../shared/boardActions.js'
import { validateArtifactPlan } from '../shared/artifactPlan.js'

const port = Number(process.env.LOOM_API_PORT ?? 8787)
const openaiApiKey = process.env.OPENAI_API_KEY
const openaiBaseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'

const jsonHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Origin': process.env.LOOM_ALLOWED_ORIGIN ?? 'http://127.0.0.1:5173',
  'Content-Type': 'application/json',
}

const generationStepsSchema = {
  type: 'array',
  minItems: 3,
  maxItems: 3,
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['detail', 'id', 'label'],
    properties: {
      detail: { type: 'string' },
      id: { type: 'string', enum: ['understanding', 'choosing', 'generating'] },
      label: { type: 'string' },
    },
  },
}

const boardActionSchema = {
  type: 'array',
  maxItems: 4,
  items: {
    anyOf: [
      { type: 'object', additionalProperties: false, required: ['id', 'label', 'tone', 'type'], properties: { id: { type: 'string' }, label: { type: 'string' }, tone: { type: 'string', enum: conceptTones }, type: { type: 'string', enum: ['add_concept'] } } },
      { type: 'object', additionalProperties: false, required: ['id', 'label', 'notation', 'type'], properties: { id: { type: 'string' }, label: { type: 'string' }, notation: { type: 'string' }, type: { type: 'string', enum: ['add_formula'] } } },
      { type: 'object', additionalProperties: false, required: ['from', 'label', 'to', 'type'], properties: { from: { type: 'string' }, label: { type: 'string' }, to: { type: 'string' }, type: { type: 'string', enum: ['connect'] } } },
      { type: 'object', additionalProperties: false, required: ['target', 'type'], properties: { target: { type: 'string' }, type: { type: 'string', enum: ['focus'] } } },
      { type: 'object', additionalProperties: false, required: ['title', 'type'], properties: { title: { type: 'string' }, type: { type: 'string', enum: ['clear_board'] } } },
    ],
  },
}

const projectilePlanSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['artifactType', 'boardMode', 'concept', 'generationSteps', 'parameters', 'rationale', 'spokenChoice', 'viewAction'],
  properties: {
    artifactType: { type: 'string', enum: ['projectile-simulator'] },
    boardMode: { type: 'string', enum: ['keep'] },
    concept: { type: 'string' },
    generationSteps: generationStepsSchema,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['angle', 'insight', 'velocity'],
      properties: {
        angle: { type: 'number', minimum: 10, maximum: 80 },
        insight: { type: 'string' },
        velocity: { type: 'number', minimum: 10, maximum: 50 },
      },
    },
    rationale: { type: 'string' },
    spokenChoice: { type: 'string' },
    viewAction: { type: 'string', enum: ['show-artifact', 'continue-artifact'] },
  },
}

const stayOnBoardPlanSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['artifactType', 'boardMode', 'concept', 'generationSteps', 'rationale', 'spokenChoice', 'viewAction'],
  properties: {
    artifactType: { type: 'string', enum: ['stay-on-board'] },
    boardMode: { type: 'string', enum: ['keep', 'new-board'] },
    concept: { type: 'string' },
    generationSteps: generationStepsSchema,
    rationale: { type: 'string' },
    spokenChoice: { type: 'string' },
    viewAction: { type: 'string', enum: ['stay-on-board', 'return-to-board'] },
  },
}

const connectionMapPlanSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['artifactType', 'boardMode', 'concept', 'generationSteps', 'map', 'rationale', 'spokenChoice', 'viewAction'],
  properties: {
    artifactType: { type: 'string', enum: ['connection-map'] },
    boardMode: { type: 'string', enum: ['keep'] },
    concept: { type: 'string' },
    generationSteps: generationStepsSchema,
    map: {
      type: 'object',
      additionalProperties: false,
      required: ['lens', 'links', 'nodes', 'readingPath', 'title'],
      properties: {
        lens: { type: 'string' },
        links: {
          type: 'array', minItems: 2, maxItems: 8,
          items: { type: 'object', additionalProperties: false, required: ['from', 'label', 'to'], properties: { from: { type: 'string' }, label: { type: 'string' }, to: { type: 'string' } } },
        },
        nodes: {
          type: 'array', minItems: 3, maxItems: 6,
          items: { type: 'object', additionalProperties: false, required: ['id', 'label', 'tone'], properties: { id: { type: 'string' }, label: { type: 'string' }, tone: { type: 'string', enum: ['warm', 'cool', 'dark', 'green', 'neutral'] } } },
        },
        readingPath: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'string' } },
        title: { type: 'string' },
      },
    },
    rationale: { type: 'string' },
    spokenChoice: { type: 'string' },
    viewAction: { type: 'string', enum: ['show-artifact', 'continue-artifact'] },
  },
}

const plotFormulaSchema = {
  anyOf: [
    { type: 'object', additionalProperties: false, required: ['intercept', 'kind', 'slope'], properties: { intercept: { type: 'number' }, kind: { type: 'string', enum: ['linear'] }, slope: { type: 'number' } } },
    { type: 'object', additionalProperties: false, required: ['a', 'b', 'c', 'kind'], properties: { a: { type: 'number' }, b: { type: 'number' }, c: { type: 'number' }, kind: { type: 'string', enum: ['quadratic'] } } },
    { type: 'object', additionalProperties: false, required: ['a', 'base', 'kind', 'verticalShift'], properties: { a: { type: 'number' }, base: { type: 'number', exclusiveMinimum: 0 }, kind: { type: 'string', enum: ['exponential'] }, verticalShift: { type: 'number' } } },
  ],
}

const plotSeriesSchema = {
  anyOf: [
    { type: 'object', additionalProperties: false, required: ['formula', 'id', 'label', 'tone'], properties: { formula: plotFormulaSchema, id: { type: 'string' }, label: { type: 'string' }, tone: { type: 'string', enum: ['ink', 'sage', 'terracotta', 'amber'] } } },
    { type: 'object', additionalProperties: false, required: ['id', 'label', 'points', 'tone'], properties: { id: { type: 'string' }, label: { type: 'string' }, points: { type: 'array', minItems: 2, maxItems: 24, items: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number' } } }, tone: { type: 'string', enum: ['ink', 'sage', 'terracotta', 'amber'] } } },
  ],
}

const plotPlanSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['artifactType', 'boardMode', 'concept', 'generationSteps', 'plot', 'rationale', 'spokenChoice', 'viewAction'],
  properties: {
    artifactType: { type: 'string', enum: ['plot-board'] },
    boardMode: { type: 'string', enum: ['keep'] },
    concept: { type: 'string' },
    generationSteps: generationStepsSchema,
    plot: {
      type: 'object',
      additionalProperties: false,
      required: ['annotations', 'controls', 'series', 'title', 'xAxis', 'yAxis'],
      properties: {
        annotations: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['label', 'x', 'y'], properties: { label: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' } } } },
        controls: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['coefficient', 'id', 'label', 'max', 'min', 'seriesId', 'step', 'unit'], properties: { coefficient: { type: 'string', enum: ['slope', 'intercept', 'a', 'b', 'c', 'base', 'verticalShift'] }, id: { type: 'string' }, label: { type: 'string' }, max: { type: 'number' }, min: { type: 'number' }, seriesId: { type: 'string' }, step: { type: 'number', exclusiveMinimum: 0 }, unit: { type: 'string' } } } },
        series: { type: 'array', minItems: 1, maxItems: 2, items: plotSeriesSchema },
        title: { type: 'string' },
        xAxis: { type: 'object', additionalProperties: false, required: ['label', 'max', 'min'], properties: { label: { type: 'string' }, max: { type: 'number' }, min: { type: 'number' } } },
        yAxis: { type: 'object', additionalProperties: false, required: ['label', 'max', 'min'], properties: { label: { type: 'string' }, max: { type: 'number' }, min: { type: 'number' } } },
      },
    },
    rationale: { type: 'string' },
    spokenChoice: { type: 'string' },
    viewAction: { type: 'string', enum: ['show-artifact', 'continue-artifact'] },
  },
}

const artifactPlanSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['plan'],
  properties: {
    plan: { anyOf: [stayOnBoardPlanSchema, projectilePlanSchema, connectionMapPlanSchema, plotPlanSchema] },
  },
}

const conversationReplySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['boardActions', 'boardTitle', 'comprehensionChecks', 'resolvedCheckIds', 'text'],
  properties: {
    boardActions: boardActionSchema,
    boardTitle: { type: 'string' },
    comprehensionChecks: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'question'],
        properties: {
          id: { type: 'string' },
          question: { type: 'string' },
        },
      },
    },
    resolvedCheckIds: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string' },
    },
    text: { type: 'string' },
  },
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, jsonHeaders)
  response.end(JSON.stringify(payload))
}

function requireApiKey(response) {
  if (openaiApiKey) return true

  sendJson(response, 503, {
    error: 'OPENAI_API_KEY is not configured on the server.',
  })
  return false
}

async function readJson(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')
  return rawBody ? JSON.parse(rawBody) : {}
}

async function readFormData(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  const body = Buffer.concat(chunks)
  const webRequest = new Request('http://localhost/upload', {
    body,
    duplex: 'half',
    headers: {
      'content-type': request.headers['content-type'] ?? '',
    },
    method: 'POST',
  })

  return webRequest.formData()
}

async function forwardRealtimeClientSecret(request, response) {
  if (!requireApiKey(response)) return

  const body = await readJson(request)
  const model = body.model ?? 'gpt-realtime-2.1'

  const openaiResponse = await fetch(`${openaiBaseUrl}/realtime/client_secrets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model,
        audio: {
          output: {
            voice: body.voice ?? 'coral',
          },
        },
      },
    }),
  })

  const payload = await openaiResponse.json()
  sendJson(response, openaiResponse.status, payload)
}

async function forwardTranscription(request, response) {
  if (!requireApiKey(response)) return

  const incomingForm = await readFormData(request)
  const audio = incomingForm.get('audio') ?? incomingForm.get('file')
  const model = incomingForm.get('model') ?? 'gpt-4o-transcribe'

  if (!audio) {
    sendJson(response, 400, {
      error: 'Missing audio file.',
    })
    return
  }

  const openaiForm = new FormData()
  openaiForm.append('file', audio)
  openaiForm.append('model', model)

  const openaiResponse = await fetch(`${openaiBaseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: openaiForm,
  })

  const payload = await openaiResponse.json()
  sendJson(response, openaiResponse.status, payload)
}

async function forwardSpeech(request, response) {
  if (!requireApiKey(response)) return

  const body = await readJson(request)
  const openaiResponse = await fetch(`${openaiBaseUrl}/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: body.input,
      instructions: body.instructions,
      model: body.model ?? 'gpt-4o-mini-tts',
      voice: body.voice ?? 'coral',
    }),
  })

  if (!openaiResponse.ok) {
    const payload = await openaiResponse.json()
    sendJson(response, openaiResponse.status, payload)
    return
  }

  response.writeHead(200, {
    'Access-Control-Allow-Origin': jsonHeaders['Access-Control-Allow-Origin'],
    'Content-Type': openaiResponse.headers.get('content-type') ?? 'audio/mpeg',
  })
  response.end(Buffer.from(await openaiResponse.arrayBuffer()))
}

async function forwardConversationReply(request, response) {
  if (!requireApiKey(response)) return

  const body = await readJson(request)
  const learnerText = body.learnerText?.trim()

  if (!learnerText) {
    sendJson(response, 400, {
      error: 'Missing learner text.',
    })
    return
  }

  const transcript = Array.isArray(body.transcript)
    ? body.transcript
        .slice(-8)
        .map((entry) => `${entry.speaker}: ${entry.text}`)
        .join('\n')
    : ''
  const boardContext = Array.isArray(body.boardContext)
    ? body.boardContext.slice(-6).map((concept) => `${concept.id}: ${concept.label}`).join('\n')
    : ''
  const boardLinks = Array.isArray(body.boardLinks)
    ? body.boardLinks.slice(-6).map((link) => `${link.from} --${link.label}--> ${link.to}`).join('\n')
    : ''
  const pendingChecks = Array.isArray(body.pendingChecks)
    ? body.pendingChecks.slice(-3).map((check) => `${check.id}: ${check.question}`).join('\n')
    : ''
  const plannedArtifact = body.plannedArtifact && typeof body.plannedArtifact === 'object'
    ? `${body.plannedArtifact.viewAction ?? 'stay-on-board'} / ${body.plannedArtifact.artifactType ?? 'stay-on-board'} / board ${body.plannedArtifact.boardMode ?? 'keep'}: ${body.plannedArtifact.rationale ?? ''}`
    : 'None'

  const openaiResponse = await fetch(`${openaiBaseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: `Session: ${body.sessionTitle ?? 'Loom learning session'}\nArtifact type: ${body.artifactType ?? 'stay-on-board'}\nPlanned visual transition: ${plannedArtifact}\nCurrent board concepts:\n${boardContext || 'Empty board'}\nCurrent board links:\n${boardLinks || 'No links'}\nOpen comprehension checks:\n${pendingChecks || 'None'}\nRecent transcript:\n${transcript}\n\nLearner just asked: ${learnerText}`,
      instructions:
        'You are Loom, a voice-first learning tutor. Return boardTitle as a concise 3-to-6-word title for the ongoing topic; keep the title stable once the topic is established. Reply in one or two short spoken sentences using clear, standard educational English: precise terms with a plain explanation. Be concrete, didactic, and helpful. When Planned visual transition is show-artifact, conclude the same reply with a natural phrase such as "now let me show you" and why the visual will help. When it is return-to-board, conclude naturally that you are returning to the board to connect the next idea. When it is continue-artifact, invite the learner to notice or change the relevant control. This must be one continuous answer, never a separate announcement. If Planned visual transition says board new-board, its boardActions must only describe the learner’s new topic; do not repeat ideas, formulas, or links from the old topic. Use web search only when the learner asks for sources, documentation, a link, a place, a current version, an API, a framework, a recent fact, or other information that needs external verification. Ground those answers in the search results and never invent links. Never put URLs, domains, markdown links, citation syntax, or source titles in text: when sources are found, say briefly that they were added to the Sources section. Return IDs from Open comprehension checks in resolvedCheckIds only when the learner has clearly answered them; otherwise return an empty array. Create zero to three short new comprehension checks only when there is enough context to assess understanding. Create zero to four boardActions only for the visual idea the learner needs to retain now: concise concepts, connections between known concept IDs, or a short formula. Use add_concept before connecting to a new concept. Do not create a link that is already listed in Current board links. Do not write sentences as board labels, do not repeat existing concepts, and do not mention implementation details or APIs.',
      model: body.model ?? process.env.LOOM_CONVERSATION_MODEL ?? 'gpt-5.6-terra',
      reasoning: {
        effort: 'low',
      },
      text: {
        format: {
          type: 'json_schema',
          name: 'loom_conversation_reply',
          strict: true,
          schema: conversationReplySchema,
        },
      },
      tools: [{ type: 'web_search', search_context_size: 'medium' }],
    }),
  })

  const payload = await openaiResponse.json()

  if (!openaiResponse.ok) {
    const message = getProviderErrorMessage(payload, 'OpenAI could not generate a conversation reply.')
    console.error(`Conversation reply failed (${openaiResponse.status}): ${message}`)
    sendJson(response, openaiResponse.status, { error: message })
    return
  }

  try {
    const reply = JSON.parse(extractResponseText(payload))
    const boardError = validateBoardActions(reply.boardActions)
    if (boardError) throw new Error(boardError)
    const sources = extractSources(payload)
    reply.text = prepareSpokenText(reply.text, sources.length)
    sendJson(response, 200, {
      mode: 'model',
      sources,
      ...reply,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The model returned an invalid conversation reply.'
    console.error(`Conversation reply validation failed: ${message}`)
    sendJson(response, 502, {
      error: message,
    })
  }
}

function extractResponseText(payload) {
  const parts = Array.isArray(payload?.output)
    ? payload.output.flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    : []
  const text = parts
    .filter((part) => part?.type === 'output_text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')

  if (!text) throw new Error('The model returned no output text.')
  return text
}

function extractSources(payload) {
  const sources = []
  const addSource = (candidate) => {
    if (!candidate?.url || !candidate.url.startsWith('http') || sources.some((source) => source.url === candidate.url)) return
    sources.push({
      title: candidate.title?.trim() || new URL(candidate.url).hostname.replace(/^www\./, ''),
      url: candidate.url,
    })
  }

  for (const item of payload?.output ?? []) {
    for (const part of item?.content ?? []) {
      for (const annotation of part?.annotations ?? []) {
        if (annotation?.type === 'url_citation') addSource(annotation)
      }
    }
    for (const source of item?.action?.sources ?? []) addSource(source)
  }

  return sources.slice(0, 4)
}

function prepareSpokenText(text, sourceCount) {
  const withoutLinks = text
    .replace(/\[([^\]]+)]\(https?:\/\/[^)]+\)/gi, '$1')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\(\s*(?:www\.)?[a-z0-9-]+(?:\.[a-z]{2,})+(?:\/[^\s)]*)?\s*\)/gi, '')
    .replace(/[\*`]/g, '')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!sourceCount || /sources? section/i.test(withoutLinks)) return withoutLinks
  return `${withoutLinks} I added ${sourceCount === 1 ? 'the source' : 'the sources'} to the Sources section.`
}

function getProviderErrorMessage(payload, fallback) {
  if (typeof payload?.error === 'string') return payload.error
  if (typeof payload?.error?.message === 'string') return payload.error.message
  return fallback
}

async function forwardArtifactPlan(request, response) {
  if (!requireApiKey(response)) return

  const body = await readJson(request)
  const learnerText = body.learnerText?.trim() ?? ''

  const transcript = Array.isArray(body.transcript)
    ? body.transcript
        .slice(-8)
        .map((entry) => `${entry.speaker}: ${entry.text}`)
        .join('\n')
    : ''
  const currentView = body.currentView === 'artifact' ? 'artifact' : 'board'
  const activeArtifact = typeof body.activeArtifact === 'string' ? body.activeArtifact : 'none'

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const openaiResponse = await fetch(`${openaiBaseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: `Session: ${body.sessionTitle ?? 'Loom learning session'}\nCurrent view: ${currentView}\nActive artifact: ${activeArtifact}\nRecent transcript:\n${transcript}\n\nLearner's latest request: ${learnerText}`,
        instructions:
          'Create a controlled artifact plan for Loom. Choose exactly one supported artifact type yourself: stay-on-board, projectile-simulator, connection-map, or plot-board. Choose based on the nature of the concept, never on a subject label. Also choose the next view action and boardMode. Use boardMode keep when the learner is extending the same topic. Use boardMode new-board only when the learner has clearly changed to an unrelated topic; then artifactType must be stay-on-board and viewAction must be return-to-board. Use stay-on-board with viewAction stay-on-board when the learner needs another clear connection on the existing board. Use projectile-simulator with viewAction show-artifact only for projectile motion: a thrown or launched object whose angle, speed, height, range, or gravity shapes a trajectory. Use plot-board with viewAction show-artifact for a simple quantitative relationship that can be safely shown with Cartesian axes and one or two linear, quadratic, exponential, or fixed data series. Plot-board must include at least one meaningful slider control. Use connection-map when understanding depends on ideas that oppose, support, or imply one another. If Current view is artifact and the learner is exploring that same visual relationship, return that artifact type with viewAction continue-artifact. If Current view is artifact but the learner has moved to a conceptual explanation in the same topic, return stay-on-board with viewAction return-to-board and boardMode keep. Do not force an artifact when the board, a formula, or an explanation is clearer. In spokenChoice, state the choice in learner-facing language. The plan configures existing components; it must not propose arbitrary code, files, HTML, SVG, trajectories, coordinates, or unsupported widgets.',
        model: body.model ?? process.env.LOOM_ARTIFACT_PLANNER_MODEL ?? 'gpt-5.6-sol',
        reasoning: {
          effort: 'low',
        },
        text: {
          format: {
            type: 'json_schema',
            name: 'loom_artifact_plan',
            strict: true,
            schema: artifactPlanSchema,
          },
        },
      }),
    })

    const payload = await openaiResponse.json()

    if (!openaiResponse.ok) {
      sendJson(response, openaiResponse.status, payload)
      return
    }

    try {
      const plan = JSON.parse(extractResponseText(payload)).plan
      const validationError = validateArtifactPlan(plan)
      if (!validationError) {
        sendJson(response, 200, plan)
        return
      }
    } catch {
      // A second model request is allowed only for invalid planner output.
    }
  }

  sendJson(response, 502, {
    error: 'Artifact planner returned invalid render data after one retry.',
  })
}

async function handleRequest(request, response) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, jsonHeaders)
    response.end()
    return
  }

  const url = new URL(request.url, `http://${request.headers.host}`)

  try {
    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, {
        mode: openaiApiKey ? 'real-ready' : 'missing-key',
        ok: true,
      })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/realtime/client-secret') {
      await forwardRealtimeClientSecret(request, response)
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/audio/transcriptions') {
      await forwardTranscription(request, response)
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/audio/speech') {
      await forwardSpeech(request, response)
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/conversation/respond') {
      await forwardConversationReply(request, response)
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/artifact/plan') {
      await forwardArtifactPlan(request, response)
      return
    }

    sendJson(response, 404, {
      error: 'Not found.',
    })
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Unexpected server error.',
    })
  }
}

createServer(handleRequest).listen(port, '127.0.0.1', () => {
  console.log(`Loom OpenAI proxy listening on http://127.0.0.1:${port}`)
})
