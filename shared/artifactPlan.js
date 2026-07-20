export const artifactTypes = ['stay-on-board', 'projectile-simulator', 'connection-map', 'plot-board']
export const viewActions = ['stay-on-board', 'show-artifact', 'continue-artifact', 'return-to-board']
export const boardModes = ['keep', 'new-board']

const mapTones = ['warm', 'cool', 'dark', 'green', 'neutral']
const generationStepIds = ['understanding', 'choosing', 'generating']

export function createMockArtifactPlan({ artifactType, concept, viewAction }) {
  if (artifactType === 'stay-on-board') {
    return {
      artifactType,
      concept: concept || 'the thread of the conversation',
      generationSteps: [
        { detail: 'the idea taking shape', id: 'understanding', label: 'Understanding concept' },
        { detail: 'the existing board', id: 'choosing', label: 'Keeping the thread visible' },
        { detail: 'key ideas and connections', id: 'generating', label: 'Updating board' },
      ],
      rationale: 'The learner needs one more clear connection before a separate visual artifact would add value.',
      boardMode: 'keep',
      spokenChoice: 'I am keeping this on the board for now, so we can make the connection clear before adding anything more.',
      viewAction: viewAction ?? 'stay-on-board',
    }
  }

  if (artifactType === 'projectile-simulator') {
    return {
      artifactType,
      concept: concept || 'projectile motion',
      generationSteps: [
        { detail: 'projectile motion', id: 'understanding', label: 'Understanding concept' },
        { detail: 'interactive visual artifact', id: 'choosing', label: 'Choosing form' },
        { detail: 'angle and velocity controls', id: 'generating', label: 'Generating simulator' },
      ],
      parameters: {
        angle: 42,
        insight: 'A higher angle raises the peak. More speed increases both height and range.',
        velocity: 25,
      },
      rationale: 'The relationship becomes clearer when the learner can change the launch conditions.',
      boardMode: 'keep',
      spokenChoice: 'This has values you can change and an outcome you can watch, so I am building a simulator.',
      viewAction: viewAction ?? 'show-artifact',
    }
  }

  if (artifactType === 'plot-board') {
    return {
      artifactType,
      concept: concept || 'a changing relationship',
      generationSteps: [
        { detail: 'the changing relationship', id: 'understanding', label: 'Understanding concept' },
        { detail: 'a graph with clear axes', id: 'choosing', label: 'Choosing form' },
        { detail: 'a curve and one control', id: 'generating', label: 'Drawing relationship' },
      ],
      plot: {
        annotations: [{ label: 'increase', x: 7, y: 7 }],
        controls: [{ coefficient: 'slope', id: 'slope', label: 'Rate of change', max: 8, min: 1, seriesId: 'growth', step: 0.5, unit: '' }],
        series: [{ formula: { intercept: 0, kind: 'linear', slope: 4 }, id: 'growth', label: 'growth', tone: 'terracotta' }],
        title: 'A changing relationship',
        xAxis: { label: 'Input', max: 10, min: 0 },
        yAxis: { label: 'Output', max: 50, min: 0 },
      },
      rationale: 'A graph makes the changing relationship visible while keeping the values controlled.',
      boardMode: 'keep',
      spokenChoice: 'This relationship becomes clearer when we can see how one value changes with another, so I am putting it on a graph.',
      viewAction: viewAction ?? 'show-artifact',
    }
  }

  return {
    artifactType: 'connection-map',
    concept: concept || 'free will versus determinism',
    generationSteps: [
      { detail: 'free will versus determinism', id: 'understanding', label: 'Understanding concept' },
      { detail: 'narrative connection map', id: 'choosing', label: 'Choosing form' },
      { detail: 'choice, pressure, past, consequence', id: 'generating', label: 'Generating map' },
    ],
    map: {
      lens: 'The question is not only whether a character chooses, but what makes a choice feel possible.',
      links: [
        { from: 'free-will', label: 'felt choice', to: 'character' },
        { from: 'determinism', label: 'shaping causes', to: 'character' },
        { from: 'past', label: 'formed by memory', to: 'character' },
        { from: 'circumstance', label: 'pressed by the world', to: 'character' },
        { from: 'character', label: 'acts anyway', to: 'consequence' },
      ],
      nodes: [
        { id: 'free-will', label: 'Free will', tone: 'warm' },
        { id: 'determinism', label: 'Determinism', tone: 'cool' },
        { id: 'character', label: 'Character', tone: 'dark' },
        { id: 'past', label: 'Past', tone: 'neutral' },
        { id: 'circumstance', label: 'Circumstance', tone: 'neutral' },
        { id: 'consequence', label: 'Consequence', tone: 'green' },
      ],
      readingPath: [
        'Start with the character, not the abstraction.',
        'Ask what pressures make one choice feel natural.',
        'Then ask whether responsibility survives those pressures.',
      ],
      title: 'A character who chooses under pressure',
    },
    rationale: 'The learner needs to trace how ideas pressure one decision, rather than manipulate a numeric outcome.',
    boardMode: 'keep',
    spokenChoice: 'These are ideas that shape one another, so I am drawing their connections around a character.',
    viewAction: viewAction ?? 'show-artifact',
  }
}

