export const boardActionTypes = ['add_concept', 'add_formula', 'clear_board', 'connect', 'focus']
export const conceptTones = ['amber', 'ink', 'sage', 'terracotta']
const boardCapacity = 6

export function createBoardState(actions = []) {
  const state = {
    concepts: [],
    connections: [],
    focusedId: null,
    formulas: [],
    page: 1,
  }

  for (const action of actions) applyBoardAction(state, action)

  return state
}

export function validateBoardActions(actions) {
  if (!Array.isArray(actions) || actions.length > 4) return 'Board updates must contain up to four actions.'

  const ids = new Set()
  for (const action of actions) {
    if (!isRecord(action) || !boardActionTypes.includes(action.type)) return 'Unsupported board action.'

    if (action.type === 'add_concept') {
      if (!isText(action.id) || !isText(action.label) || !conceptTones.includes(action.tone) || ids.has(action.id)) return 'Invalid concept action.'
      ids.add(action.id)
    }

    if (action.type === 'add_formula' && (!isText(action.id) || !isText(action.label) || !isText(action.notation) || ids.has(action.id))) return 'Invalid formula action.'
    if (action.type === 'add_formula') ids.add(action.id)
    if (action.type === 'connect' && (!isText(action.from) || !isText(action.to) || !isText(action.label) || action.from === action.to)) return 'Invalid connection action.'
    if (action.type === 'focus' && !isText(action.target)) return 'Invalid focus action.'
    if (action.type === 'clear_board' && action.title !== undefined && !isText(action.title)) return 'Invalid clear action.'
  }

  return null
}

function applyBoardAction(state, action) {
  if (action.type === 'clear_board') {
    state.concepts = []
    state.connections = []
    state.focusedId = null
    state.formulas = []
    state.page += 1
    return
  }

  if (action.type === 'add_concept' && !state.concepts.some((item) => item.id === action.id)) {
    if (state.concepts.length >= boardCapacity) {
      state.concepts = []
      state.connections = []
      state.focusedId = null
      state.formulas = []
      state.page += 1
    }
    state.concepts.push({ id: action.id, label: action.label, tone: action.tone })
    return
  }

  if (action.type === 'add_formula' && !state.formulas.some((item) => item.id === action.id)) {
    state.formulas.push({ id: action.id, label: action.label, notation: action.notation })
    return
  }

  if (action.type === 'connect' && state.concepts.some((item) => item.id === action.from) && state.concepts.some((item) => item.id === action.to) && !state.connections.some((connection) => connection.from === action.from && connection.to === action.to)) {
    state.connections.push({ from: action.from, label: action.label, to: action.to })
    return
  }

  if (action.type === 'focus' && state.concepts.some((item) => item.id === action.target)) state.focusedId = action.target
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0
}