export function validateArtifactPlan(plan) {
  if (!isRecord(plan) || !artifactTypes.includes(plan.artifactType)) return 'Unsupported artifact type.'
  if (!viewActions.includes(plan.viewAction)) return 'Unsupported view action.'
  if (!boardModes.includes(plan.boardMode)) return 'Unsupported board mode.'
  if (!isText(plan.concept) || !isText(plan.rationale) || !isText(plan.spokenChoice)) return 'Missing plan explanation.'
  if (!hasGenerationSteps(plan.generationSteps)) return 'Invalid generation steps.'

  if (plan.artifactType === 'stay-on-board') {
    return plan.viewAction === 'stay-on-board' || plan.viewAction === 'return-to-board'
      ? null
      : 'Board plans must stay on the board.'
  }

  if (plan.viewAction !== 'show-artifact' && plan.viewAction !== 'continue-artifact') return 'Visual plans must show or continue an artifact.'

  if (plan.artifactType === 'projectile-simulator') {
    if (!isRecord(plan.parameters)) return 'Missing simulator parameters.'
    if (!isNumberInRange(plan.parameters.angle, 10, 80) || !isNumberInRange(plan.parameters.velocity, 10, 50) || !isText(plan.parameters.insight)) return 'Invalid simulator parameters.'
    return null
  }

  if (plan.artifactType === 'plot-board') return validatePlot(plan.plot)

  if (!isRecord(plan.map) || !isText(plan.map.title) || !isText(plan.map.lens)) return 'Missing connection map.'
  if (!Array.isArray(plan.map.nodes) || plan.map.nodes.length < 3 || plan.map.nodes.length > 6) return 'Invalid map nodes.'
  if (!Array.isArray(plan.map.links) || plan.map.links.length < 2 || plan.map.links.length > 8) return 'Invalid map links.'
  if (!Array.isArray(plan.map.readingPath) || plan.map.readingPath.length < 2 || plan.map.readingPath.length > 3 || !plan.map.readingPath.every(isText)) return 'Invalid reading path.'

  const nodeIds = new Set()
  for (const node of plan.map.nodes) {
    if (!isRecord(node) || !isText(node.id) || !isText(node.label) || !mapTones.includes(node.tone) || nodeIds.has(node.id)) return 'Invalid map node.'
    nodeIds.add(node.id)
  }

  for (const link of plan.map.links) {
    if (!isRecord(link) || !isText(link.label) || !nodeIds.has(link.from) || !nodeIds.has(link.to) || link.from === link.to) return 'Invalid map link.'
  }

  return null
}

function validatePlot(plot) {
  if (!isRecord(plot) || !isText(plot.title) || !validateAxis(plot.xAxis) || !validateAxis(plot.yAxis)) return 'Invalid plot.'
  if (!Array.isArray(plot.series) || plot.series.length < 1 || plot.series.length > 2) return 'Invalid plot series.'
  if (!Array.isArray(plot.annotations) || plot.annotations.length > 3 || !plot.annotations.every((annotation) => isRecord(annotation) && isText(annotation.label) && isNumber(annotation.x) && isNumber(annotation.y))) return 'Invalid plot annotations.'
  if (!Array.isArray(plot.controls) || plot.controls.length < 1 || plot.controls.length > 2) return 'Invalid plot controls.'

  const seriesIds = new Set()
  for (const series of plot.series) {
    if (!isRecord(series) || !isText(series.id) || !isText(series.label) || !['ink', 'sage', 'terracotta', 'amber'].includes(series.tone) || seriesIds.has(series.id)) return 'Invalid plot series.'
    seriesIds.add(series.id)
    if (series.formula) {
      if (!validateFormula(series.formula)) return 'Invalid plot formula.'
    } else if (!Array.isArray(series.points) || series.points.length < 2 || series.points.length > 24 || !series.points.every((point) => Array.isArray(point) && point.length === 2 && point.every(isNumber))) {
      return 'Invalid plot points.'
    }
  }

  for (const control of plot.controls) {
    const target = plot.series.find((series) => series.id === control?.seriesId)
    if (!isRecord(control) || !isText(control.id) || !isText(control.label) || !isText(control.seriesId) || !['slope', 'intercept', 'a', 'b', 'c', 'base', 'verticalShift'].includes(control.coefficient) || !isNumber(control.min) || !isNumber(control.max) || !isNumber(control.step) || control.min >= control.max || control.step <= 0 || typeof control.unit !== 'string' || !target?.formula || !Object.hasOwn(target.formula, control.coefficient)) return 'Invalid plot control.'
  }

  return null
}

function validateAxis(axis) {
  return isRecord(axis) && isText(axis.label) && isNumber(axis.min) && isNumber(axis.max) && axis.min < axis.max
}

function validateFormula(formula) {
  if (!isRecord(formula)) return false
  if (formula.kind === 'linear') return isNumber(formula.slope) && isNumber(formula.intercept)
  if (formula.kind === 'quadratic') return isNumber(formula.a) && isNumber(formula.b) && isNumber(formula.c)
  if (formula.kind === 'exponential') return isNumber(formula.a) && isNumber(formula.base) && formula.base > 0 && isNumber(formula.verticalShift)
  return false
}

function hasGenerationSteps(steps) {
  return Array.isArray(steps)
    && steps.length === 3
    && steps.every((step, index) => isRecord(step) && step.id === generationStepIds[index] && isText(step.label) && isText(step.detail))
}

function isNumberInRange(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0
}
